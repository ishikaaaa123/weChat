const { Server } = require("socket.io");
const User = require("../models/User");
const Message = require("../models/message");
const handleVideoCallEvent = require("./video-call-service");

// userId -> Set<socketId>, so a user stays online across multiple tabs/devices.
const onlineUsers = new Map();
const typingUsers = new Map();
const frontendOrigin = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

const toUserId = (value) => (value ? String(value) : null);

const socketIdsFor = (userId) => onlineUsers.get(toUserId(userId)) || new Set();

const emitToUser = (io, userId, event, payload) => {
  const socketIds = [...socketIdsFor(userId)];
  if (socketIds.length > 0) {
    io.to(socketIds).emit(event, payload);
  }
  return socketIds.length;
};

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: frontendOrigin,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    },
    pingTimeout: 60000,
  });

  io.emitToUser = (userId, event, payload) => emitToUser(io, userId, event, payload);
  io.socketUserMap = onlineUsers;

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    let userId = null;

    socket.on("user_connected", async (connectingUserId, callback) => {
      const nextUserId = toUserId(connectingUserId);
      if (!nextUserId) return callback?.({ ok: false, error: "Missing user ID" });

      try {
        socket.userId = nextUserId;
        if (userId && userId !== nextUserId) {
          const previousSockets = onlineUsers.get(userId);
          previousSockets?.delete(socket.id);
          if (previousSockets?.size === 0) onlineUsers.delete(userId);
        }

        const wasOffline = !onlineUsers.has(nextUserId);
        if (!onlineUsers.has(nextUserId)) onlineUsers.set(nextUserId, new Set());
        onlineUsers.get(nextUserId).add(socket.id);
        userId = nextUserId;
        socket.join(userId);

        if (wasOffline) {
          await User.findByIdAndUpdate(userId, {
            isOnline: true,
            lastSeen: new Date(),
          });
          io.emit("user_status", { userId, isOnline: true });
        }
        callback?.({ ok: true, userId });
      } catch (error) {
        console.error("Error connecting user socket:", error);
        callback?.({ ok: false, error: "Could not register socket" });
      }
    });

    socket.on("get_user_status", (requestedUserId, callback) => {
      const requestedId = toUserId(requestedUserId);
      const isOnline = Boolean(requestedId && onlineUsers.has(requestedId));
      callback?.({ userId: requestedId, isOnline, lastSeen: isOnline ? new Date() : null });
    });

    // This only delivers an already-saved message. Message persistence stays in chat.js.
    socket.on("send_message", (message) => {
      const receiverId = toUserId(message?.receiver?._id || message?.receiverId);
      if (receiverId) emitToUser(io, receiverId, "receive_message", message);
    });

    socket.on("message_read", async ({ messageIds } = {}) => {
      if (!userId || !Array.isArray(messageIds) || messageIds.length === 0) return;

      try {
        const messages = await Message.find({
          _id: { $in: messageIds },
          receiver: userId,
          messageStatus: { $in: ["send", "delivered"] },
        }).select("_id sender");

        if (messages.length === 0) return;

        await Message.updateMany(
          { _id: { $in: messages.map((message) => message._id) } },
          { $set: { messageStatus: "read" } },
        );

        for (const message of messages) {
          emitToUser(io, message.sender, "message_status_update", {
            messageId: message._id,
            messageStatus: "read",
          });
        }
      } catch (error) {
        console.error("Error updating message read status:", error);
      }
    });

    socket.on("typing_start", ({ conversationId, receiverId } = {}) => {
      const targetUserId = toUserId(receiverId);
      if (!userId || !conversationId || !targetUserId) return;

      if (!typingUsers.has(userId)) typingUsers.set(userId, {});
      const userTyping = typingUsers.get(userId);
      userTyping[conversationId] = true;
      clearTimeout(userTyping[`${conversationId}_timeout`]);

      socket.to(targetUserId).emit("user_typing", { userId, conversationId, isTyping: true });
      userTyping[`${conversationId}_timeout`] = setTimeout(() => {
        userTyping[conversationId] = false;
        socket.to(targetUserId).emit("user_typing", { userId, conversationId, isTyping: false });
      }, 3000);
    });

    socket.on("typing_stop", ({ conversationId, receiverId } = {}) => {
      const targetUserId = toUserId(receiverId);
      if (!userId || !conversationId || !targetUserId) return;

      const userTyping = typingUsers.get(userId);
      if (userTyping) {
        userTyping[conversationId] = false;
        clearTimeout(userTyping[`${conversationId}_timeout`]);
        delete userTyping[`${conversationId}_timeout`];
      }

      socket.to(targetUserId).emit("user_typing", { userId, conversationId, isTyping: false });
    });

    socket.on("add_reaction", async ({ messageId, emoji, reactionUserId } = {}) => {
      const reactingUserId = toUserId(reactionUserId || userId);
      if (!messageId || !emoji || !reactingUserId) return;

      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        const existingIndex = message.reactions.findIndex(
          (reaction) => reaction.user.toString() === reactingUserId,
        );

        if (existingIndex > -1) {
          if (message.reactions[existingIndex].emoji === emoji) {
            message.reactions.splice(existingIndex, 1);
          } else {
            message.reactions[existingIndex].emoji = emoji;
          }
        } else {
          message.reactions.push({ user: reactingUserId, emoji });
        }

        await message.save();
        const populatedMessage = await Message.findById(message._id)
          .populate("sender", "username profilePicture")
          .populate("receiver", "username profilePicture")
          .populate("reactions.user", "username");

        const reactionUpdated = { messageId, reactions: populatedMessage.reactions };
        emitToUser(io, populatedMessage.sender._id, "reaction_update", reactionUpdated);
        emitToUser(io, populatedMessage.receiver._id, "reaction_update", reactionUpdated);
      } catch (error) {
        console.error("Error handling reaction:", error);
      }
    });

    //handle video call events
    handleVideoCallEvent(socket,io,onlineUsers);

    socket.on("disconnect", async () => {
      if (!userId) return;

      const sockets = onlineUsers.get(userId);
      sockets?.delete(socket.id);
      if (sockets?.size > 0) return;

      try {
        onlineUsers.delete(userId);
        const userTyping = typingUsers.get(userId);
        if (userTyping) {
          Object.keys(userTyping).forEach((key) => {
            if (key.endsWith("_timeout")) clearTimeout(userTyping[key]);
          });
          typingUsers.delete(userId);
        }

        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
        io.emit("user_status", { userId, isOnline: false, lastSeen: new Date() });
        console.log(`User ${userId} disconnected`);
      } catch (error) {
        console.error("Error handling disconnection:", error);
      }
    });
  });

  return io;
};

module.exports = initializeSocket;

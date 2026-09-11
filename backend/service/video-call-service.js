const toUserId = (value) => (value ? String(value) : null);
const emitToUser = (io, onlineUsers, userId, event, payload) => {
  const roomId = toUserId(userId);
  // Every registered client joins a room named after its user ID. Using that
  // room avoids false "offline" results when a user has multiple tabs.
  const socketIds = io.sockets.adapter.rooms.get(roomId);
  if (socketIds?.size) io.to(roomId).emit(event, payload);
  return Boolean(socketIds?.size);
};

const handleVideoCallEvent = (socket, io, onlineUsers) => {
  socket.on("initiate_call", ({ receiverId, callType = "video", callerInfo } = {}, callback) => {
    const callerId = socket.userId;
    const targetId = toUserId(receiverId);
    if (!callerId) return callback?.({ ok: false, reason: "Your call socket is not registered yet" });
    if (!targetId || callerId === targetId) return callback?.({ ok: false, reason: "Choose another user to call" });
    const callId = `${callerId}-${targetId}-${Date.now()}`;
    const call = { callId, callerId, receiverId: targetId, callType, callerInfo };
    if (!emitToUser(io, onlineUsers, targetId, "incoming_call", call)) {
      callback?.({ ok: false, reason: "Receiver is not online" });
      return socket.emit("call_failed", { callId, reason: "Receiver is not online" });
    }
    callback?.({ ok: true, callId });
    socket.emit("call_started", call);
  });
  socket.on("accept_call", ({ callerId, callId } = {}) => {
    const receiverId = socket.userId;
    if (callerId && receiverId && callId) emitToUser(io, onlineUsers, callerId, "call_accepted", { callId, callerId, receiverId });
  });
  socket.on("reject_call", ({ callerId, callId } = {}) => { if (callerId && callId) emitToUser(io, onlineUsers, callerId, "call_rejected", { callId }); });
  socket.on("end_call", ({ receiverId, callId } = {}) => { if (receiverId && callId) emitToUser(io, onlineUsers, receiverId, "call_ended", { callId }); });
  socket.on("webrtc_offer", ({ offer, receiverId, callId } = {}) => { if (offer && receiverId && callId) emitToUser(io, onlineUsers, receiverId, "webrtc_offer", { offer, senderId: socket.userId, callId }); });
  socket.on("webrtc_answer", ({ answer, receiverId, callId } = {}) => { if (answer && receiverId && callId) emitToUser(io, onlineUsers, receiverId, "webrtc_answer", { answer, senderId: socket.userId, callId }); });
  socket.on("webrtc_ice_candidate", ({ candidate, receiverId, callId } = {}) => { if (candidate && receiverId && callId) emitToUser(io, onlineUsers, receiverId, "webrtc_ice_candidate", { candidate, senderId: socket.userId, callId }); });
};

module.exports = handleVideoCallEvent;

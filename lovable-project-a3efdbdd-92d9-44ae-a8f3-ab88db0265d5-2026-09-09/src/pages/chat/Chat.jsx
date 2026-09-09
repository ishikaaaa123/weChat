import { useCallback, useEffect, useState } from "react";

import ChatSidebar from "../../components/chat/ChatSidebar";
import ChatWindow from "../../components/chat/ChatWindow";
import IconRail from "../../components/chat/IconRail";
import ProfilePanel from "../../components/profile/ProfilePanel";
import UserProfilePanel from "../../components/profile/UserProfilePanel";
import useUserStore from "../../store/useUserStore";
import { connectSocket, disconnectSocket, getSocket } from "../../services/socket";
import { getConversations, getMessages, sendMessage } from "../../services/chat.services";
import { getAllUsers } from "../../services/user.services";

export default function Chat() {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const currentUserId = user?._id;

  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUserId, setTypingUserId] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("chats"); // chats | profile
  const [showContact, setShowContact] = useState(false);

  const otherUser =
    activeConversation?.participants?.find((participant) => participant._id !== currentUserId) || null;

  // Load the conversation list from the existing /chat/conversations route.
  const loadConversations = useCallback(async () => {
    try {
      const result = await getConversations();
      const list = result?.data || [];
      setConversations(list);
      setOnlineUsers((current) => [
        ...new Set([
          ...current,
          ...list
            .flatMap((conversation) => conversation.participants || [])
            .filter((participant) => participant.isOnline)
            .map((participant) => participant._id),
        ]),
      ]);
    } catch (loadError) {
      setError(loadError?.message || "Could not load chats");
    } finally {
      setLoadingChats(false);
    }
  }, []);

  // All users, used for searching by username and for the status strip.
  const loadUsers = useCallback(async () => {
    try {
      const result = await getAllUsers();
      setAllUsers(result?.data || []);
    } catch {
      // Search simply stays empty if this fails.
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadUsers();
  }, [loadConversations, loadUsers]);

  // Real-time: presence, incoming messages, typing and read receipts.
  useEffect(() => {
    if (!currentUserId) return undefined;
    const socket = connectSocket(currentUserId);

    const onReceive = (message) => {
      setMessages((current) =>
        message.conversation === activeConversation?._id ? [...current, message] : current,
      );
      loadConversations();
    };

    const onStatus = ({ userId, isOnline }) => {
      setOnlineUsers((current) =>
        isOnline
          ? [...new Set([...current, userId])]
          : current.filter((id) => id !== userId),
      );
    };

    const onTyping = ({ userId, isTyping }) => setTypingUserId(isTyping ? userId : null);

    const onStatusUpdate = ({ messageId, messageStatus }) => {
      setMessages((current) =>
        current.map((message) => (message._id === messageId ? { ...message, messageStatus } : message)),
      );
    };

    socket.on("receive_message", onReceive);
    socket.on("user_status", onStatus);
    socket.on("user_typing", onTyping);
    socket.on("message_status_update", onStatusUpdate);

    return () => {
      socket.off("receive_message", onReceive);
      socket.off("user_status", onStatus);
      socket.off("user_typing", onTyping);
      socket.off("message_status_update", onStatusUpdate);
    };
  }, [currentUserId, activeConversation, loadConversations]);

  useEffect(() => () => disconnectSocket(), []);

  const openConversation = async (conversation) => {
    setActiveConversation(conversation);
    setTypingUserId(null);
    setShowContact(false);
    setView("chats");
    setMessages([]);
    if (!conversation?._id) return; // brand new chat, nothing to fetch yet
    try {
      const result = await getMessages(conversation._id);
      setMessages(result?.data || []);
      loadConversations();
    } catch (loadError) {
      setError(loadError?.message || "Could not load messages");
    }
  };

  // Starting a chat with someone found through search.
  const openNewChat = (person) => {
    const existing = conversations.find((conversation) =>
      conversation.participants?.some((participant) => participant._id === person._id),
    );
    openConversation(existing || { _id: null, participants: [person, { _id: currentUserId }] });
  };

  const handleSend = async ({ content, file }) => {
    if (!otherUser?._id) return;
    setSending(true);
    try {
      const result = await sendMessage({ receiverId: otherUser._id, content, file });
      if (result?.data) setMessages((current) => [...current, result.data]);
      loadConversations();
    } catch (sendError) {
      setError(sendError?.message || "Message could not be sent");
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (isTyping) => {
    const socket = getSocket();
    if (!socket || !activeConversation?._id || !otherUser?._id) return;
    socket.emit(isTyping ? "typing_start" : "typing_stop", {
      conversationId: activeConversation._id,
      receiverId: otherUser._id,
    });
  };

  // After saving my profile, refresh the store and the shared user list so the
  // new username shows up everywhere.
  const handleProfileUpdated = (updated) => {
    setUser({ ...user, ...updated });
    loadUsers();
    loadConversations();
  };

  return (
    <main className="flex h-screen w-full overflow-hidden bg-background">
      <IconRail
        user={user}
        active={view}
        onChange={(key) => {
          if (key === "profile") setView("profile");
          else if (key === "status") setError("Status screen coming soon.");
          else setView("chats");
        }}
      />

      {view === "profile" ? (
        <ProfilePanel
          user={user}
          onUpdated={handleProfileUpdated}
          onClose={() => setView("chats")}
        />
      ) : (
        <>
          <div className={`${activeConversation ? "hidden md:flex" : "flex"} h-full w-full md:w-auto`}>
            <ChatSidebar
              conversations={conversations}
              allUsers={allUsers}
              currentUser={user}
              currentUserId={currentUserId}
              activeConversationId={activeConversation?._id}
              onlineUsers={onlineUsers}
              onSelect={openConversation}
              onSelectUser={openNewChat}
              onOpenStatus={() => setError("Status screen coming soon.")}
              onOpenProfile={() => setView("profile")}
              loading={loadingChats}
            />
          </div>

          <div className={`${activeConversation ? "flex" : "hidden md:flex"} h-full flex-1`}>
            <ChatWindow
              conversation={activeConversation}
              otherUser={otherUser}
              messages={messages}
              currentUserId={currentUserId}
              isOnline={onlineUsers.includes(otherUser?._id)}
              isTyping={Boolean(typingUserId) && typingUserId === otherUser?._id}
              sending={sending}
              onSend={handleSend}
              onTyping={handleTyping}
              onBack={() => setActiveConversation(null)}
              onOpenProfile={() => setShowContact(true)}
            />
          </div>

          {showContact && otherUser && (
            <div className="absolute inset-0 z-20 md:static md:z-auto md:inset-auto md:flex">
              <UserProfilePanel
                user={otherUser}
                isOnline={onlineUsers.includes(otherUser._id)}
                onClose={() => setShowContact(false)}
              />
            </div>
          )}
        </>
      )}

      {error && (
        <p className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-card px-4 py-2 text-xs text-foreground shadow-lg">
          {error}
        </p>
      )}
    </main>
  );
}

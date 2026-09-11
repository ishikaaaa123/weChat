import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import useUserStore from "../../../store/useUserStore";
import {
  deleteMessage,
  getConversations,
  getMessages,
  sendMessage,
} from "../../services/chat.services";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
} from "../../services/socket";
import {
  getAllUsers,
  logoutUser,
  updateUserProfile,
} from "../../services/user.services";
import {
  createStatus,
  deleteStatus,
  getStatuses,
  viewStatus,
} from "../../services/status.services";
import VideoCallManager from "../videoCall/videoCallManager";
import "./chat.css";

const userIdOf = (user) => String(user?._id || user?.id || "");

const labelFor = (user) =>
  user?.username || user?.email || user?.phoneNumber || "User";

const timeFor = (value) =>
  value
    ? new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const timestampFor = (value) => {
  if (!value) return "";

  const date = new Date(value);
  const today = new Date();

  const sameDay = date.toDateString() === today.toDateString();

  return sameDay
    ? timeFor(value)
    : `${date.toLocaleDateString([], {
        day: "numeric",
        month: "short",
      })}, ${timeFor(value)}`;
};

const dateLabelFor = (value) => {
  if (!value) return "";

  const date = new Date(value);
  const today = new Date();

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";

  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const reactionEmojis = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const composerEmojis = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😂",
  "🤣",
  "😊",
  "😍",
  "😘",
  "😎",
  "🥳",
  "🤔",
  "😢",
  "😭",
  "😡",
  "👍",
  "👎",
  "👏",
  "🙏",
  "❤️",
  "💜",
  "🔥",
  "✨",
  "🎉",
  "💯",
  "✅",
  "👋",
  "🤝",
  "🙌",
  "💪",
  "🌞",
  "🌈",
  "🍕",
  "☕",
];

function Avatar({ user, online }) {
  const name = labelFor(user);

  return (
    <span className="avatar">
      {user?.profilePicture ? (
        <img src={user.profilePicture} alt={name} />
      ) : (
        name[0]?.toUpperCase()
      )}

      {online && <i />}
    </span>
  );
}

function Chat() {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const clearUser = useUserStore((state) => state.clearUser);

  const navigate = useNavigate();

  const currentUserId = userIdOf(user);

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUserId, setTypingUserId] = useState(null);

  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const [showContacts, setShowContacts] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactQuery, setContactQuery] = useState("");

  const [expandedImage, setExpandedImage] = useState("");

  const [statuses, setStatuses] = useState([]);
  const [activeStatus, setActiveStatus] = useState(null);

  const [showStatusComposer, setShowStatusComposer] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [statusFile, setStatusFile] = useState(null);
  const [statusSending, setStatusSending] = useState(false);

  const [showProfile, setShowProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.username || "");
  const [profileAbout, setProfileAbout] = useState(user?.about || "");
  const [profileFile, setProfileFile] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);

  const [showContactProfile, setShowContactProfile] = useState(false);

  const [reactionPickerId, setReactionPickerId] = useState(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState("");

  const [loggingOut, setLoggingOut] = useState(false);

  const [videoCallRequest, setVideoCallRequest] = useState(0);

  const fileInput = useRef(null);
  const statusFileInput = useRef(null);
  const profileFileInput = useRef(null);
  const bottom = useRef(null);
  const offlineCallErrorTimer = useRef(null);

  const otherUser = useMemo(
    () =>
      activeConversation?.participants?.find(
        (member) => userIdOf(member) !== currentUserId
      ) || null,
    [activeConversation, currentUserId]
  );

  const requestVideoCall = useCallback(() => {
    const contactId = userIdOf(otherUser);

    if (!contactId || !onlineUsers.includes(contactId)) {
      const offlineMessage = `${labelFor(otherUser)} is not online.`;
      clearTimeout(offlineCallErrorTimer.current);
      setError(offlineMessage);
      offlineCallErrorTimer.current = setTimeout(() => {
        setError((current) =>
          current === offlineMessage ? "" : current
        );
      }, 1000);
      return;
    }

    setVideoCallRequest((current) => current + 1);
  }, [onlineUsers, otherUser]);

  useEffect(
    () => () => clearTimeout(offlineCallErrorTimer.current),
    []
  );

  const loadConversations = useCallback(async () => {
    try {
      const response = await getConversations();

      const list = response.data || [];

      setConversations(list);

      setOnlineUsers((existing) => [
        ...new Set([
          ...existing,
          ...list
            .flatMap((chat) => chat.participants || [])
            .filter((member) => member.isOnline)
            .map(userIdOf),
        ]),
      ]);
    } catch (requestError) {
      setError(
        requestError?.message || "Could not load conversations."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStatuses = useCallback(async () => {
    try {
      const response = await getStatuses();

      setStatuses(response.data || []);
    } catch (requestError) {
      setError(requestError?.message || "Could not load statuses.");
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadStatuses();
  }, [loadConversations, loadStatuses]);

  useEffect(() => {
    bottom.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, typingUserId]);

  useEffect(() => {
    if (!currentUserId) return undefined;

    const socket = connectSocket(currentUserId);

    const receiveMessage = (message) => {
      setMessages((current) =>
        message.conversation === activeConversation?._id
          ? [...current, message]
          : current
      );

      loadConversations();
    };

    const presence = ({ userId, isOnline }) =>
      setOnlineUsers((current) =>
        isOnline
          ? [...new Set([...current, String(userId)])]
          : current.filter((id) => id !== String(userId))
      );

    const typing = ({
      userId,
      conversationId,
      isTyping,
    }) => {
      if (
        String(conversationId) !==
        String(activeConversation?._id)
      )
        return;

      setTypingUserId(
        isTyping ? String(userId) : null
      );
    };

    const status = ({
      messageId,
      messageStatus,
    }) =>
      setMessages((current) =>
        current.map((message) =>
          message._id === messageId
            ? {
                ...message,
                messageStatus,
              }
            : message
        )
      );

    const removed = ({ messageId }) =>
      setMessages((current) =>
        current.filter(
          (message) => message._id !== messageId
        )
      );

    const statusCreated = (status) =>
      setStatuses((current) => [
        status,
        ...current.filter(
          (item) => item._id !== status._id
        ),
      ]);

    const statusRemoved = (statusId) =>
      setStatuses((current) =>
        current.filter(
          (status) => status._id !== statusId
        )
      );

    const reactionUpdated = ({
      messageId,
      reactions,
    }) =>
      setMessages((current) =>
        current.map((message) =>
          message._id === messageId
            ? {
                ...message,
                reactions,
              }
            : message
        )
      );

    const profileUpdated = (updatedUser) => {
      const updatedUserId = userIdOf(updatedUser);

      const applyProfile = (member) =>
        userIdOf(member) === updatedUserId
          ? {
              ...member,
              ...updatedUser,
            }
          : member;

      setConversations((current) =>
        current.map((conversation) => ({
          ...conversation,
          participants: (
            conversation.participants || []
          ).map(applyProfile),
        }))
      );

      setContacts((current) =>
        current.map(applyProfile)
      );

      setActiveConversation((current) =>
        current
          ? {
              ...current,
              participants: (
                current.participants || []
              ).map(applyProfile),
            }
          : current
      );

      if (updatedUserId === currentUserId)
        setUser(updatedUser);
    };

    socket.on("receive_message", receiveMessage);
    socket.on("user_status", presence);
    socket.on("user_typing", typing);
    socket.on("message_status_update", status);
    socket.on("message_deleted", removed);
    socket.on("new_status", statusCreated);
    socket.on("status_deleted", statusRemoved);
    socket.on("reaction_update", reactionUpdated);
    socket.on("profile_updated", profileUpdated);

    return () => {
      socket.off(
        "receive_message",
        receiveMessage
      );

      socket.off("user_status", presence);

      socket.off("user_typing", typing);

      socket.off(
        "message_status_update",
        status
      );

      socket.off(
        "message_deleted",
        removed
      );

      socket.off(
        "new_status",
        statusCreated
      );

      socket.off(
        "status_deleted",
        statusRemoved
      );

      socket.off(
        "reaction_update",
        reactionUpdated
      );

      socket.off(
        "profile_updated",
        profileUpdated
      );
    };
  }, [
    activeConversation?._id,
    currentUserId,
    loadConversations,
    setUser,
  ]);

  useEffect(() => () => disconnectSocket(), []);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape")
        setExpandedImage("");
    };

    window.addEventListener(
      "keydown",
      closeOnEscape
    );

    return () =>
      window.removeEventListener(
        "keydown",
        closeOnEscape
      );
  }, []);

  const openConversation = async (conversation) => {
    setActiveConversation(conversation);
    setMessages([]);
    setTypingUserId(null);

    try {
      const response = await getMessages(
        conversation._id
      );

      setMessages(response.data || []);

      setConversations((current) =>
        current.map((item) =>
          item._id === conversation._id
            ? {
                ...item,
                unreadCount: 0,
              }
            : item
        )
      );
    } catch (requestError) {
      setError(
        requestError?.message ||
          "Could not load messages."
      );
    }
  };

  const openContacts = async () => {
    setShowContacts(true);
    setContactQuery("");
    setContactsLoading(true);

    try {
      const response = await getAllUsers();

      setContacts(response.data || []);
    } catch (requestError) {
      setError(
        requestError?.message ||
          "Could not load people."
      );
    } finally {
      setContactsLoading(false);
    }
  };

  const openStatus = async (status) => {
    setActiveStatus(status);

    if (userIdOf(status.user) === currentUserId)
      return;

    try {
      const response = await viewStatus(
        status._id
      );

      if (response.data)
        setActiveStatus(response.data);
    } catch (requestError) {
      setError(
        requestError?.message ||
          "Could not open status."
      );
    }
  };

  const publishStatus = async (event) => {
    event.preventDefault();

    if (!statusText.trim() && !statusFile)
      return;

    setStatusSending(true);

    try {
      const response = await createStatus({
        content: statusText.trim(),
        file: statusFile,
      });

      if (response.data)
        setStatuses((current) => [
          response.data,
          ...current,
        ]);

      setStatusText("");
      setStatusFile(null);
      setShowStatusComposer(false);

      if (statusFileInput.current)
        statusFileInput.current.value = "";
    } catch (requestError) {
      setError(
        requestError?.message ||
          "Could not post status."
      );
    } finally {
      setStatusSending(false);
    }
  };

  const removeStatus = async (statusId) => {
    try {
      await deleteStatus(statusId);

      setStatuses((current) =>
        current.filter(
          (status) => status._id !== statusId
        )
      );

      setActiveStatus(null);
    } catch (requestError) {
      setError(
        requestError?.message ||
          "Could not delete status."
      );
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();

    setProfileSaving(true);

    try {
      const response = await updateUserProfile({
        username: profileName,
        about: profileAbout,
        media: profileFile,
      });

      if (response.data)
        setUser(response.data);

      setProfileFile(null);
      setShowProfile(false);
    } catch (requestError) {
      setError(
        requestError?.message ||
          "Could not update profile."
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const startConversation = async (contact) => {
    const conversation = {
      _id: contact.conversation?._id || null,

      participants: [
        user,
        contact,
      ],

      lastMessage:
        contact.conversation?.lastMessage || null,
    };

    setShowContacts(false);

    setActiveConversation(conversation);

    setMessages([]);

    setTypingUserId(null);

    if (!conversation._id) return;

    try {
      const response = await getMessages(
        conversation._id
      );

      setMessages(response.data || []);
    } catch (requestError) {
      setError(
        requestError?.message ||
          "Could not load messages."
      );
    }
  };

  const send = async (event) => {
    event.preventDefault();

    if (
      (!draft.trim() && !file) ||
      !otherUser
    )
      return;

    setSending(true);

    try {
      const response = await sendMessage({
        receiverId: userIdOf(otherUser),
        content: draft.trim(),
        file,
      });

      if (response.data)
        setMessages((current) => [
          ...current,
          response.data,
        ]);

      if (
        !activeConversation._id &&
        response.data?.conversation
      ) {
        setActiveConversation((current) => ({
          ...current,
          _id: response.data.conversation,
        }));
      }

      setDraft("");
      setFile(null);

      if (fileInput.current)
        fileInput.current.value = "";

      getSocket()?.emit("typing_stop", {
        conversationId: activeConversation._id,
        receiverId: userIdOf(otherUser),
      });

      loadConversations();
    } catch (requestError) {
      setError(
        requestError?.message ||
          "Message could not be sent."
      );
    } finally {
      setSending(false);
    }
  };

  const updateDraft = (value) => {
    setDraft(value);

    if (
      activeConversation?._id &&
      otherUser
    ) {
      getSocket()?.emit(
        value
          ? "typing_start"
          : "typing_stop",
        {
          conversationId:
            activeConversation._id,

          receiverId:
            userIdOf(otherUser),
        }
      );
    }
  };

  const reactToMessage = (
    messageId,
    emoji
  ) => {
    getSocket()?.emit("add_reaction", {
      messageId,
      emoji,
      reactionUserId: currentUserId,
    });

    setReactionPickerId(null);
  };

  const addComposerEmoji = (emoji) => {
    setDraft((current) =>
      `${current}${emoji}`
    );
  };

  const logout = async () => {
    setLoggingOut(true);

    try {
      await logoutUser();

      disconnectSocket();

      clearUser();

      navigate("/user-login", {
        replace: true,
      });
    } catch (requestError) {
      setError(
        requestError?.message ||
          "Could not log out. Please try again."
      );
    } finally {
      setLoggingOut(false);
    }
  };

  const visibleConversations =
    conversations.filter((conversation) =>
      labelFor(
        conversation.participants?.find(
          (member) =>
            userIdOf(member) !== currentUserId
        )
      )
        .toLowerCase()
        .includes(query.toLowerCase())
    );

  const visibleContacts =
    contacts.filter((contact) =>
      `${
        contact.username || ""
      } ${
        contact.phoneNumber || ""
      } ${
        contact.email || ""
      }`
        .toLowerCase()
        .includes(
          contactQuery.trim().toLowerCase()
        )
    );

  if (!currentUserId)
    return (
      <Navigate
        to="/user-login"
        replace
      />
    );

  return (
    <main className="chat-page">

      <nav
        className="app-rail"
        aria-label="Main navigation"
      >

        <button
          type="button"
          className="rail-brand"
          onClick={() => navigate("/chat")}
          aria-label="WeChat home"
        >
          <svg
            className="rail-logo"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M18.2 8.5c-2-3-5.5-3-7.4-.6L12 9.6l1.2-1.7c1.9-2.4 5.4-2.4 7.4.6s1.3 6.6-.6 7.4c-1.3.6-2.9-.2-4.3-2.1L12 9.6l-3.7 4.2c-1.4 1.9-3 2.7-4.3 2.1-1.9-.8-2.6-4.4-.6-7.4s5.5-3 7.4-.6L12 9.6" />
          </svg>

          <span className="rail-title">
            WeChat
          </span>
        </button>

        <div className="rail-items">

          <button
            type="button"
            className="rail-item active"
            onClick={() => navigate("/chat")}
            aria-label="Chats"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 3C6.5 3 2 6.9 2 11.7c0 2.7 1.5 5.1 3.8 6.7-.1 1-.5 2.3-1.3 3.1-.2.2 0 .6.3.6 1.9-.1 3.6-.9 4.7-1.7.8.2 1.6.3 2.5.3 5.5 0 10-3.9 10-8.7S17.5 3 12 3Z" />
            </svg>

            <small>Chats</small>
          </button>

          <button
            type="button"
            className="rail-item"
            onClick={() => navigate("/status")}
            aria-label="Status"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle
                cx="12"
                cy="12"
                r="8.2"
                strokeDasharray="4.4 3.4"
              />

              <circle
                cx="12"
                cy="12"
                r="3.1"
                fill="currentColor"
                stroke="none"
              />
            </svg>

            <small>Status</small>
          </button>

          <button
            type="button"
            className="rail-item"
            onClick={() => navigate("/profile")}
            aria-label="Profile"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 12.2a4.6 4.6 0 1 0-4.6-4.6 4.6 4.6 0 0 0 4.6 4.6Zm0 2.1c-3.7 0-7.4 1.9-7.4 4.5 0 .9.7 1.4 1.6 1.4h11.6c.9 0 1.6-.5 1.6-1.4 0-2.6-3.7-4.5-7.4-4.5Z" />
            </svg>

            <small>Profile</small>
          </button>

          <button
            type="button"
            className="rail-item rail-logout"
            onClick={logout}
            disabled={loggingOut}
            aria-label="Log out"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
              <path d="m14 16 4-4-4-4" />
              <path d="M18 12H9" />
            </svg>

            <small>
              {loggingOut
                ? "Leaving…"
                : "Log out"}
            </small>
          </button>

        </div>

        <button
          type="button"
          className="rail-avatar"
          onClick={() => navigate("/profile")}
          aria-label="My profile"
        >
          <Avatar user={user} />
        </button>

      </nav>

      <aside
        className={`chat-sidebar ${
          activeConversation
            ? "mobile-hidden"
            : ""
        }`}
      >

        <header className="chat-brand">

          <b>◌</b>

          <span>
            We<span>Chat</span>
          </span>

          <button
            type="button"
            onClick={() => navigate("/profile")}
          >
            My profile
          </button>

          <button
            type="button"
            onClick={openContacts}
          >
            New chat
          </button>

        </header>

        <div className="chat-search">

          <span>⌕</span>

          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Search chats"
          />

        </div>

        <section className="status-strip">

          <div className="status-strip-header">

            <strong>Status</strong>

            <span>

              <button
                type="button"
                onClick={() =>
                  navigate("/status")
                }
              >
                View all
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowStatusComposer(true)
                }
              >
                Add status
              </button>

            </span>

          </div>

          <div className="status-list">

            <button
              className="status-avatar add-status"
              type="button"
              onClick={() =>
                setShowStatusComposer(true)
              }
            >
              <b>＋</b>
              <small>My status</small>
            </button>

            {statuses.map((status) => (

              <button
                className="status-avatar"
                type="button"
                key={status._id}
                onClick={() =>
                  openStatus(status)
                }
              >
                <Avatar user={status.user} />

                <small>
                  {labelFor(status.user)}
                </small>
              </button>

            ))}

          </div>

        </section>

        <div className="conversation-list">

          {loading && (
            <p>Loading chats…</p>
          )}

          {!loading &&
            !visibleConversations.length && (
              <p>No conversations yet.</p>
            )}

          {visibleConversations.map(
            (conversation) => {

              const other =
                conversation.participants?.find(
                  (member) =>
                    userIdOf(member) !==
                    currentUserId
                );

              const last =
                conversation.lastMessage;

              return (

                <button
                  className={`conversation ${
                    conversation._id ===
                    activeConversation?._id
                      ? "selected"
                      : ""
                  }`}
                  key={conversation._id}
                  onClick={() =>
                    openConversation(
                      conversation
                    )
                  }
                >

                  <Avatar
                    user={other}
                    online={onlineUsers.includes(
                      userIdOf(other)
                    )}
                  />

                  <span>

                    <strong>
                      {labelFor(other)}
                    </strong>

                    <small>
                      {last?.contentType ===
                      "image"
                        ? "Photo"
                        : last?.contentType ===
                          "video"
                        ? "Video"
                        : last?.content ||
                          "Say hello"}
                    </small>

                  </span>

                  <time>
                    {timeFor(
                      last?.createdAt ||
                        conversation.updatedAt
                    )}
                  </time>

                </button>

              );
            }
          )}

        </div>

      </aside>

      <section
        className={`chat-window ${
          activeConversation
            ? ""
            : "desktop-empty"
        }`}
      >

        {!activeConversation ? (

          <p className="empty-state">
            Select a chat to start messaging
          </p>

        ) : (

          <>

            <header className="chat-header">

              <button
                className="back-button"
                type="button"
                onClick={() =>
                  setActiveConversation(null)
                }
              >
                ‹
              </button>

              <button
                className="contact-header-button"
                type="button"
                onClick={() =>
                  setShowContactProfile(true)
                }
                aria-label={`Open ${labelFor(
                  otherUser
                )}'s profile`}
              >

                <Avatar
                  user={otherUser}
                  online={onlineUsers.includes(
                    userIdOf(otherUser)
                  )}
                />

                <span>

                  <strong>
                    {labelFor(otherUser)}
                  </strong>

                  <small>
                    {typingUserId ===
                    userIdOf(otherUser)
                      ? "typing…"
                      : onlineUsers.includes(
                          userIdOf(otherUser)
                        )
                      ? "Online"
                      : "Offline"}
                  </small>

                </span>

              </button>

              {/* VIDEO CALL BUTTON */}
              <div className="call-actions">

                <button
                  type="button"
                  aria-label="Video call"
                  onClick={requestVideoCall}
                >

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >

                    <rect
                      x="3"
                      y="6"
                      width="13"
                      height="12"
                      rx="2"
                    />

                    <path d="m16 10 5-3v10l-5-3" />

                  </svg>

                </button>

              </div>

            </header>

            <div className="message-list">

              {messages.map(
                (message, index) => {

                  const mine =
                    userIdOf(message.sender) ===
                    currentUserId;

                  const reactions =
                    message.reactions || [];

                  const previousMessage =
                    messages[index - 1];

                  const showDate =
                    !previousMessage ||
                    new Date(
                      message.createdAt
                    ).toDateString() !==
                      new Date(
                        previousMessage.createdAt
                      ).toDateString();

                  return (

                    <Fragment key={message._id}>

                      {showDate && (
                        <p className="message-date-divider">
                          {dateLabelFor(
                            message.createdAt
                          )}
                        </p>
                      )}

                      <article
                        className={`message ${
                          mine ? "mine" : ""
                        }`}
                      >

                        <div>

                          {message.imageOrVideoUrl &&
                            message.contentType ===
                              "image" && (

                              <button
                                className="message-image-button"
                                type="button"
                                onClick={() =>
                                  setExpandedImage(
                                    message.imageOrVideoUrl
                                  )
                                }
                                aria-label="Open image in full size"
                              >

                                <img
                                  src={
                                    message.imageOrVideoUrl
                                  }
                                  alt="Shared image"
                                />

                              </button>

                            )}

                          {message.imageOrVideoUrl &&
                            message.contentType ===
                              "video" && (

                              <video
                                src={
                                  message.imageOrVideoUrl
                                }
                                controls
                              />

                            )}

                          {message.content && (
                            <p>
                              {message.content}
                            </p>
                          )}

                          <small
                            title={
                              message.createdAt
                                ? new Date(
                                    message.createdAt
                                  ).toLocaleString()
                                : ""
                            }
                          >

                            {timestampFor(
                              message.createdAt
                            )}

                            {" "}

                            {mine &&
                              (message.messageStatus ===
                              "read" ? (

                                <span
                                  className="read-ticks"
                                  aria-label="Read"
                                >
                                  <i>✓</i>
                                  <i>✓</i>
                                </span>

                              ) : (

                                <span
                                  className="sent-tick"
                                  aria-label="Sent"
                                >
                                  ✓
                                </span>

                              ))}

                          </small>

                          {reactions.length > 0 && (

                            <div className="message-reactions">

                              {reactions.map(
                                (reaction, index) => (

                                  <span
                                    key={`${reaction.emoji}-${userIdOf(
                                      reaction.user
                                    )}-${index}`}
                                    title={
                                      reaction.user
                                        ?.username ||
                                      "Reaction"
                                    }
                                  >
                                    {reaction.emoji}
                                  </span>

                                )
                              )}

                            </div>

                          )}

                          <button
                            className="reaction-trigger"
                            type="button"
                            onClick={() =>
                              setReactionPickerId(
                                (current) =>
                                  current ===
                                  message._id
                                    ? null
                                    : message._id
                              )
                            }
                            aria-label="React to message"
                          >
                            ☺
                          </button>

                          {reactionPickerId ===
                            message._id && (

                              <div className="reaction-picker">

                                {reactionEmojis.map(
                                  (emoji) => (

                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() =>
                                        reactToMessage(
                                          message._id,
                                          emoji
                                        )
                                      }
                                      aria-label={`React with ${emoji}`}
                                    >
                                      {emoji}
                                    </button>

                                  )
                                )}

                              </div>

                            )}

                        </div>

                        {mine && (

                          <button
                            className="delete-message"
                            type="button"
                            onClick={() =>
                              deleteMessage(
                                message._id
                              ).then(() =>
                                setMessages(
                                  (current) =>
                                    current.filter(
                                      (item) =>
                                        item._id !==
                                        message._id
                                    )
                                )
                              )
                            }
                          >
                            ×
                          </button>

                        )}

                      </article>

                    </Fragment>

                  );
                }
              )}

              {typingUserId ===
                userIdOf(otherUser) && (
                  <p className="typing-indicator">
                    typing…
                  </p>
                )}

              <span ref={bottom} />

            </div>

            <form
              className="composer"
              onSubmit={send}
            >

              {file && (
                <small>
                  Attached: {file.name}
                </small>
              )}

              {showEmojiPicker && (

                <div className="composer-emoji-picker">

                  <header>

                    <strong>Emoji</strong>

                    <button
                      type="button"
                      onClick={() =>
                        setShowEmojiPicker(false)
                      }
                      aria-label="Close emoji picker"
                    >
                      ×
                    </button>

                  </header>

                  <input
                    value={emojiQuery}
                    onChange={(event) =>
                      setEmojiQuery(
                        event.target.value
                      )
                    }
                    placeholder="Find an emoji"
                    aria-label="Find an emoji"
                  />

                  <div>

                    {composerEmojis
                      .filter(
                        (emoji) =>
                          !emojiQuery.trim() ||
                          emoji.includes(
                            emojiQuery.trim()
                          )
                      )
                      .map((emoji) => (

                        <button
                          type="button"
                          key={emoji}
                          onClick={() =>
                            addComposerEmoji(
                              emoji
                            )
                          }
                          aria-label={`Add ${emoji}`}
                        >
                          {emoji}
                        </button>

                      ))}

                  </div>

                </div>

              )}

              <div>

                <button
                  type="button"
                  onClick={() =>
                    fileInput.current?.click()
                  }
                  aria-label="Attach photo or video"
                >
                  ＋
                </button>

                <button
                  className={`composer-emoji-button ${
                    showEmojiPicker
                      ? "active"
                      : ""
                  }`}
                  type="button"
                  onClick={() =>
                    setShowEmojiPicker(
                      (current) => !current
                    )
                  }
                  aria-label="Open emoji picker"
                >
                  ☺
                </button>

                <input
                  ref={fileInput}
                  hidden
                  type="file"
                  accept="image/*,video/*"
                  onChange={(event) =>
                    setFile(
                      event.target.files?.[0] ||
                        null
                    )
                  }
                />

                <input
                  value={draft}
                  onChange={(event) =>
                    updateDraft(
                      event.target.value
                    )
                  }
                  onBlur={() =>
                    updateDraft("")
                  }
                  placeholder="Type a message..."
                />

                <button
                  className="send-button"
                  type="submit"
                  disabled={sending}
                >
                  {sending ? "…" : "Send"}
                </button>

              </div>

            </form>

          </>

        )}

      </section>

      {error && (

        <button
          className="chat-error"
          type="button"
          onClick={() => setError("")}
        >
          {error}
        </button>

      )}

      {expandedImage && (

        <div
          className="image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Full-size image"
          onClick={() =>
            setExpandedImage("")
          }
        >

          <button
            className="image-lightbox-close"
            type="button"
            aria-label="Close full-size image"
            onClick={() =>
              setExpandedImage("")
            }
          >
            ×
          </button>

          <img
            src={expandedImage}
            alt="Shared image in full size"
            onClick={(event) =>
              event.stopPropagation()
            }
          />

        </div>

      )}

      {showContacts && (

        <div
          className="contact-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Start a new chat"
        >

          <div className="contact-card">

            <header>

              <strong>New chat</strong>

              <button
                type="button"
                onClick={() =>
                  setShowContacts(false)
                }
                aria-label="Close"
              >
                ×
              </button>

            </header>

            <input
              autoFocus
              value={contactQuery}
              onChange={(event) =>
                setContactQuery(
                  event.target.value
                )
              }
              placeholder="Search name, email, or phone"
            />

            <div className="contact-list">

              {contactsLoading && (
                <p>Loading people…</p>
              )}

              {!contactsLoading &&
                !visibleContacts.length && (
                  <p>
                    {contactQuery.trim()
                      ? "No registered user from this name yet."
                      : "No registered people found."}
                  </p>
                )}

              {visibleContacts.map(
                (contact) => (

                  <button
                    type="button"
                    key={userIdOf(contact)}
                    onClick={() =>
                      startConversation(
                        contact
                      )
                    }
                  >

                    <Avatar user={contact} />

                    <span>

                      <strong>
                        {labelFor(contact)}
                      </strong>

                      <small>
                        {contact.phoneNumber ||
                          contact.email ||
                          "No contact detail"}
                      </small>

                    </span>

                  </button>

                )
              )}

            </div>

          </div>

        </div>

      )}

      {showStatusComposer && (

        <div
          className="contact-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Create status"
        >

          <form
            className="contact-card status-composer"
            onSubmit={publishStatus}
          >

            <header>

              <strong>New status</strong>

              <button
                type="button"
                onClick={() =>
                  setShowStatusComposer(false)
                }
                aria-label="Close"
              >
                ×
              </button>

            </header>

            <textarea
              value={statusText}
              onChange={(event) =>
                setStatusText(
                  event.target.value
                )
              }
              placeholder="Share an update..."
              autoFocus
            />

            <input
              ref={statusFileInput}
              hidden
              type="file"
              accept="image/*,video/*"
              onChange={(event) =>
                setStatusFile(
                  event.target.files?.[0] ||
                    null
                )
              }
            />

            <div className="status-compose-actions">

              <button
                type="button"
                onClick={() =>
                  statusFileInput.current?.click()
                }
              >
                {statusFile
                  ? statusFile.name
                  : "Attach photo or video"}
              </button>

              <button
                className="send-button"
                type="submit"
                disabled={statusSending}
              >
                {statusSending
                  ? "Posting…"
                  : "Post status"}
              </button>

            </div>

          </form>

        </div>

      )}

      {showContactProfile &&
        otherUser && (

          <div
            className="contact-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${labelFor(
              otherUser
            )}'s profile`}
          >

            <section className="contact-card contact-profile">

              <header>

                <strong>Contact info</strong>

                <button
                  type="button"
                  onClick={() =>
                    setShowContactProfile(false)
                  }
                  aria-label="Close"
                >
                  ×
                </button>

              </header>

              <div className="contact-profile-hero">

                {otherUser.profilePicture ? (

                  <img
                    src={
                      otherUser.profilePicture
                    }
                    alt={labelFor(otherUser)}
                  />

                ) : (

                  <b>
                    {labelFor(
                      otherUser
                    )[0]?.toUpperCase()}
                  </b>

                )}

                <h2>
                  {labelFor(otherUser)}
                </h2>

                <small>
                  {onlineUsers.includes(
                    userIdOf(otherUser)
                  )
                    ? "Online"
                    : "Offline"}
                </small>

              </div>

              <dl>

                <div>

                  <dt>Username</dt>

                  <dd>
                    {otherUser.username ||
                      "Not set"}
                  </dd>

                </div>

                {otherUser.about && (

                  <div>

                    <dt>About</dt>

                    <dd>
                      {otherUser.about}
                    </dd>

                  </div>

                )}

                {otherUser.phoneNumber && (

                  <div>

                    <dt>Phone</dt>

                    <dd>
                      {otherUser.phoneNumber}
                    </dd>

                  </div>

                )}

                {otherUser.email && (

                  <div>

                    <dt>Email</dt>

                    <dd>
                      {otherUser.email}
                    </dd>

                  </div>

                )}

              </dl>

            </section>

          </div>

        )}

      {activeStatus && (

        <div
          className="image-lightbox status-viewer"
          role="dialog"
          aria-modal="true"
          aria-label="Status"
          onClick={() =>
            setActiveStatus(null)
          }
        >

          <button
            className="image-lightbox-close"
            type="button"
            aria-label="Close status"
            onClick={() =>
              setActiveStatus(null)
            }
          >
            ×
          </button>

          <article
            className="status-card"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <header>

              <Avatar
                user={activeStatus.user}
              />

              <span>

                <strong>
                  {labelFor(
                    activeStatus.user
                  )}
                </strong>

                <small>
                  {timeFor(
                    activeStatus.createdAt
                  )}
                </small>

              </span>

            </header>

            {activeStatus.contentType ===
            "image" ? (

              <img
                src={activeStatus.content}
                alt="Shared status"
              />

            ) : activeStatus.contentType ===
              "video" ? (

              <video
                src={activeStatus.content}
                controls
                autoPlay
              />

            ) : (

              <p>
                {activeStatus.content}
              </p>

            )}

            {userIdOf(activeStatus.user) ===
              currentUserId && (

                <button
                  className="delete-status"
                  type="button"
                  onClick={() =>
                    removeStatus(
                      activeStatus._id
                    )
                  }
                >
                  Delete status
                </button>

              )}

          </article>

        </div>

      )}

      {showProfile && (

        <div
          className="contact-modal"
          role="dialog"
          aria-modal="true"
          aria-label="My profile"
        >

          <form
            className="contact-card profile-card"
            onSubmit={saveProfile}
          >

            <header>

              <strong>My profile</strong>

              <button
                type="button"
                onClick={() =>
                  setShowProfile(false)
                }
                aria-label="Close"
              >
                ×
              </button>

            </header>

            <button
              className="profile-photo"
              type="button"
              onClick={() =>
                profileFileInput.current?.click()
              }
            >

              {profileFile ? (

                <img
                  src={URL.createObjectURL(
                    profileFile
                  )}
                  alt="Profile preview"
                />

              ) : (

                <Avatar user={user} />

              )}

              <span>
                Change photo
              </span>

            </button>

            <input
              ref={profileFileInput}
              hidden
              type="file"
              accept="image/*"
              onChange={(event) =>
                setProfileFile(
                  event.target.files?.[0] ||
                    null
                )
              }
            />

            <label>

              Name

              <input
                value={profileName}
                onChange={(event) =>
                  setProfileName(
                    event.target.value
                  )
                }
                placeholder="Your name"
              />

            </label>

            <label>

              About

              <input
                value={profileAbout}
                onChange={(event) =>
                  setProfileAbout(
                    event.target.value
                  )
                }
                placeholder="About you"
              />

            </label>

            <button
              className="send-button"
              type="submit"
              disabled={profileSaving}
            >
              {profileSaving
                ? "Saving…"
                : "Save changes"}
            </button>

          </form>

        </div>

      )}

      <VideoCallManager
        user={user}
        contact={otherUser}
        startSignal={videoCallRequest}
      />

    </main>
  );
}

export default Chat;

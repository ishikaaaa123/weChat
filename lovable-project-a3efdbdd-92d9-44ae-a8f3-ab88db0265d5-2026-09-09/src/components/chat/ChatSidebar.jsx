import { useState } from "react";
import { Search, Infinity as InfinityIcon } from "lucide-react";

import Avatar from "./Avatar";
import StatusStrip from "./StatusStrip";
import { formatListTime } from "../../utils/formatTime";

// Left column: brand, search (chats + users by username), status strip and
// the conversation list.
export default function ChatSidebar({
  conversations,
  allUsers = [],
  currentUser,
  currentUserId,
  activeConversationId,
  onlineUsers,
  onSelect,
  onSelectUser,
  onOpenStatus,
  onOpenProfile,
  loading,
}) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();

  const otherOf = (conversation) =>
    conversation.participants?.find((participant) => participant._id !== currentUserId) || {};

  const visible = conversations.filter((conversation) =>
    (otherOf(conversation).username || "").toLowerCase().includes(term),
  );

  const chatUserIds = conversations.map((conversation) => otherOf(conversation)._id);
  const foundUsers = term
    ? allUsers.filter(
        (user) =>
          user._id !== currentUserId &&
          !chatUserIds.includes(user._id) &&
          (user.username || "").toLowerCase().includes(term),
      )
    : [];

  const statusPeople = (allUsers.length ? allUsers : conversations.map(otherOf))
    .filter((person) => person && person._id)
    .slice(0, 6);

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-card md:w-[340px]">
      <div className="flex items-center justify-between px-5 pt-5 md:hidden">
        <span className="flex items-center gap-2">
          <InfinityIcon className="size-7 text-primary" />
          <span className="text-xl font-bold text-foreground">
            We<span className="text-primary">Chat</span>
          </span>
        </span>
        <button type="button" onClick={onOpenProfile} aria-label="My profile">
          <Avatar user={currentUser} size={36} />
        </button>
      </div>

      <div className="px-5 py-4">
        <div className="flex h-11 items-center gap-2 rounded-xl bg-muted px-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by username"
            className="h-full w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <StatusStrip user={currentUser} people={statusPeople} onOpenStatus={onOpenStatus} />

      <div className="flex-1 overflow-y-auto pb-4">
        {loading && <p className="px-5 py-4 text-sm text-muted-foreground">Loading chats…</p>}
        {!loading && visible.length === 0 && foundUsers.length === 0 && (
          <p className="px-5 py-4 text-sm text-muted-foreground">No conversations yet.</p>
        )}

        {visible.map((conversation) => {
          const other = otherOf(conversation);
          const isActive = conversation._id === activeConversationId;
          const lastMessage = conversation.lastMessage;

          return (
            <button
              key={conversation._id}
              type="button"
              onClick={() => onSelect(conversation)}
              className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors ${
                isActive ? "bg-accent" : "hover:bg-muted"
              }`}
            >
              <Avatar user={other} online={onlineUsers.includes(other._id)} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {other.username || other.phoneNumber || "Unknown"}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatListTime(lastMessage?.createdAt || conversation.updatedAt)}
                  </span>
                </span>
                <span className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-muted-foreground">
                    {lastMessage?.contentType === "image"
                      ? "Photo"
                      : lastMessage?.contentType === "video"
                        ? "Video"
                        : lastMessage?.content || "Say hello"}
                  </span>
                  {conversation.unreadCount > 0 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                      {conversation.unreadCount}
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}

        {foundUsers.length > 0 && (
          <p className="px-5 pt-4 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            Other users
          </p>
        )}
        {foundUsers.map((user) => (
          <button
            key={user._id}
            type="button"
            onClick={() => onSelectUser(user)}
            className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted"
          >
            <Avatar user={user} online={onlineUsers.includes(user._id)} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {user.username || user.phoneNumber || "Unknown"}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {user.about || "Start a new chat"}
              </span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

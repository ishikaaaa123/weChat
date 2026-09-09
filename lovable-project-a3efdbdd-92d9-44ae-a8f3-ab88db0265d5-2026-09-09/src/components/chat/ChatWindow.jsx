import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCheck, Phone, Plus, Send, Smile, Video } from "lucide-react";

import Avatar from "./Avatar";
import { formatLastSeen, formatTime } from "../../utils/formatTime";

// Right column: header with presence, the message list, typing indicator, composer.
export default function ChatWindow({
  conversation,
  otherUser,
  messages,
  currentUserId,
  isOnline,
  isTyping,
  sending,
  onSend,
  onTyping,
  onBack,
  onOpenProfile,
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  if (!conversation) {
    return (
      <section className="hidden flex-1 items-center justify-center bg-background md:flex">
        <p className="text-sm text-muted-foreground">Select a chat to start messaging</p>
      </section>
    );
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!text.trim() && !file) return;
    onSend({ content: text.trim(), file });
    setText("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <section className="flex h-full flex-1 flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button type="button" onClick={onBack} className="md:hidden" aria-label="Back to chats">
          <ArrowLeft className="size-5 text-foreground" />
        </button>
        {/* Clicking the avatar or the name opens the contact profile. */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <Avatar user={otherUser} size={44} online={isOnline} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">
              {otherUser?.username || otherUser?.phoneNumber || otherUser?.email || "Unknown"}
            </span>
            <span className="block text-xs text-primary">
              {isTyping ? "typing…" : isOnline ? "Online" : formatLastSeen(otherUser?.lastSeen)}
            </span>
          </span>
        </button>
        <button type="button" className="rounded-full bg-muted p-2" aria-label="Voice call">
          <Phone className="size-4 text-primary" />
        </button>
        <button type="button" className="rounded-full bg-muted p-2" aria-label="Video call">
          <Video className="size-4 text-primary" />
        </button>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
        {messages.map((message) => {
          const mine = (message.sender?._id || message.sender) === currentUserId;

          return (
            <div key={message._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  mine
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {message.imageOrVideoUrl && message.contentType === "image" && (
                  <img
                    src={message.imageOrVideoUrl}
                    alt="Shared image"
                    className="mb-2 max-h-64 rounded-xl object-cover"
                  />
                )}
                {message.imageOrVideoUrl && message.contentType === "video" && (
                  <video src={message.imageOrVideoUrl} controls className="mb-2 max-h-64 rounded-xl" />
                )}
                {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
                <span className="mt-1 flex items-center justify-end gap-1 text-[11px] opacity-70">
                  {formatTime(message.createdAt)}
                  {mine &&
                    (message.messageStatus === "read" ? (
                      <CheckCheck className="size-3.5" />
                    ) : (
                      <Check className="size-3.5" />
                    ))}
                </span>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start">
            <span className="rounded-2xl bg-secondary px-4 py-2 text-xs text-muted-foreground">
              typing…
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border bg-card px-4 py-3">
        {file && (
          <p className="mb-2 truncate text-xs text-muted-foreground">Attached: {file.name}</p>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-full bg-muted p-2"
            aria-label="Attach photo or video"
          >
            <Plus className="size-4 text-primary" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            hidden
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
          <Smile className="size-5 text-muted-foreground" />
          <input
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              onTyping(event.target.value.length > 0);
            }}
            onBlur={() => onTyping(false)}
            placeholder="Type a message..."
            className="h-11 flex-1 rounded-full bg-muted px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={sending}
            className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Send className="size-4" />
            Send
          </button>
        </div>
      </form>
    </section>
  );
}

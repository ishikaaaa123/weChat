import { X } from "lucide-react";

import Avatar from "../chat/Avatar";
import { formatLastSeen } from "../../utils/formatTime";

// Read-only profile of the person you are chatting with. Opens when the chat
// header name is clicked.
export default function UserProfilePanel({ user, isOnline, onClose }) {
  if (!user) return null;

  const rows = [
    { label: "Username", value: user.username || "—" },
    { label: "About", value: user.about || "—" },
    { label: "Phone", value: [user.phoneSuffix, user.phoneNumber].filter(Boolean).join(" ") || "—" },
    { label: "Email", value: user.email || "—" },
  ];

  return (
    <aside className="flex h-full w-full flex-col border-l border-border bg-card md:w-[320px]">
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        <button type="button" onClick={onClose} aria-label="Close profile">
          <X className="size-5 text-foreground" />
        </button>
        <span className="text-base font-semibold text-foreground">Contact info</span>
      </header>

      <div className="flex flex-col items-center gap-2 px-6 py-8">
        <Avatar user={user} size={120} online={isOnline} />
        <p className="mt-2 text-lg font-semibold text-foreground">
          {user.username || user.phoneNumber || "Unknown"}
        </p>
        <p className="text-xs text-primary">
          {isOnline ? "Online" : formatLastSeen(user.lastSeen)}
        </p>
      </div>

      <div className="space-y-3 px-6">
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl bg-muted px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{row.label}</p>
            <p className="mt-0.5 truncate text-sm text-foreground">{row.value}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

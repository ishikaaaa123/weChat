import { Infinity as InfinityIcon, MessageCircle, User, Users, CircleDashed, Settings } from "lucide-react";

import Avatar from "./Avatar";

// Slim dark rail on the far left, like the reference design.
export default function IconRail({ user, active, onChange }) {
  const items = [
    { key: "chats", label: "Chats", Icon: MessageCircle },
    { key: "profile", label: "Profile", Icon: User },
    { key: "contacts", label: "Contacts", Icon: Users },
    { key: "status", label: "Status", Icon: CircleDashed },
    { key: "settings", label: "Settings", Icon: Settings },
  ];

  return (
    <nav className="hidden w-[76px] shrink-0 flex-col items-center gap-2 bg-primary/95 py-5 md:flex">
      <span className="mb-1 flex flex-col items-center gap-1 text-primary-foreground">
        <InfinityIcon className="size-8" />
        <span className="text-[13px] font-bold">WeChat</span>
      </span>

      <div className="mt-4 flex flex-1 flex-col items-center gap-2">
        {items.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            title={label}
            aria-label={label}
            onClick={() => onChange(key)}
            className={`flex size-11 items-center justify-center rounded-2xl transition-colors ${
              active === key
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "text-primary-foreground/70 hover:bg-primary-foreground/10"
            }`}
          >
            <Icon className="size-5" />
          </button>
        ))}
      </div>

      <button type="button" onClick={() => onChange("profile")} aria-label="My profile">
        <Avatar user={user} size={40} online />
      </button>
    </nav>
  );
}

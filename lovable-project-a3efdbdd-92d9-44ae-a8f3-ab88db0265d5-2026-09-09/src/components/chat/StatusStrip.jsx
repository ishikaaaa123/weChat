import { Plus } from "lucide-react";

import Avatar from "./Avatar";

// Status row shown at the top of the sidebar. Only UI for now — the status
// screen and its controllers get wired up later.
export default function StatusStrip({ user, people = [], onOpenStatus }) {
  return (
    <div className="border-b border-border px-5 pb-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Status</span>
        <button
          type="button"
          onClick={onOpenStatus}
          className="text-xs font-semibold text-primary hover:opacity-75"
        >
          View all
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={onOpenStatus}
          className="flex w-14 shrink-0 flex-col items-center gap-1"
        >
          <span className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-primary text-primary">
            <Plus className="size-5" />
          </span>
          <span className="truncate text-[11px] text-muted-foreground">Add Status</span>
        </button>

        {people.map((person) => (
          <button
            key={person._id}
            type="button"
            onClick={onOpenStatus}
            className="flex w-14 shrink-0 flex-col items-center gap-1"
          >
            <span className="rounded-full border-2 border-primary p-0.5">
              <Avatar user={person} size={44} />
            </span>
            <span className="w-full truncate text-[11px] text-muted-foreground">
              {person.username || person.phoneNumber || "User"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

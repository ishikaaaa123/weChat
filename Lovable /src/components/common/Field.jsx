// Small shared building blocks so every auth screen looks the same.

export function Label({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-foreground">
      {children}
    </label>
  );
}

export function TextInput({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`h-12 w-full rounded-xl border border-input bg-card px-4 text-[15px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30 ${className}`}
    />
  );
}

export function PrimaryButton({ loading, children, className = "", ...props }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[15px] font-semibold text-primary-foreground transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground"
        />
      )}
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`text-sm font-medium text-primary transition-opacity hover:opacity-75 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function Alert({ tone = "error", children }) {
  const tones = {
    error: "border-destructive/30 bg-destructive/10 text-destructive",
    success: "border-primary/25 bg-primary/10 text-primary",
  };
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}
    >
      {children}
    </p>
  );
}

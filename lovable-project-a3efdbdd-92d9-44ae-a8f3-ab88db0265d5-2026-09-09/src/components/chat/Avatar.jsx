// Round avatar with an optional green online dot.
export default function Avatar({ user, size = 48, online = false }) {
  const initial = (user?.username || user?.phoneNumber || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {user?.profilePicture ? (
        <img
          src={user.profilePicture}
          alt={user?.username || "User"}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold">
          {initial}
        </div>
      )}
      {online && (
        <span className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-card bg-green-500" />
      )}
    </div>
  );
}

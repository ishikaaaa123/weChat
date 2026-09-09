// Small time helpers shared by the chat list and the chat window.

export function formatTime(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatListTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  if (sameDay) return formatTime(timestamp);
  return date.toLocaleDateString([], { day: "2-digit", month: "short" });
}

export function formatLastSeen(timestamp) {
  if (!timestamp) return "Offline";
  return `Last seen ${formatListTime(timestamp)}`;
}

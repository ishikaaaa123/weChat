import { io } from "socket.io-client";

// One shared socket for the whole app. The events below already exist in
// backend/service/socketService.js, nothing new is needed on the server.
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

let socket = null;

export function connectSocket(userId) {
  if (!socket) {
    socket = io(apiBaseUrl, { withCredentials: true, transports: ["websocket", "polling"] });
  }
  if (userId) {
    socket.emit("user_connected", userId);
    socket.on("connect", () => socket.emit("user_connected", userId));
  }
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

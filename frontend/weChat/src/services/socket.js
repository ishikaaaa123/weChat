import { io } from "socket.io-client";

const socketUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
let socket;

export const connectSocket = (userId) => {
  if (!socket) {
    socket = io(socketUrl, { withCredentials: true, transports: ["websocket", "polling"] });
  }

  const registerUser = () => socket.emit("user_connected", userId, () => {});
  if (userId) {
    if (socket.connected) registerUser();
    socket.once("connect", registerUser);
  }
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = undefined;
};

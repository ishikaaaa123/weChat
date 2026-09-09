import axiosInstance from "./url.services";

// Every call maps 1:1 to an existing backend route in routers/chatRoute.js.

export const getConversations = async () => {
  const response = await axiosInstance.get("/chat/conversations");
  return response.data;
};

export const getMessages = async (conversationId) => {
  const response = await axiosInstance.get(`/chat/conversations/${conversationId}/messages`);
  return response.data;
};

export const sendMessage = async ({ receiverId, content, file }) => {
  const formData = new FormData();
  formData.append("receiverId", receiverId);
  if (content) formData.append("content", content);
  if (file) formData.append("media", file);

  const response = await axiosInstance.post("/chat/send-message", formData);
  return response.data;
};

export const markMessagesRead = async (messageIds) => {
  const response = await axiosInstance.put("/chat/messages/read", { messageIds });
  return response.data;
};

export const deleteMessage = async (messageId) => {
  const response = await axiosInstance.delete(`/chat/messages/${messageId}/delete`);
  return response.data;
};

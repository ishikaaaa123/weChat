import axiosInstance from "./url.services";

export const getStatuses = async () => {
  const response = await axiosInstance.get("/status/get-status");
  return response.data;
};

export const createStatus = async ({ content, file }) => {
  const formData = new FormData();
  if (content) formData.append("content", content);
  if (file) formData.append("media", file);
  const response = await axiosInstance.post("/status/create-status", formData);
  return response.data;
};

export const viewStatus = async (statusId) => {
  const response = await axiosInstance.get(`/status/${statusId}/viewStatus`);
  return response.data;
};

export const deleteStatus = async (statusId) => {
  const response = await axiosInstance.delete(`/status/${statusId}/deleteStatus`);
  return response.data;
};

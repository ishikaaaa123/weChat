import axiosInstance from "./url.services";
import { generatePhoneOtp, validatePhoneOtp } from "./firebase";

export const sendOtp = async (email) => {
  try {
    const response = await axiosInstance.post("/auth/email/send-otp", { email });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const verifyOtp = async (email, emailOtp) => {
  try {
    const response = await axiosInstance.post("/auth/email/verify-otp", { email, emailOtp });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

// Firebase owns sending the SMS and validating its code. The backend is called
// only after Firebase confirms the code, using Axios to establish our app session.
export const sendPhoneOtp = (phoneNumber, recaptchaContainerId) =>
  generatePhoneOtp(phoneNumber, recaptchaContainerId);

export const verifyPhoneOtp = async (code) => {
  try {
    const firebaseResult = await validatePhoneOtp(code);
    const idToken = await firebaseResult.user.getIdToken();
    const response = await axiosInstance.post(
      "/auth/phone/complete",
      {},
      { headers: { Authorization: `Bearer ${idToken}` } },
    );

    return {
      ...response.data,
      phoneNumber: firebaseResult.user.phoneNumber,
    };
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const updateUserProfile = async (data) => {
  try {
    const formData = new FormData();
    if (data.username !== undefined) formData.append("username", data.username);
    if (data.about !== undefined) formData.append("about", data.about);
    if (data.media) formData.append("media", data.media);
    const response = await axiosInstance.put("/auth/update-profile", formData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const logoutUser = async () => {
  try {
    const response = await axiosInstance.post("/auth/logout");
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const getAllUsers = async () => {
  try {
    const response = await axiosInstance.get("/auth/get-all-users");
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

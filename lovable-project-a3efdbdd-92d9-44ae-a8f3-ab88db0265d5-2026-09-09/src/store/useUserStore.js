import { create } from "zustand";
import { persist } from "zustand/middleware";

// Keeps the signed-in user in localStorage so a refresh does not log the user out.
const useUserStore = create(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      setUser: (userData) => set({ user: userData, isAuthenticated: true }),
      clearUser: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: "User-storage" },
  ),
);

export default useUserStore;

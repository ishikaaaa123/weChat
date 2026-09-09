import { createFileRoute } from "@tanstack/react-router";

import Login from "../pages/auth/Login.jsx";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in to WeChat — Connect. Chat. Stay Close." },
      {
        name: "description",
        content:
          "Sign in to WeChat with a one-time code sent to your phone or email, and pick up your conversations and status updates instantly.",
      },
      { property: "og:title", content: "Sign in to WeChat" },
      {
        property: "og:description",
        content: "One-time code sign in for real-time chats and status updates.",
      },
    ],
  }),
  component: Login,
});

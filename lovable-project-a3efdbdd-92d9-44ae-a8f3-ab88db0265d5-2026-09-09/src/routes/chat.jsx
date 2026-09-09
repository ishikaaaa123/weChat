import { createFileRoute } from "@tanstack/react-router";

import Chat from "../pages/chat/Chat.jsx";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "WeChat — Your conversations" },
      {
        name: "description",
        content:
          "Chat in real time on WeChat: see who is online, when they are typing, and share photos and videos.",
      },
      { property: "og:title", content: "WeChat — Your conversations" },
      {
        property: "og:description",
        content: "Real-time messaging with online presence, typing indicators and media sharing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Chat,
});

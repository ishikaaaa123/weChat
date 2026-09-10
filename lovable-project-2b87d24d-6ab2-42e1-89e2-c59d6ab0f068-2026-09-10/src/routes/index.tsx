import { createFileRoute } from "@tanstack/react-router";
import WeChatWorkspace from "@/components/WeChatWorkspace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WeChat Messenger" },
      { name: "description", content: "A focused WeChat-style messenger with expressive chat tools and a personal profile space." },
      { property: "og:title", content: "WeChat Messenger" },
      { property: "og:description", content: "A focused WeChat-style messenger with expressive chat tools and a personal profile space." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <WeChatWorkspace />;
}

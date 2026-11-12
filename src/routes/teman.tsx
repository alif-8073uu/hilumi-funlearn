import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { SharedStreaks } from "@/components/SharedStreaks";

export const Route = createFileRoute("/teman")({
  validateSearch: (search: Record<string, unknown>): { chat?: string | undefined } => ({ chat: typeof search["chat"] === "string" ? search["chat"] : undefined }),
  head: () => ({ meta: [
    { title: "Streak Duo & Grup — HiLumi" },
    { name: "description", content: "Undang teman ke duo atau grup, selesaikan kuis bersama, dan evolusikan pet Lumi." },
    { property: "og:title", content: "Streak Duo & Grup — HiLumi" },
    { property: "og:description", content: "Undangan kuis bersama dan evolusi pet duo serta grup." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Teman,
});
function Teman() {
  const { chat } = Route.useSearch();
  return <Shell><h1 className="mb-4 text-3xl font-bold">Streak Duo & Grup</h1><SharedStreaks openChat={chat} /></Shell>;
}

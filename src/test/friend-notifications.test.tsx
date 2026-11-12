import { act, cleanup, render, screen } from "@testing-library/react";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FriendNotifications } from "@/components/FriendNotifications";

const mocks = vi.hoisted(() => {
  const callbacks: Record<string, (payload: { new: Record<string, unknown> }) => void> = {};
  const channel: any = {
    on: (_event: string, filter: { table: string }, callback: (payload: { new: Record<string, unknown> }) => void) => { callbacks[filter.table] = callback; return channel; },
    subscribe: () => channel,
  };
  return { callbacks, channel, removeChannel: vi.fn(), rpc: vi.fn(), from: vi.fn() };
});
vi.mock("@/integrations/supabase/client", () => ({ supabase: { channel: () => mocks.channel, removeChannel: mocks.removeChannel, rpc: mocks.rpc, from: mocks.from } }));

async function showNotifications() {
  const root = createRootRoute({ component: () => <Outlet /> });
  const home = createRoute({ getParentRoute: () => root, path: "/", component: () => <FriendNotifications uid="me" /> });
  const router = createRouter({ routeTree: root.addChildren([home]), history: createMemoryHistory({ initialEntries: ["/"] }) });
  render(<RouterProvider router={router} />);
  await act(async () => { await router.load(); });
}

beforeEach(() => {
  mocks.rpc.mockResolvedValue({ data: [{ id: "friend", nick: "Bima", lumi_id: "#LUMI-1" }] });
  mocks.from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: "quiz-1", group_id: "group-1", inviter_id: "friend", title: "Kuis IPA", minutes: 10 } }) }) }) });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); Object.keys(mocks.callbacks).forEach((key) => delete mocks.callbacks[key]); });

describe("Friend notifications", () => {
  it("shows a friend's chat with a direct chat link and ignores my own message", async () => {
    await showNotifications();
    await act(async () => { mocks.callbacks.streak_messages({ new: { id: "own", user_id: "me", group_id: "group-1", body: "Halo" } }); });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await act(async () => { mocks.callbacks.streak_messages({ new: { id: "message-1", user_id: "friend", group_id: "group-1", body: "Halo, sudah belajar?" } }); });
    expect(await screen.findByText("Bima mengirim pesan 💬")).toBeInTheDocument();
    expect(screen.getByText("Halo, sudah belajar?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buka Chat" })).toHaveAttribute("href", "/teman?chat=group-1");
  });

  it("shows a quiz invitation and links directly to that quiz", async () => {
    await showNotifications();
    await act(async () => { mocks.callbacks.shared_quiz_players({ new: { quiz_id: "quiz-1", user_id: "me" } }); });
    expect(await screen.findByText("Bima mengajak kuis! ⚔️")).toBeInTheDocument();
    expect(screen.getByText("Kuis IPA · 10 menit. Yuk, main bareng!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ikut Kuis" })).toHaveAttribute("href", "/kuis?invite=quiz-1");
    expect(mocks.from).toHaveBeenCalledWith("shared_quizzes");
  });
});

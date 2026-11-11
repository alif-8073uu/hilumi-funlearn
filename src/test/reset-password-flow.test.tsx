import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const auth = vi.hoisted(() => ({ getUser: vi.fn(), updateUser: vi.fn(), onAuthStateChange: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a> }));
import { ResetPassword } from "@/components/ResetPassword";

afterEach(() => { cleanup(); vi.restoreAllMocks(); window.history.replaceState(null, "", "/"); });

describe("Password reset form", () => {
  it("does not submit a wrong multiplication; submits the new password after a correct answer", async () => {
    window.history.replaceState(null, "", "/reset-password#type=recovery");
    vi.spyOn(Math, "random").mockReturnValue(0.6);
    auth.getUser.mockResolvedValue({ data: { user: { id: "verified-test-user" } }, error: null });
    auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    auth.updateUser.mockResolvedValue({ error: null });
    render(<ResetPassword />);
    await screen.findByRole("button", { name: "Ubah password" });
    const inputs = document.querySelectorAll('input[autocomplete="new-password"]');
    if (!inputs[0] || !inputs[1]) throw new Error("Password fields missing");
    fireEvent.change(inputs[0], { target: { value: "newpass123" } });
    fireEvent.change(inputs[1], { target: { value: "newpass123" } });
    fireEvent.change(screen.getByLabelText("Jawaban perkalian"), { target: { value: "48" } });
    fireEvent.click(screen.getByRole("button", { name: "Ubah password" }));
    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent("belum benar");
    fireEvent.change(screen.getByLabelText("Jawaban perkalian"), { target: { value: "49" } });
    fireEvent.click(screen.getByRole("button", { name: "Ubah password" }));
    await waitFor(() => expect(auth.updateUser).toHaveBeenCalledWith({ password: "newpass123" }));
    expect(await screen.findByRole("heading", { name: "Kata sandi berhasil diubah!" })).toBeVisible();
  });
});
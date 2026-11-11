import { createFileRoute } from "@tanstack/react-router";
import { ResetPassword } from "@/components/ResetPassword";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Pulihkan Kata Sandi — HiLumi" },
    { name: "description", content: "Buat kata sandi baru untuk akun HiLumi melalui tautan pemulihan email yang aman." },
    { property: "og:title", content: "Pulihkan Kata Sandi — HiLumi" },
    { property: "og:description", content: "Pulihkan akses akun dan kembali belajar bersama Lumi." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ResetPassword,
});
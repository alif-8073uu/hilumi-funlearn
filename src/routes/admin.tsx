import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Lumi } from "@/components/Lumi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminListUsers, adminLogin, adminUpdateUser, type AdminUser } from "@/lib/admin.functions";
import { getRank } from "@/lib/game";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Panel Admin — HiLumi" },
      { name: "description", content: "Panel admin HiLumi untuk memantau aktivitas, streak, XP, dan rank siswa." },
      { property: "og:title", content: "Panel Admin — HiLumi" },
      { property: "og:description", content: "Pantau aktivitas, streak, XP, dan rank siswa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const KEY = "hilumi-admin-token";

function Admin() {
  const [token, setToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setToken(sessionStorage.getItem(KEY)), []);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { const r = await adminLogin({ data: { code } }); sessionStorage.setItem(KEY, r.token); setToken(r.token); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Gagal masuk"); }
    finally { setBusy(false); }
  }
  const logout = () => { sessionStorage.removeItem(KEY); setToken(null); };

  if (!token)
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 px-4 pt-16 text-center">
        <Lumi mood="thinking" size={110} />
        <h1 className="text-3xl font-bold">Masuk Admin</h1>
        <form onSubmit={login} className="glass w-full space-y-3 rounded-3xl p-5">
          <Input type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Masukkan ID admin" required autoFocus />
          <Button type="submit" disabled={busy} className="w-full bg-lumi text-primary-foreground">Masuk</Button>
        </form>
        <Link to="/" className="text-sm text-muted-foreground underline">Kembali ke halaman siswa</Link>
      </div>
    );
  return <Panel token={token} onLogout={logout} />;
}

function Panel({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [visits, setVisits] = useState(0);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { const r = await adminListUsers({ data: { token } }); setUsers(r.users); setVisits(r.visitsToday); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Gagal memuat"); onLogout(); }
  }, [token, onLogout]);
  useEffect(() => { load(); }, [load]);

  async function update(id: string, patch: Omit<Parameters<typeof adminUpdateUser>[0]["data"], "token" | "id">) {
    try { await adminUpdateUser({ data: { token, id, ...patch } }); toast.success("Tersimpan"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Gagal menyimpan"); }
  }

  const list = users.filter((u) => (u.nick + u.lumi_id + u.email).toLowerCase().includes(q.toLowerCase()));
  const totalXp = users.reduce((a, u) => a + Number(u.progress["xp"] ?? 0), 0);
  const activeToday = users.filter((u) => new Date(u.updated_at).toDateString() === new Date().toDateString()).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Panel Admin <span className="text-primary">HiLumi</span></h1>
        <div className="flex gap-2"><Button variant="secondary" size="sm" onClick={load}>Muat ulang</Button><Button variant="secondary" size="sm" onClick={onLogout}>Keluar</Button></div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Total pengunjung hari ini", visits], ["Total siswa", users.length], ["Aktif hari ini", activeToday], ["Total XP", totalXp]].map(([l, v]) => (
          <div key={l} className="glass rounded-3xl p-4"><p className="text-sm text-muted-foreground">{l}</p><p className="text-3xl font-bold">{v}</p></div>
        ))}
      </div>
      <Input className="mt-4" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nickname, ID, atau email" />
      <div className="glass mt-4 overflow-x-auto rounded-3xl">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground"><tr>{["Siswa", "Rank", "XP", "Streak", "Kartu", "Aktivitas terakhir", ""].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody>
            {list.map((u) => {
              const xp = Number(u.progress["xp"] ?? 0);
              const st = (u.progress["streak"] ?? {}) as { count?: number; recoveriesUsed?: number };
              const decks = (u.progress["decks"] ?? []) as unknown[];
              const r = getRank(xp);
              return (
                <Fragment key={u.id}>
                  <tr className="border-t">
                    <td className="p-3"><b>{u.nick}</b><div className="text-xs text-muted-foreground">{u.lumi_id} · {u.email}</div></td>
                    <td className="p-3">{r.emoji} {r.name}</td>
                    <td className="p-3 font-bold">{xp}</td>
                    <td className="p-3">🔥 {st.count ?? 0} <span className="text-xs text-muted-foreground">({5 - (st.recoveriesUsed ?? 0)} pulih)</span></td>
                    <td className="p-3">{decks.length} set</td>
                    <td className="p-3 text-xs">{new Date(u.updated_at).toLocaleString("id-ID")}</td>
                    <td className="p-3"><Button size="sm" onClick={() => setOpen(open === u.id ? null : u.id)}>{open === u.id ? "Tutup" : "Kelola"}</Button></td>
                  </tr>
                  {open === u.id && <tr key={`${u.id}-e`}><td colSpan={7} className="p-3"><Editor u={u} xp={xp} streak={st.count ?? 0} onSave={(p) => update(u.id, p)} /></td></tr>}
                </Fragment>
              );
            })}
            {!list.length && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Belum ada siswa.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Editor({ u, xp, streak, onSave }: { u: AdminUser; xp: number; streak: number; onSave: (p: { nick?: string; addXp?: number; setXp?: number; streakCount?: number; resetRecoveries?: boolean; clearDecks?: boolean }) => void }) {
  const [nick, setNick] = useState(u.nick);
  const [add, setAdd] = useState(50);
  const [setTo, setSetTo] = useState(xp);
  const [s, setS] = useState(streak);
  return (
    <div className="grid gap-3 rounded-2xl bg-muted p-4 md:grid-cols-2">
      <div className="flex gap-2"><Input value={nick} maxLength={20} onChange={(e) => setNick(e.target.value)} /><Button size="sm" onClick={() => onSave({ nick })}>Ubah nama</Button></div>
      <div className="flex gap-2"><Input type="number" value={add} onChange={(e) => setAdd(+e.target.value)} /><Button size="sm" onClick={() => onSave({ addXp: add })}>Tambah XP</Button></div>
      <div className="flex gap-2"><Input type="number" min={0} value={setTo} onChange={(e) => setSetTo(+e.target.value)} /><Button size="sm" onClick={() => onSave({ setXp: Math.max(0, setTo) })}>Atur XP</Button></div>
      <div className="flex gap-2"><Input type="number" min={0} value={s} onChange={(e) => setS(+e.target.value)} /><Button size="sm" onClick={() => onSave({ streakCount: Math.max(0, s) })}>Atur streak</Button></div>
      <Button size="sm" variant="secondary" onClick={() => onSave({ resetRecoveries: true })}>Reset jatah pulih streak (5x)</Button>
      <Button size="sm" variant="destructive" onClick={() => confirm("Hapus semua flashcard siswa ini?") && onSave({ clearDecks: true })}>Hapus semua flashcard</Button>
    </div>
  );
}

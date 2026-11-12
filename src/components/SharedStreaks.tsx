import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, UserPlus, Check, Swords, Users, Flame, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { StreakPet } from "./StreakPet";
import { GroupChat } from "./GroupChat";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { sharedGroups, visibleSharedDays, type MemberName } from "@/lib/shared";
import { memberStatus } from "@/lib/member-status";
import { useMemberPresence } from "@/lib/presence";

export function SharedStreaks() {
  const uid = useStore((s) => s.uid);
  const presence = useMemberPresence();
  const client = useQueryClient();
  const groups = useQuery({ queryKey: ["shared-groups", uid], queryFn: sharedGroups, enabled: Boolean(uid), refetchInterval: 5000 });
  const [term, setTerm] = useState("");
  const [name, setName] = useState("");
  const [results, setResults] = useState<MemberName[]>([]);
  const [selected, setSelected] = useState<MemberName[]>([]);
  const [busy, setBusy] = useState(false);
  const refresh = () => client.invalidateQueries({ queryKey: ["shared-groups"] });
  async function search() {
    const { data, error } = await supabase.rpc("streak_directory", { term: term.trim() });
    if (error) toast.error(error.message); else setResults(data ?? []);
  }
  async function create() {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("create_streak_group", { label: name.trim() || (selected.length === 1 ? `Duo ${selected[0]?.nick}` : "Grup Lumi"), members: selected.map((s) => s.id) });
      if (error) throw error;
      setSelected([]); setName(""); await refresh(); toast.success("Undangan anggota terkirim");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal membuat streak"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <section className="border-b pb-6">
      <div className="mb-4 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent"><UserPlus className="h-5 w-5" /></div><h2 className="text-xl font-bold">Buat Streak Duo / Grup</h2></div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void search(); }}>
        <Input aria-label="Cari anggota" placeholder="Nickname atau #LUMI-ID" value={term} onChange={(e) => setTerm(e.target.value)} />
        <Button type="submit" size="icon" aria-label="Cari" disabled={term.trim().length < 2}><Search className="h-4 w-4" /></Button>
      </form>
      <ul className="mt-3 space-y-2">{results.map((r) => <li key={r.id}><label className="flex items-center gap-3 py-2"><Checkbox checked={selected.some((s) => s.id === r.id)} onCheckedChange={(v) => setSelected((s) => v ? [...s.filter((x) => x.id !== r.id), r] : s.filter((x) => x.id !== r.id))} /><span>{r.nick} <small className="text-muted-foreground">{r.lumi_id}</small></span></label></li>)}</ul>
      {selected.length > 0 && <div className="mt-3 space-y-3"><p className="text-sm">{selected.map((s) => s.nick).join(", ")} · {selected.length + 1} anggota</p><Input aria-label="Nama streak" placeholder="Nama duo / grup" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /><Button onClick={create} disabled={busy}><UserPlus className="mr-2 h-4 w-4" />{busy ? "Mengirim…" : "Undang Anggota"}</Button></div>}
    </section>
    {groups.isPending && <p className="text-muted-foreground">Memuat streak…</p>}
    {groups.error && <p role="alert" className="text-destructive">Streak gagal dimuat. <Button variant="secondary" onClick={() => groups.refetch()}>Coba Lagi</Button></p>}
    {groups.data?.length === 0 && <p className="text-muted-foreground">Belum ada streak bersama.</p>}
    {groups.data?.map((g) => {
      const me = g.members.find((m) => m.user_id === uid);
      const ready = g.members.every((m) => m.accepted);
      return <section key={g.id} className="border-b pb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><div className="mb-1 flex items-center gap-2 text-xs font-bold text-accent"><Users className="h-4 w-4" />{g.members.length === 2 ? "Duo" : "Grup"} · {g.members.length} anggota</div><h2 className="break-words text-xl font-bold">{g.name}</h2></div>
          {me?.accepted ? <div className="flex flex-wrap gap-2"><GroupChat groupId={g.id} name={g.name} uid={uid ?? ""} names={g.names} /><Link to="/kuis" search={{ group: g.id }}><Button disabled={!ready}><Swords className="mr-2 h-4 w-4" />Undang Kuis</Button></Link></div> : <Button onClick={async () => { const { error } = await supabase.rpc("accept_streak_group", { g: g.id }); if (error) toast.error(error.message); else { await refresh(); toast.success("Bergabung dengan streak"); } }}><Check className="mr-2 h-4 w-4" />Terima Undangan</Button>}
        </div>
        <div className="mb-4 border-l-2 border-primary/50 bg-secondary/30 px-3 py-2"><StreakPet compact days={visibleSharedDays(g.streak_count, g.last_completed_day)} label={g.members.length === 2 ? "Pet Duo" : "Pet Grup"} /></div>
        <ul className="mb-4 flex flex-wrap gap-3 text-sm">{g.members.map((m) => <li key={m.user_id} className="flex min-w-0 items-center gap-2"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold ${m.accepted ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"}`}>{(g.names.find((n) => n.id === m.user_id)?.nick ?? "A").slice(0, 1).toUpperCase()}</span><div><p className="break-words font-bold">{g.names.find((n) => n.id === m.user_id)?.nick ?? "Anggota"}</p><p className={`flex items-center gap-1 text-xs ${m.accepted ? "text-success" : "text-muted-foreground"}`}>{m.accepted ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}{m.accepted ? "Bergabung" : "Menunggu"}</p></div></li>)}</ul>
        <div className="space-y-2">{g.quizzes.map((q) => <div key={q.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-3"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${q.credited ? "bg-flame/15 text-flame" : "bg-accent/15 text-accent"}`}>{q.credited ? <Flame className="h-4 w-4" /> : <Swords className="h-4 w-4" />}</span><div className="min-w-0"><b className="break-words">{q.title}</b><p className="text-xs text-muted-foreground">{q.credited ? "Semua anggota selesai" : new Date(q.expires_at).getTime() < Date.now() ? "Undangan berakhir" : "Menunggu pertandingan selesai"}</p></div></div><Link to="/kuis" search={{ invite: q.id }}><Button size="sm" variant="secondary">{q.credited ? "Peringkat" : "Buka Undangan"}</Button></Link></div>)}</div>
      </section>;
    })}
  </div>;
}
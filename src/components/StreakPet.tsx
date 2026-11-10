import { petStage, PET_STAGES } from "@/lib/game";
import egg from "@/assets/pets/egg.svg";
import hatched from "@/assets/pets/hatched.svg";
import mini from "@/assets/pets/mini.svg";
import medium from "@/assets/pets/medium.svg";
import epic from "@/assets/pets/epic.svg";
import legendary from "@/assets/pets/legendary.svg";
import superpower from "@/assets/pets/superpower.svg";

const art = { egg, hatched, mini, medium, epic, legendary, superpower };
export function StreakPet({ days, label, compact = false, stacked = false }: { days: number; label: string; compact?: boolean; stacked?: boolean }) {
  const stage = petStage(days);
  const next = PET_STAGES.find((s) => s.days > days);
  return <div className={`flex items-center ${stacked ? "w-44 shrink-0 flex-col gap-1 text-center" : `gap-4 ${compact ? "" : "flex-wrap"}`}`}>
    <img src={art[stage.id]} alt={`Pet ${label}: ${stage.name}`} className={compact ? "h-28 w-24 shrink-0 object-contain" : "h-52 w-44 shrink-0 object-contain"} />
    <div className={`min-w-0 ${stacked ? "w-full" : "flex-1"}`}>
      <p className="text-sm font-bold text-muted-foreground">{label}</p>
      <h3 className="text-xl font-bold">{stage.name}</h3>
      <p className="font-bold text-sun">🔥 {days} hari</p>
      {next ? <p className="text-sm text-muted-foreground">{next.name} · {next.days - days} hari lagi</p> : <p className="text-sm text-accent">Superpower · 250 hari++</p>}
    </div>
  </div>;
}
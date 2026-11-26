import { useState } from "react";
import { Copy, Phone, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

const PHONE_DISPLAY = "+62 81315022052";
const PHONE_TEL = "+6281315022052";
const WA_LINK = "https://wa.me/6281315022052?text=Halo%20Alif%2C%20saya%20ingin%20bertanya%20tentang%20HiLumi.";

export function ContactPerson() {
  const [open, setOpen] = useState(false);

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(PHONE_DISPLAY);
      toast.success("Nomor WhatsApp disalin!");
    } catch {
      toast.error("Tidak bisa menyalin otomatis. Silakan salin manual.");
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 gap-1.5 rounded-full bg-lumi px-3 text-xs font-bold text-primary-foreground shadow-glow sm:px-4 sm:text-sm"
        aria-label="Contact Person — hubungi pembuat HiLumi"
      >
        <Phone className="h-4 w-4" />
        Contact Person
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-3xl border-accent/40 bg-card">
          <DialogHeader>
            <DialogTitle className="pr-6 font-display text-2xl text-lumi-blue">Contact Person</DialogTitle>
            <DialogDescription>Pembuat HiLumi — silakan sapa lewat WhatsApp.</DialogDescription>
          </DialogHeader>

          <div className="mt-1 rounded-2xl bg-secondary px-4 py-3">
            <p className="font-bold">Alif Jabbar Nursalam</p>
            <p className="text-sm text-lumi-blue">SMPN 14 Bandung</p>
            <p className="mt-2 text-lg font-bold tracking-wide">{PHONE_DISPLAY}</p>
          </div>

          <div className="mt-3 grid gap-2">
            <Button asChild className="h-11 bg-lumi text-primary-foreground shadow-glow">
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                <Phone className="h-4 w-4" />
                Buka WhatsApp
              </a>
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={copyNumber} className="gap-2">
                <Copy className="h-4 w-4" />
                Salin
              </Button>
              <Button variant="outline" asChild className="gap-2">
                <a href={`tel:${PHONE_TEL}`}>
                  <Phone className="h-4 w-4" />
                  Telepon
                </a>
              </Button>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Tutup" className="absolute right-2 top-2 h-8 w-8 text-muted-foreground">
            <X className="h-4 w-4" />
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

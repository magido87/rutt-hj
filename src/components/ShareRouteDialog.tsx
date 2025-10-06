import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Share2, Copy, Check } from "lucide-react";

interface ShareRouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeId: string;
}

export function ShareRouteDialog({ open, onOpenChange, routeId }: ShareRouteDialogProps) {
  const [copied, setCopied] = useState(false);
  
  const shareUrl = `${window.location.origin}/karta?shared=${routeId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Länk kopierad!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Kunde inte kopiera länk");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Dela rutt
          </DialogTitle>
          <DialogDescription>
            Dela denna länk med chauffören så kan de se rutten direkt i sin telefon
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Delbar länk</Label>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-semibold">Vad ser chauffören?</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Karta med alla stopp</li>
              <li>✓ Stoplista i rätt ordning</li>
              <li>✓ Avstånd och körtid</li>
              <li>✓ Ingen redigering möjlig</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

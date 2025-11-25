import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";
import { OptimizedRoute } from "@/utils/routeOptimizer";
import { getPDFBlob } from "@/utils/exportRoute";
import { supabase } from "@/integrations/supabase/client";

interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeData: OptimizedRoute;
}

export function SendEmailDialog({ open, onOpenChange, routeData }: SendEmailDialogProps) {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      toast.error("Ange en e-postadress");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Ogiltig e-postadress");
      return;
    }

    setIsSending(true);

    try {
      // Generate PDF
      console.log("Generating PDF...");
      const exportData = {
        ...routeData,
        timestamp: Date.now(),
      };
      const pdfBlob = getPDFBlob(exportData);
      
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]); // Remove data:application/pdf;base64, prefix
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(pdfBlob);
      const pdfBase64 = await base64Promise;

      console.log("Sending email to:", email);

      // Call edge function
      const { data, error } = await supabase.functions.invoke('send-route-email', {
        body: {
          to: email,
          pdfData: pdfBase64,
          routeInfo: {
            stops: routeData.segments.length,
            distance: `${(routeData.totalDistance / 1000).toFixed(1)} km`,
            duration: `${Math.floor(routeData.totalDuration / 3600)}h ${Math.floor((routeData.totalDuration % 3600) / 60)}min`,
          },
        },
      });

      if (error) {
        throw new Error(error.message || "Kunde inte skicka e-post");
      }

      toast.success(`E-post skickad till ${email}!`);
      setEmail("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error(error.message || "Kunde inte skicka e-post");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Maila PDF till chaufför
          </DialogTitle>
          <DialogDescription>
            Skicka ruttplanen som PDF via e-post
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Chaufförens e-post</Label>
            <Input
              id="email"
              type="email"
              placeholder="exempel@företag.se"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSending}
            />
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-semibold mb-2">E-posten innehåller:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ PDF med alla stopp i ordning</li>
              <li>✓ Avstånd och tider</li>
              <li>✓ Kumulativ körtid</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSending}
            >
              Avbryt
            </Button>
            <Button
              onClick={handleSend}
              className="flex-1"
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Skickar...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Skicka
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

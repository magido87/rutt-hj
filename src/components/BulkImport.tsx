import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseAddresses } from "@/utils/addressParser";
import { Address } from "@/types/route";
import { toast } from "sonner";
import { Upload, CheckCircle, AlertCircle, XCircle, Loader2 } from "lucide-react";

interface ParsedAddress {
  original: string;
  cleaned: string;
  status: "pending" | "valid" | "warning" | "invalid";
  placeId?: string;
  formattedAddress?: string;
}

interface BulkImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (addresses: Address[]) => void;
  apiKey: string;
}

export function BulkImport({ open, onOpenChange, onImport, apiKey }: BulkImportProps) {
  const [inputText, setInputText] = useState("");
  const [parsedAddresses, setParsedAddresses] = useState<ParsedAddress[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const handleParse = () => {
    const cleaned = parseAddresses(inputText);
    const parsed: ParsedAddress[] = cleaned.map((addr) => ({
      original: inputText.split('\n').find(line => line.includes(addr.split(' ')[0])) || addr,
      cleaned: addr,
      status: "pending",
    }));
    setParsedAddresses(parsed);
  };

  const validateAddresses = async () => {
    if (!apiKey) {
      toast.error("Google Maps API-nyckel saknas");
      return;
    }

    setIsValidating(true);
    const autocompleteService = new google.maps.places.AutocompleteService();

    const validatedAddresses = await Promise.all(
      parsedAddresses.map(async (addr) => {
        try {
          const result = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve) => {
            autocompleteService.getPlacePredictions(
              {
                input: addr.cleaned,
                componentRestrictions: { country: "se" },
              },
              (predictions) => resolve(predictions || [])
            );
          });

          if (result.length > 0) {
            const topMatch = result[0];
            return {
              ...addr,
              status: "valid" as const,
              placeId: topMatch.place_id,
              formattedAddress: topMatch.description,
            };
          } else {
            return { ...addr, status: "invalid" as const };
          }
        } catch (error) {
          console.error("Validation error:", error);
          return { ...addr, status: "warning" as const };
        }
      })
    );

    setParsedAddresses(validatedAddresses);
    setIsValidating(false);
    
    const validCount = validatedAddresses.filter(a => a.status === "valid").length;
    const invalidCount = validatedAddresses.filter(a => a.status === "invalid").length;
    
    toast.success(`${validCount} adresser validerade, ${invalidCount} misslyckades`);
  };

  const handleImport = () => {
    const validAddresses: Address[] = parsedAddresses
      .filter((addr) => addr.status === "valid")
      .map((addr) => ({
        value: addr.formattedAddress || addr.cleaned,
        placeId: addr.placeId,
      }));

    if (validAddresses.length === 0) {
      toast.error("Inga giltiga adresser att importera");
      return;
    }

    onImport(validAddresses);
    toast.success(`${validAddresses.length} adresser importerade!`);
    
    // Reset
    setInputText("");
    setParsedAddresses([]);
    onOpenChange(false);
  };

  const getStatusIcon = (status: ParsedAddress["status"]) => {
    switch (status) {
      case "valid":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "invalid":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: ParsedAddress["status"]) => {
    switch (status) {
      case "valid":
        return <Badge className="bg-green-500">✓ Giltig</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500">⚠ Osäker</Badge>;
      case "invalid":
        return <Badge variant="destructive">✗ Ogiltig</Badge>;
      default:
        return <Badge variant="outline">Väntar</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import av Adresser</DialogTitle>
          <DialogDescription>
            Klistra in adresser från Excel (en per rad). Företagsnamn tas automatiskt bort.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Input Area */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Steg 1: Klistra in adresser</CardTitle>
              <CardDescription>
                Exempel: "Elcab Dalhemsvägen 2, Torslanda" → "Dalhemsvägen 2, Torslanda"
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Elcab Dalhemsvägen 2, Torslanda&#10;Lingonvägen 35, Floda&#10;Importgatan15 Hisings Backa&#10;..."
                className="min-h-[200px] font-mono text-sm"
              />
              <Button onClick={handleParse} disabled={!inputText.trim()}>
                <Upload className="mr-2 h-4 w-4" />
                Parsa adresser
              </Button>
            </CardContent>
          </Card>

          {/* Preview Table */}
          {parsedAddresses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Steg 2: Validera & Granska</CardTitle>
                <CardDescription>
                  {parsedAddresses.length} adresser hittade
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={validateAddresses}
                  disabled={isValidating}
                  variant="secondary"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validerar...
                    </>
                  ) : (
                    "Validera med Google Maps"
                  )}
                </Button>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Status</TableHead>
                        <TableHead>Original</TableHead>
                        <TableHead>Rensad</TableHead>
                        <TableHead>Google Maps resultat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedAddresses.map((addr, index) => (
                        <TableRow key={index}>
                          <TableCell>{getStatusIcon(addr.status)}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {addr.original}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {addr.cleaned}
                          </TableCell>
                          <TableCell>
                            {addr.status === "pending" ? (
                              <Badge variant="outline">Ej validerad</Badge>
                            ) : addr.status === "valid" ? (
                              <div className="space-y-1">
                                {getStatusBadge(addr.status)}
                                <div className="text-xs text-muted-foreground">
                                  {addr.formattedAddress}
                                </div>
                              </div>
                            ) : (
                              getStatusBadge(addr.status)
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Button */}
          {parsedAddresses.some((a) => a.status === "valid") && (
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Avbryt
              </Button>
              <Button onClick={handleImport}>
                Importera {parsedAddresses.filter((a) => a.status === "valid").length} adresser
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

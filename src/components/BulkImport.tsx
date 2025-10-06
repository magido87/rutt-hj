import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseAddresses } from "@/utils/addressParser";
import { Address } from "@/types/route";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, CheckCircle, AlertCircle, XCircle, Loader2, FileText, FileSpreadsheet, File } from "lucide-react";
import * as XLSX from 'xlsx';

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
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      let extractedText = "";
      
      // Handle different file types
      if (file.type === 'application/pdf') {
        // PDF - använd edge function
        const formData = new FormData();
        formData.append('file', file);
        
        const { data, error } = await supabase.functions.invoke('parse-document-addresses', {
          body: formData,
        });
        
        if (error) throw error;
        if (data?.addresses) {
          extractedText = data.addresses.join('\n');
        }
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Excel
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        // Extrahera alla celler som innehåller adress-liknande text
        const addresses: string[] = [];
        data.forEach((row: any) => {
          row.forEach((cell: any) => {
            if (typeof cell === 'string' && cell.length > 5) {
              addresses.push(cell);
            }
          });
        });
        extractedText = addresses.join('\n');
      } else if (file.name.endsWith('.csv')) {
        // CSV
        const text = await file.text();
        const lines = text.split('\n');
        extractedText = lines.map(line => {
          // Ta första kolumnen eller hela raden om det är en kolumn
          const columns = line.split(/[,;]/);
          return columns[0]?.trim() || line.trim();
        }).join('\n');
      }
      
      if (extractedText) {
        setInputText(extractedText);
        toast.success(`${file.name} uppladdad!`);
      } else {
        toast.error("Kunde inte extrahera adresser från filen");
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast.error("Fel vid uppladdning av fil");
    } finally {
      setIsUploading(false);
    }
  };

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
              <CardTitle className="text-base">Steg 1: Ladda upp eller klistra in</CardTitle>
              <CardDescription>
                Stödjer PDF, Excel (.xlsx/.xls) och CSV-filer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text">Klistra in</TabsTrigger>
                  <TabsTrigger value="file">Ladda upp fil</TabsTrigger>
                </TabsList>
                
                <TabsContent value="text" className="space-y-4">
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Elcab Dalhemsvägen 2, Torslanda&#10;Lingonvägen 35, Floda&#10;Importgatan15 Hisings Backa&#10;..."
                    className="min-h-[200px] font-mono text-sm"
                  />
                </TabsContent>
                
                <TabsContent value="file" className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
                    <div className="flex justify-center gap-4">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                      <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
                      <File className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Ladda upp dokument</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        PDF, Excel eller CSV med adresser
                      </p>
                      <input
                        type="file"
                        accept=".pdf,.xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload">
                        <Button asChild disabled={isUploading}>
                          <span>
                            {isUploading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Laddar upp...
                              </>
                            ) : (
                              <>
                                <Upload className="mr-2 h-4 w-4" />
                                Välj fil
                              </>
                            )}
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                  
                  {inputText && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground mb-2">Extraherad text:</p>
                      <Textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className="min-h-[200px] font-mono text-sm"
                      />
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              
              <Button onClick={handleParse} disabled={!inputText.trim() || isUploading}>
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

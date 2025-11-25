import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, Printer } from "lucide-react";
import { exportToPDF, exportToExcel, printRoute } from "@/utils/exportRoute";
import { toast } from "sonner";

interface ExportMenuProps {
  segments: any[];
  totalDistance: number;
  totalDuration: number;
}

export const ExportMenu = ({ segments, totalDistance, totalDuration }: ExportMenuProps) => {
  const handleExportPDF = async () => {
    try {
      exportToPDF({
        segments,
        totalDistance,
        totalDuration,
        timestamp: Date.now(),
      });
      toast.success("PDF nedladdad!");
    } catch (error: any) {
      toast.error(error.message || "Kunde inte exportera PDF");
    }
  };

  const handleExportExcel = async () => {
    try {
      exportToExcel({
        segments,
        totalDistance,
        totalDuration,
        timestamp: Date.now(),
      });
      toast.success("Excel-fil nedladdad!");
    } catch (error: any) {
      toast.error(error.message || "Kunde inte exportera Excel");
    }
  };

  const handlePrint = () => {
    try {
      printRoute();
      toast.info("Öppnar utskriftsdialog...");
    } catch (error: any) {
      toast.error(error.message || "Kunde inte starta utskrift");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-12 px-4 gap-2">
          <Download className="h-5 w-5" />
          <span>Exportera</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
          <FileText className="h-4 w-4 mr-2" />
          Ladda ner PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Ladda ner Excel
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handlePrint} className="cursor-pointer">
          <Printer className="h-4 w-4 mr-2" />
          Skriv ut
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

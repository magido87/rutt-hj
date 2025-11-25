import jsPDF from "jspdf";
import * as XLSX from "xlsx";

interface RouteSegment {
  order: number;
  address: string;
  distance: number;
  duration: number;
  cumulativeDistance: number;
  cumulativeDuration: number;
}

interface ExportData {
  segments: RouteSegment[];
  totalDistance: number;
  totalDuration: number;
  timestamp: number;
}

const formatDistance = (meters: number): string => {
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
};

const getFileName = (extension: string): string => {
  const date = new Date();
  const dateStr = date.toISOString().split("T")[0];
  const timeStr = date.toTimeString().split(" ")[0].replace(/:/g, "-");
  return `rutt_${dateStr}_${timeStr}.${extension}`;
};

const generatePDF = (data: ExportData): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Titel
  doc.setFontSize(20);
  doc.text("Optimerad Rutt", pageWidth / 2, yPos, { align: "center" });
  yPos += 15;

  // Datum och tid
  doc.setFontSize(10);
  const dateStr = new Date(data.timestamp).toLocaleString("sv-SE");
  doc.text(`Skapad: ${dateStr}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  // Sammanfattning
  doc.setFontSize(12);
  doc.text(`Total sträcka: ${formatDistance(data.totalDistance)}`, 20, yPos);
  yPos += 7;
  doc.text(`Total körtid: ${formatDuration(data.totalDuration)}`, 20, yPos);
  yPos += 7;
  doc.text(`Antal stopp: ${data.segments.length}`, 20, yPos);
  yPos += 15;

  // Rubriker för stopp
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text("Nr", 20, yPos);
  doc.text("Adress", 35, yPos);
  doc.text("Avstånd", 130, yPos);
  doc.text("Tid", 165, yPos);
  yPos += 7;

  // Linje under rubriker
  doc.line(20, yPos - 2, pageWidth - 20, yPos - 2);
  yPos += 3;

  // Stopp
  doc.setFont(undefined, "normal");
  data.segments.forEach((segment, index) => {
    // Ny sida om vi når slutet
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    doc.text(segment.order.toString(), 20, yPos);
    
    // Adress (korta ner om för lång)
    const address = segment.address.length > 45 
      ? segment.address.substring(0, 42) + "..." 
      : segment.address;
    doc.text(address, 35, yPos);

    if (index > 0) {
      doc.text(formatDistance(segment.distance), 130, yPos);
      doc.text(formatDuration(segment.duration), 165, yPos);
    } else {
      doc.text("START", 130, yPos);
      doc.text("-", 165, yPos);
    }

    yPos += 7;
  });

  return doc;
};

export const exportToPDF = (data: ExportData): void => {
  try {
    const doc = generatePDF(data);
    doc.save(getFileName("pdf"));
    console.log("✅ PDF exporterad");
  } catch (error) {
    console.error("PDF export error:", error);
    throw new Error("Kunde inte skapa PDF");
  }
};

// Ny funktion för att få PDF som Blob för email
export const getPDFBlob = (data: ExportData): Blob => {
  try {
    const doc = generatePDF(data);
    return doc.output('blob');
  } catch (error) {
    console.error("PDF blob error:", error);
    throw new Error("Kunde inte skapa PDF");
  }
};

export const exportToExcel = (data: ExportData): void => {
  try {
    // Skapa data för Excel
    const excelData = data.segments.map((segment, index) => ({
      "Nr": segment.order,
      "Adress": segment.address,
      "Avstånd från förra (km)": index > 0 ? (segment.distance / 1000).toFixed(1) : "-",
      "Tid från förra (min)": index > 0 ? Math.round(segment.duration / 60) : "-",
      "Total sträcka (km)": (segment.cumulativeDistance / 1000).toFixed(1),
      "Total tid (min)": Math.round(segment.cumulativeDuration / 60),
    }));

    // Lägg till sammanfattning
    const summaryData = [
      {},
      { "Nr": "SAMMANFATTNING" },
      { "Nr": "Total sträcka:", "Adress": formatDistance(data.totalDistance) },
      { "Nr": "Total körtid:", "Adress": formatDuration(data.totalDuration) },
      { "Nr": "Antal stopp:", "Adress": data.segments.length },
      { "Nr": "Skapad:", "Adress": new Date(data.timestamp).toLocaleString("sv-SE") },
    ];

    const finalData = [...excelData, ...summaryData];

    // Skapa worksheet och workbook
    const ws = XLSX.utils.json_to_sheet(finalData);
    
    // Sätt kolumnbredder
    ws["!cols"] = [
      { wch: 5 },  // Nr
      { wch: 50 }, // Adress
      { wch: 20 }, // Avstånd från förra
      { wch: 18 }, // Tid från förra
      { wch: 18 }, // Total sträcka
      { wch: 15 }, // Total tid
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rutt");

    // Spara Excel-fil
    XLSX.writeFile(wb, getFileName("xlsx"));
    console.log("✅ Excel exporterad");
  } catch (error) {
    console.error("Excel export error:", error);
    throw new Error("Kunde inte skapa Excel-fil");
  }
};

export const printRoute = (): void => {
  try {
    window.print();
    console.log("✅ Utskrift startad");
  } catch (error) {
    console.error("Print error:", error);
    throw new Error("Kunde inte starta utskrift");
  }
};

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

interface DownloadReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: any[];
}

export function DownloadReportDialog({
  open,
  onOpenChange,
  title,
  data,
}: DownloadReportDialogProps) {
  const handleExportExcel = () => {
    if (!data || data.length === 0) {
      toast.error("No data available to export");
      return;
    }

    try {
      const headers = Object.keys(data[0]).join(",");
      const rows = data
        .map((obj) =>
          Object.values(obj)
            .map((val) => `"${String(val || "").replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");

      const csvContent =
        "data:text/csv;charset=utf-8,\uFEFF" +
        encodeURIComponent(headers + "\n" + rows);
      const link = document.createElement("a");
      link.setAttribute("href", csvContent);
      link.setAttribute(
        "download",
        `${title.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Excel/CSV spreadsheet downloaded successfully!");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to generate spreadsheet");
    }
  };

  const handleExportPdf = () => {
    if (!data || data.length === 0) {
      toast.error("No data available to export");
      return;
    }

    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Popup blocked! Please allow popups to export PDF.");
        return;
      }

      const htmlHeaders = Object.keys(data[0]);
      const titleHtml = `<h1 style="font-family: Arial, sans-serif; color: #0f172a; margin-bottom: 4px;">${title}</h1>`;
      const subtitleHtml = `<p style="font-family: Arial, sans-serif; color: #64748b; margin-top: 0; font-size: 14px;">Precision Nav Logistics Report — Generated on ${new Date().toLocaleString()}</p>`;

      let tableHtml = `<table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; margin-top: 24px; font-size: 13px;">`;
      // Headers
      tableHtml += `<tr style="background-color: #0f172a; color: #ffffff; text-align: left;">`;
      htmlHeaders.forEach((h) => {
        tableHtml += `<th style="padding: 12px 10px; border: 1px solid #cbd5e1; text-transform: uppercase; font-size: 11px; tracking-wider: 0.05em;">${h}</th>`;
      });
      tableHtml += `</tr>`;
      // Rows
      data.forEach((row, idx) => {
        const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
        tableHtml += `<tr style="background-color: ${bg};">`;
        htmlHeaders.forEach((h) => {
          let cellValue = row[h];
          if (typeof cellValue === "object" && cellValue !== null) {
            cellValue = JSON.stringify(cellValue);
          }
          tableHtml += `<td style="padding: 10px; border: 1px solid #e2e8f0; color: #334155;">${
            cellValue !== undefined ? cellValue : ""
          }</td>`;
        });
        tableHtml += `</tr>`;
      });
      tableHtml += `</table>`;

      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { padding: 40px; }
              @media print {
                body { padding: 20px; }
              }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            ${titleHtml}
            ${subtitleHtml}
            ${tableHtml}
          </body>
        </html>
      `);
      printWindow.document.close();

      toast.success("PDF Report generated successfully!");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-center">
            Export Report
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Select your preferred file format for: <br />
          <span className="font-semibold text-foreground">{title}</span>
        </p>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleExportExcel}
            className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
          >
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground group-hover:text-primary mb-3 transition-colors" />
            <span className="text-sm font-semibold">Spreadsheet</span>
            <span className="text-[10px] text-muted-foreground mt-1">Excel / CSV</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
          >
            <FileText className="h-10 w-10 text-muted-foreground group-hover:text-primary mb-3 transition-colors" />
            <span className="text-sm font-semibold">PDF Document</span>
            <span className="text-[10px] text-muted-foreground mt-1">Save / Print PDF</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

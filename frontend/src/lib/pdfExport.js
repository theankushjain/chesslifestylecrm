import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import { toast } from "sonner";

export function generatePDF({ title, filename, head, body, orientation = "portrait" }) {
  try {
    const doc = new jsPDF({ orientation });

    // Add header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("The Chess Lifestyle", 14, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text(title, 14, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), "PPpp")}`, 14, 38);

    // Add table
    doc.autoTable({
      startY: 45,
      head: [head],
      body: body,
      theme: "striped",
      headStyles: { fillColor: [15, 23, 42], textColor: 255 }, // Dark slate to match CRM
      styles: { fontSize: 9, cellPadding: 3 },
    });

    doc.save(filename);
  } catch (error) {
    console.error("PDF generation error:", error);
    toast.error("Failed to generate PDF. Check console for details.");
  }
}

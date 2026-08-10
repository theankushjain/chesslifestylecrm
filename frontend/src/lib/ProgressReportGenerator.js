import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function downloadProgressReport(student, outcomes) {
  const doc = new jsPDF();
  const completedOutcomes = outcomes.filter(o => o.completed);
  
  doc.setFontSize(20);
  doc.text("Learning Progress Report", 14, 22);
  
  doc.setFontSize(12);
  doc.text(`Student Name: ${student.name}`, 14, 32);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 38);
  
  if (completedOutcomes.length === 0) {
    doc.text("No learning outcomes have been marked as completed yet.", 14, 50);
  } else {
    const tableData = completedOutcomes.map(o => [
      o.level.split(":")[0], // just the level name to save space
      o.module.split(":")[0], 
      o.text,
      o.completed_date ? new Date(o.completed_date).toLocaleDateString() : ""
    ]);
    
    autoTable(doc, {
      startY: 45,
      head: [['Level', 'Module', 'Learning Outcome', 'Completed']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] }, // slate-800 for header
      styles: { fontSize: 10, cellPadding: 4 },
      alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
      columnStyles: { 
        0: { cellWidth: 25 },
        1: { cellWidth: 25 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 25, textColor: [249, 115, 22], fontStyle: 'bold' } // orange-500
      }
    });
  }
  
  doc.save(`${student.name.replace(/\s+/g, '_')}_Progress_Report.pdf`);
}

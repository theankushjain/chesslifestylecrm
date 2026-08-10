import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function loadImageAsPNG(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width || 512;
        canvas.height = img.height || 512;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function downloadProgressReport(student, outcomes) {
  const doc = new jsPDF();
  const completedOutcomes = outcomes.filter(o => o.completed);
  
  // Try to load and add the logo
  const logoData = await loadImageAsPNG('/favicon.svg');
  let startY = 45;
  
  if (logoData) {
    doc.addImage(logoData, 'PNG', 14, 12, 16, 16);
    doc.setFontSize(20);
    doc.text("Learning Progress Report", 34, 20);
    doc.setFontSize(12);
    doc.text(`Student Name: ${student.name}`, 34, 28);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 130, 28);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("TheChessLifestyle.com - life is a chess game, learn to checkmate", 14, 38);
    doc.setTextColor(0); // reset color
    startY = 45;
  } else {
    doc.setFontSize(20);
    doc.text("Learning Progress Report", 14, 22);
    doc.setFontSize(12);
    doc.text(`Student Name: ${student.name}`, 14, 32);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 38);
  }
  
  if (completedOutcomes.length === 0) {
    doc.text("No learning outcomes have been marked as completed yet.", 14, startY + 5);
  } else {
    const tableData = completedOutcomes.map(o => [
      o.level.split(":")[0], // just the level name to save space
      o.module.split(":")[0], 
      o.text,
      o.completed_date ? new Date(o.completed_date).toLocaleDateString() : ""
    ]);
    
    autoTable(doc, {
      startY: startY,
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

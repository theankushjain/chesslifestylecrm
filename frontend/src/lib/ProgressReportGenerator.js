import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { api } from "@/lib/api";

function loadImageAsPNG(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const naturalW = img.naturalWidth || img.width || 512;
        const naturalH = img.naturalHeight || img.height || 512;
        canvas.width = naturalW;
        canvas.height = naturalH;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, naturalW, naturalH);
        resolve({
          dataUrl: canvas.toDataURL("image/png"),
          width: naturalW,
          height: naturalH,
          aspectRatio: naturalW / naturalH,
        });
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
  const completedOutcomes = (outcomes || []).filter((o) => o.completed);

  // 1. Load brand logo
  const brandLogo = await loadImageAsPNG("/favicon.svg");

  // 2. Load institution logo if student is enrolled in an institution
  let instLogoUrl = student.institute_logo || null;
  let instName = student.institute_name || "";

  if (!instLogoUrl && student.institute_id) {
    try {
      const res = await api.get(`/institutes/${student.institute_id}`);
      if (res.data?.logo_url) {
        instLogoUrl = res.data.logo_url;
      }
      if (!instName && res.data?.name) {
        instName = res.data.name;
      }
    } catch {}
  }

  const instLogo = instLogoUrl ? await loadImageAsPNG(instLogoUrl) : null;

  let startY = 48;

  // Header Layout
  if (brandLogo) {
    doc.addImage(brandLogo.dataUrl, "PNG", 14, 11, 16, 16);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Learning Progress Report", 34, 19);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Student Name: ${student.name}`, 34, 27);
    if (instName) {
      doc.setFontSize(9.5);
      doc.setTextColor(80);
      doc.text(`Institution: ${instName}`, 34, 33);
      doc.setTextColor(0);
    }
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 120, 27);

    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text("TheChessLifestyle.com - life is a chess game, learn to checkmate", 14, 41);
    doc.setTextColor(0);
    startY = 48;
  } else {
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Learning Progress Report", 14, 20);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Student Name: ${student.name}`, 14, 29);
    if (instName) {
      doc.setFontSize(9.5);
      doc.setTextColor(80);
      doc.text(`Institution: ${instName}`, 14, 35);
      doc.setTextColor(0);
    }
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 120, 29);
    startY = 45;
  }

  // Draw Institution Logo on top-right if present
  if (instLogo) {
    let w = 24;
    let h = 24 / instLogo.aspectRatio;
    if (h > 18) {
      h = 18;
      w = 18 * instLogo.aspectRatio;
    }
    if (w > 32) {
      w = 32;
      h = 32 / instLogo.aspectRatio;
    }
    const x = 196 - w; // right-aligned with 14mm right margin
    const y = 11;
    doc.addImage(instLogo.dataUrl, "PNG", x, y, w, h);

    if (instName) {
      doc.setFontSize(7.5);
      doc.setTextColor(120);
      doc.text(instName, x + w / 2, y + h + 3.5, { align: "center" });
      doc.setTextColor(0);
    }
  }

  if (completedOutcomes.length === 0) {
    doc.setFontSize(10);
    doc.text("No learning outcomes have been marked as completed yet.", 14, startY + 5);
  } else {
    const tableData = completedOutcomes.map((o) => [
      o.level.split(":")[0],
      o.module.split(":")[0],
      o.text,
      o.completed_date ? new Date(o.completed_date).toLocaleDateString() : "",
    ]);

    autoTable(doc, {
      startY: startY,
      head: [["Level", "Module", "Learning Outcome", "Completed"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 10, cellPadding: 4 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 25 },
        2: { cellWidth: "auto" },
        3: { cellWidth: 35, textColor: [249, 115, 22], fontStyle: "bold" },
      },
    });
  }

  doc.save(`${student.name.replace(/\s+/g, "_")}_Progress_Report.pdf`);
}

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { toast } from "sonner";

export function generatePDF({ title, filename, head, body, orientation = "portrait", summary = [] }) {
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

    let startY = 45;
    if (summary && summary.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(0);
      summary.forEach(line => {
        doc.text(line, 14, startY);
        startY += 6;
      });
      startY += 4;
    }

    // Add table
    autoTable(doc, {
      startY,
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

/**
 * Generate comprehensive month-wise fee collection report
 */
export function generateMonthWiseFeesPDF({
  monthlySummary = [],
  detailedPayments = null,
  selectedMonthName = "All Months",
  totals = { totalCollected: 0, totalPending: 0, totalExpected: 0 }
}) {
  try {
    const doc = new jsPDF({ orientation: "portrait" });

    // Branding header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(27, 36, 50);
    doc.text("The Chess Lifestyle", 14, 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(245, 139, 16); // Brand amber
    doc.text("Monthly Fee Collection & Earnings Report", 14, 26);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), "PPpp")} | Scope: ${selectedMonthName}`, 14, 32);

    // Summary Box
    doc.setDrawColor(220, 225, 230);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 36, 182, 22, 2, 2, "FD");

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("TOTAL COLLECTED (EARNINGS)", 20, 43);
    doc.text("TOTAL PENDING DUES", 85, 43);
    doc.text("TOTAL BILLED AMOUNT", 145, 43);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129); // green
    doc.text(`Rs. ${totals.totalCollected.toLocaleString("en-IN")}`, 20, 52);

    doc.setTextColor(239, 68, 68); // red
    doc.text(`Rs. ${totals.totalPending.toLocaleString("en-IN")}`, 85, 52);

    doc.setTextColor(30, 41, 59); // slate
    doc.text(`Rs. ${totals.totalExpected.toLocaleString("en-IN")}`, 145, 52);

    let currentY = 64;

    // Table 1: Month-wise Earnings Breakdown
    if (monthlySummary.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("Month-by-Month Earnings Breakdown", 14, currentY);
      currentY += 4;

      const summaryHead = ["Month & Year", "Billed (Rs)", "Collected (Rs)", "Pending (Rs)", "Paid / Total", "Rate"];
      const summaryBody = monthlySummary.map(m => [
        m.monthYear,
        m.expected.toLocaleString("en-IN"),
        m.collected.toLocaleString("en-IN"),
        m.pending.toLocaleString("en-IN"),
        `${m.paidCount} / ${m.totalCount}`,
        `${m.rate}%`
      ]);

      // Add totals row
      const overallRate = totals.totalExpected > 0 ? ((totals.totalCollected / totals.totalExpected) * 100).toFixed(1) : "0.0";
      summaryBody.push([
        "TOTAL",
        totals.totalExpected.toLocaleString("en-IN"),
        totals.totalCollected.toLocaleString("en-IN"),
        totals.totalPending.toLocaleString("en-IN"),
        "-",
        `${overallRate}%`
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [summaryHead],
        body: summaryBody,
        theme: "striped",
        headStyles: { fillColor: [27, 36, 50], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 8.5, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 35 },
          1: { halign: "right" },
          2: { halign: "right", fontStyle: "bold", textColor: [16, 140, 100] },
          3: { halign: "right", textColor: [200, 30, 30] },
          4: { halign: "center" },
          5: { halign: "center", fontStyle: "bold" },
        },
        didParseCell: (data) => {
          if (data.row.index === summaryBody.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [241, 245, 249];
          }
        }
      });

      currentY = doc.lastAutoTable.finalY + 12;
    }

    // Table 2: Detailed student list (if requested / selected month)
    if (detailedPayments && detailedPayments.length > 0) {
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`Student Payment Ledger - ${selectedMonthName}`, 14, currentY);
      currentY += 4;

      const detailHead = ["Student Name", "Campus/Institute", "Fee Month", "Amount (Rs)", "Status", "Payment Method", "Notes"];
      const detailBody = detailedPayments.map(p => [
        p.studentName || "-",
        p.instituteName || "Direct Enrollment",
        p.feeMonth || "-",
        p.amount.toLocaleString("en-IN"),
        p.status.toUpperCase(),
        p.method || (p.status === "paid" ? "Recorded" : "-"),
        p.notes || "-"
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [detailHead],
        body: detailBody,
        theme: "striped",
        headStyles: { fillColor: [40, 50, 65], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 36 },
          1: { cellWidth: 30 },
          2: { cellWidth: 22 },
          3: { halign: "right", fontStyle: "bold", cellWidth: 22 },
          4: { halign: "center", cellWidth: 18 },
          5: { cellWidth: 24 },
          6: { cellWidth: 30 },
        },
      });
    }

    const safeName = `fees_monthwise_report_${selectedMonthName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
    doc.save(safeName);
    toast.success("Month-wise fees report downloaded");
  } catch (err) {
    console.error("Month-wise Fees PDF error:", err);
    toast.error("Failed to generate PDF report.");
  }
}

/**
 * Generate comprehensive month-wise financial tally P&L statement
 */
export function generateMonthWiseTallyPDF({
  year,
  summary,
  categoryBreakdown = {},
  founderBalances = {}
}) {
  try {
    const doc = new jsPDF({ orientation: "portrait" });

    // Branding header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(27, 36, 50);
    doc.text("The Chess Lifestyle", 14, 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(245, 139, 16); // Brand amber
    doc.text(`Financial Tally & Month-wise P&L Statement - FY ${year}`, 14, 26);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), "PPpp")}`, 14, 32);

    // Financial KPI Summary Cards
    doc.setDrawColor(220, 225, 230);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 36, 182, 22, 2, 2, "FD");

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("TOTAL REVENUE (EARNINGS)", 18, 43);
    doc.text("TOTAL SPENDINGS", 76, 43);
    doc.text("NET PROFIT / LOSS", 125, 43);
    doc.text("PROFIT MARGIN", 166, 43);

    const totalRev = summary?.total_income || 0;
    const totalExp = summary?.total_expense || 0;
    const netProf = summary?.net_profit || 0;
    const margin = totalRev > 0 ? ((netProf / totalRev) * 100).toFixed(1) : "0.0";

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129); // green
    doc.text(`Rs. ${totalRev.toLocaleString("en-IN")}`, 18, 52);

    doc.setTextColor(239, 68, 68); // red
    doc.text(`Rs. ${totalExp.toLocaleString("en-IN")}`, 76, 52);

    doc.setTextColor(netProf >= 0 ? 16 : 239, netProf >= 0 ? 185 : 68, netProf >= 0 ? 129 : 68);
    doc.text(`Rs. ${netProf.toLocaleString("en-IN")}`, 125, 52);

    doc.setTextColor(30, 41, 59);
    doc.text(`${margin}%`, 166, 52);

    let currentY = 64;

    // Table 1: Month-wise Performance Table
    const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthlyData = summary?.monthly_data || [];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`Month-wise Financial Statement (${year})`, 14, currentY);
    currentY += 4;

    const tableHead = ["Month", "Student Fees (Rs)", "Other Income (Rs)", "Total Revenue (Rs)", "Spendings (Rs)", "Net Profit (Rs)", "Margin"];
    const tableBody = monthlyData.map((m, idx) => {
      const fees = m.fees_income !== undefined ? m.fees_income : (m.income || 0);
      const other = m.manual_income !== undefined ? m.manual_income : 0;
      const rev = m.income || (fees + other);
      const exp = m.expense || 0;
      const profit = m.profit !== undefined ? m.profit : (rev - exp);
      const mMargin = rev > 0 ? ((profit / rev) * 100).toFixed(1) + "%" : "-";
      return [
        MONTH_NAMES[idx] || `Month ${m.month}`,
        fees.toLocaleString("en-IN"),
        other.toLocaleString("en-IN"),
        rev.toLocaleString("en-IN"),
        exp.toLocaleString("en-IN"),
        (profit >= 0 ? "+" : "") + profit.toLocaleString("en-IN"),
        mMargin
      ];
    });

    // Add Year Totals row
    tableBody.push([
      "FULL YEAR TOTAL",
      (summary?.payment_revenue || 0).toLocaleString("en-IN"),
      (summary?.manual_income || 0).toLocaleString("en-IN"),
      totalRev.toLocaleString("en-IN"),
      totalExp.toLocaleString("en-IN"),
      (netProf >= 0 ? "+" : "") + netProf.toLocaleString("en-IN"),
      `${margin}%`
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [tableHead],
      body: tableBody,
      theme: "striped",
      headStyles: { fillColor: [27, 36, 50], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 8, cellPadding: 2.8 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 28 },
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right", fontStyle: "bold", textColor: [16, 140, 100] },
        4: { halign: "right", textColor: [200, 30, 30] },
        5: { halign: "right", fontStyle: "bold" },
        6: { halign: "center" },
      },
      didParseCell: (data) => {
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [241, 245, 249];
        }
      }
    });

    currentY = doc.lastAutoTable.finalY + 12;

    // Table 2: Spendings by Category & Founder Balances
    if (currentY > 210) {
      doc.addPage();
      currentY = 20;
    }

    // Expense Category Breakdown
    const catEntries = Object.entries(categoryBreakdown);
    if (catEntries.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("Expense Breakdown by Category", 14, currentY);
      currentY += 4;

      const catHead = ["Expense Category", "Total Spent (Rs)", "% of Total Expenses"];
      const catBody = catEntries
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amt]) => [
          cat,
          amt.toLocaleString("en-IN"),
          totalExp > 0 ? ((amt / totalExp) * 100).toFixed(1) + "%" : "0%"
        ]);

      autoTable(doc, {
        startY: currentY,
        head: [catHead],
        body: catBody,
        theme: "striped",
        headStyles: { fillColor: [40, 50, 65], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 60 },
          1: { halign: "right", cellWidth: 40 },
          2: { halign: "center", cellWidth: 35 },
        }
      });

      currentY = doc.lastAutoTable.finalY + 12;
    }

    // Founder Balances
    const fEntries = Object.entries(founderBalances);
    if (fEntries.length > 0) {
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("Founder Investment & Repayment Balances", 14, currentY);
      currentY += 4;

      const fHead = ["Founder", "Invested (Rs)", "Repaid (Rs)", "Current Pending (Rs)"];
      const fBody = fEntries.map(([founder, data]) => [
        founder,
        data.invested.toLocaleString("en-IN"),
        data.repaid.toLocaleString("en-IN"),
        data.pending.toLocaleString("en-IN")
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [fHead],
        body: fBody,
        theme: "striped",
        headStyles: { fillColor: [40, 50, 65], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 50 },
          1: { halign: "right", fontStyle: "bold", textColor: [16, 140, 100], cellWidth: 40 },
          2: { halign: "right", cellWidth: 40 },
          3: { halign: "right", fontStyle: "bold", textColor: [245, 139, 16], cellWidth: 40 },
        }
      });
    }

    doc.save(`financial_tally_report_${year}.pdf`);
    toast.success("Month-wise financial report downloaded");
  } catch (err) {
    console.error("Month-wise Tally PDF error:", err);
    toast.error("Failed to generate financial PDF report.");
  }
}

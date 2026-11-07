import { useEffect, useState, useMemo } from "react";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2,
  IndianRupee,
  Trash2,
  Wand2,
  FileText,
  Plus,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TableProperties,
  FileSpreadsheet,
  TrendingUp,
  Percent
} from "lucide-react";
import { WhatsappIcon } from "@/components/crm/WhatsappIcon";
import { openWhatsapp, studentReminderMessage } from "@/lib/whatsapp";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { generatePDF, generateMonthWiseFeesPDF } from "@/lib/pdfExport";
import { exportToCSV } from "@/lib/export";
import { MarkPaidDialog } from "@/components/crm/MarkPaidDialog";
import { AddFeeDialog } from "@/components/crm/AddFeeDialog";
import { GenerateFeesDialog } from "@/components/crm/GenerateFeesDialog";
import { GenerateInvoiceDialog } from "@/components/crm/GenerateInvoiceDialog";

export default function Payments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState({});
  const [studentsList, setStudentsList] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [generateFeesOpen, setGenerateFeesOpen] = useState(false);
  const [paymentToMark, setPaymentToMark] = useState(null);
  const [addFeeOpen, setAddFeeOpen] = useState(false);
  const [invoicePayment, setInvoicePayment] = useState(null);

  // Month selection state: 'all' or 'YYYY-MM'
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey);
  const [showMonthOverview, setShowMonthOverview] = useState(false);

  const load = async () => {
    const [p, s] = await Promise.all([api.get("/payments"), api.get("/students")]);
    setPayments(p.data);
    setStudentsList(s.data);
    setStudents(Object.fromEntries(s.data.map((x) => [x.id, x])));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Compute available months from payments data
  const availableMonths = useMemo(() => {
    const map = new Map();
    payments.forEach((p) => {
      if (p.year && p.month) {
        const key = `${p.year}-${String(p.month).padStart(2, "0")}`;
        if (!map.has(key)) {
          map.set(key, {
            key,
            year: p.year,
            month: p.month,
            label: `${monthName(p.month)} ${p.year}`,
          });
        }
      }
    });

    if (!map.has(currentMonthKey)) {
      map.set(currentMonthKey, {
        key: currentMonthKey,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        label: `${monthName(now.getMonth() + 1)} ${now.getFullYear()}`,
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [payments, currentMonthKey, now]);

  // Compute month-by-month historical breakdown
  const monthlyBreakdown = useMemo(() => {
    return availableMonths.map((m) => {
      const monthPayments = payments.filter((p) => p.year === m.year && p.month === m.month);
      const collected = monthPayments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
      const pending = monthPayments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
      const expected = collected + pending;
      const paidCount = monthPayments.filter((p) => p.status === "paid").length;
      const totalCount = monthPayments.length;
      const rate = expected > 0 ? ((collected / expected) * 100).toFixed(1) : "0.0";
      return {
        key: m.key,
        monthYear: m.label,
        year: m.year,
        month: m.month,
        expected,
        collected,
        pending,
        paidCount,
        totalCount,
        rate,
      };
    });
  }, [availableMonths, payments]);

  // Selected month object (if not 'all')
  const activeMonthObj = useMemo(() => {
    if (selectedMonthKey === "all") return null;
    return availableMonths.find((m) => m.key === selectedMonthKey) || null;
  }, [selectedMonthKey, availableMonths]);

  // Filtered payments by month and status filter
  const filtered = useMemo(() => {
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();
    return payments.filter((p) => {
      // Month filtering
      if (selectedMonthKey !== "all") {
        if (!activeMonthObj || p.year !== activeMonthObj.year || p.month !== activeMonthObj.month) {
          return false;
        }
      }

      // Status filtering
      if (filter === "unpaid") return p.status === "unpaid" || p.status === "overdue";
      if (filter === "paid") return p.status === "paid";
      if (filter === "this_month") return p.month === curMonth && p.year === curYear;
      return true;
    });
  }, [payments, selectedMonthKey, activeMonthObj, filter, now]);

  const deletePayment = async (pid) => {
    if (!confirm("Are you sure you want to delete this payment record?")) return;
    try {
      await api.delete(`/payments/${pid}`);
      toast.success("Payment deleted");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  // Grand totals across all time
  const grandTotalCollected = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const grandTotalPending = payments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
  const grandTotalExpected = grandTotalCollected + grandTotalPending;

  // Selected month totals (or grand totals if 'all')
  const currentScopeCollected = useMemo(() => {
    if (selectedMonthKey === "all") return grandTotalCollected;
    return payments
      .filter((p) => p.status === "paid" && activeMonthObj && p.year === activeMonthObj.year && p.month === activeMonthObj.month)
      .reduce((s, p) => s + p.amount, 0);
  }, [payments, selectedMonthKey, activeMonthObj, grandTotalCollected]);

  const currentScopePending = useMemo(() => {
    if (selectedMonthKey === "all") return grandTotalPending;
    return payments
      .filter((p) => p.status !== "paid" && activeMonthObj && p.year === activeMonthObj.year && p.month === activeMonthObj.month)
      .reduce((s, p) => s + p.amount, 0);
  }, [payments, selectedMonthKey, activeMonthObj, grandTotalPending]);

  const currentScopeExpected = currentScopeCollected + currentScopePending;
  const currentScopeRate = currentScopeExpected > 0 ? ((currentScopeCollected / currentScopeExpected) * 100).toFixed(1) : "0.0";

  // Cycle through months
  const navigateMonth = (direction) => {
    if (selectedMonthKey === "all") {
      if (availableMonths.length > 0) setSelectedMonthKey(availableMonths[0].key);
      return;
    }
    const idx = availableMonths.findIndex((m) => m.key === selectedMonthKey);
    if (idx === -1) return;
    const nextIdx = idx + direction;
    if (nextIdx >= 0 && nextIdx < availableMonths.length) {
      setSelectedMonthKey(availableMonths[nextIdx].key);
    }
  };

  // ------------------ ADMIN EXPORT HANDLERS ------------------

  // 1. All Months Summary PDF
  const handleExportAllMonthsSummaryPDF = () => {
    generateMonthWiseFeesPDF({
      monthlySummary: monthlyBreakdown,
      selectedMonthName: "All Recorded Months",
      totals: {
        totalCollected: grandTotalCollected,
        totalPending: grandTotalPending,
        totalExpected: grandTotalExpected,
      },
    });
  };

  // 2. All Months Summary CSV
  const handleExportAllMonthsSummaryCSV = () => {
    const csvData = monthlyBreakdown.map((m) => ({
      "Month & Year": m.monthYear,
      "Total Expected (Rs)": m.expected,
      "Collected Earnings (Rs)": m.collected,
      "Pending Dues (Rs)": m.pending,
      "Paid Students": m.paidCount,
      "Total Students": m.totalCount,
      "Collection Rate (%)": `${m.rate}%`,
    }));

    // Add totals row
    csvData.push({
      "Month & Year": "GRAND TOTAL",
      "Total Expected (Rs)": grandTotalExpected,
      "Collected Earnings (Rs)": grandTotalCollected,
      "Pending Dues (Rs)": grandTotalPending,
      "Paid Students": payments.filter((p) => p.status === "paid").length,
      "Total Students": payments.length,
      "Collection Rate (%)": `${grandTotalExpected > 0 ? ((grandTotalCollected / grandTotalExpected) * 100).toFixed(1) : 0}%`,
    });

    exportToCSV(csvData, `fees_monthwise_summary_${now.getFullYear()}.csv`);
    toast.success("Month-wise summary CSV downloaded");
  };

  // 3. Selected Month Detailed Breakdown PDF
  const handleExportSelectedMonthPDF = () => {
    const monthLabel = activeMonthObj ? activeMonthObj.label : "All Time";
    const detailed = filtered.map((p) => {
      const s = students[p.student_id];
      return {
        studentName: s?.name || "Unknown",
        instituteName: s?.institute_name || "Direct Enrollment",
        feeMonth: `${monthName(p.month)} ${p.year}`,
        amount: p.amount,
        status: p.status,
        method: p.method,
        notes: p.notes,
      };
    });

    generateMonthWiseFeesPDF({
      monthlySummary: selectedMonthKey === "all" ? monthlyBreakdown : [],
      detailedPayments: detailed,
      selectedMonthName: monthLabel,
      totals: {
        totalCollected: currentScopeCollected,
        totalPending: currentScopePending,
        totalExpected: currentScopeExpected,
      },
    });
  };

  // 4. Selected Month Detailed Breakdown CSV
  const handleExportSelectedMonthCSV = () => {
    const monthLabel = activeMonthObj ? activeMonthObj.label : "all_time";
    const csvData = filtered.map((p) => {
      const s = students[p.student_id];
      return {
        "Student Name": s?.name || "Unknown",
        "Campus / Institute": s?.institute_name || "Direct Enrollment",
        "Parent Phone": s?.parent_phone || s?.phone || "-",
        "Fee Month": `${monthName(p.month)} ${p.year}`,
        "Amount (Rs)": p.amount,
        "Status": p.status.toUpperCase(),
        "Payment Method": p.method || (p.status === "paid" ? "Recorded" : "-"),
        "Date Paid": p.paid_date ? p.paid_date.split("T")[0] : "-",
        "Notes": p.notes || "",
      };
    });

    exportToCSV(csvData, `fees_detailed_${monthLabel.replace(/\s+/g, "_")}.csv`);
    toast.success("Detailed fee report CSV downloaded");
  };

  // 5. Unpaid Follow-up PDF
  const handleExportUnpaidPDF = () => {
    const unpaidStudents = filtered.filter((p) => p.status !== "paid");
    const head = ["Student Name", "Campus", "Month", "Amount Due (Rs)", "Parent Phone", "Status"];
    const body = unpaidStudents.map((p) => {
      const s = students[p.student_id];
      return [
        s?.name || "?",
        s?.institute_name || "Direct",
        `${monthName(p.month)} ${p.year}`,
        p.amount.toLocaleString("en-IN"),
        s?.parent_phone || s?.phone || "-",
        p.status.toUpperCase(),
      ];
    });

    const monthLabel = activeMonthObj ? activeMonthObj.label : "All Periods";
    generatePDF({
      title: `Unpaid Fees Follow-Up List - ${monthLabel}`,
      filename: `unpaid_fees_${monthLabel.replace(/\s+/g, "_")}.pdf`,
      summary: [
        `Period: ${monthLabel}`,
        `Total Pending Amount: Rs. ${currentScopePending.toLocaleString("en-IN")}`,
        `Total Unpaid Students: ${unpaidStudents.length}`,
        `Below is the prioritized list of students requiring immediate follow-up.`,
      ],
      head,
      body,
      orientation: "portrait",
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="label-over">Ledger & Financials</div>
          <h1 className="text-4xl font-serif font-bold tracking-tight">Fees</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track student fee collection, inspect earnings from previous months, and generate audit reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download Reports Dropdown */}
          {(user?.role === "admin" || user?.role === "institute") && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl h-10 border-primary/20 hover:border-primary/40 text-foreground font-medium shadow-sm">
                  <Download className="w-4 h-4 mr-1.5 text-primary" /> Download Reports
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-1.5">
                <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground px-2 py-1">
                  Month-wise Reports
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={handleExportAllMonthsSummaryPDF} className="cursor-pointer gap-2 py-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-medium text-xs">All Months Summary (PDF)</div>
                    <div className="text-[10px] text-muted-foreground">Historical earnings & collection rate</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportAllMonthsSummaryCSV} className="cursor-pointer gap-2 py-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-medium text-xs">All Months Summary (CSV)</div>
                    <div className="text-[10px] text-muted-foreground">Excel-ready monthly performance</div>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground px-2 py-1">
                  {activeMonthObj ? `${activeMonthObj.label} Detail` : "Current View Detail"}
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={handleExportSelectedMonthPDF} className="cursor-pointer gap-2 py-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-medium text-xs">Selected Month Roster (PDF)</div>
                    <div className="text-[10px] text-muted-foreground">Detailed student fee statuses</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportSelectedMonthCSV} className="cursor-pointer gap-2 py-2">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-medium text-xs">Selected Month Roster (CSV)</div>
                    <div className="text-[10px] text-muted-foreground">Student names, methods, and dues</div>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleExportUnpaidPDF} className="cursor-pointer gap-2 py-2 text-rose-600 focus:text-rose-600">
                  <FileText className="w-4 h-4" />
                  <div>
                    <div className="font-medium text-xs">Unpaid Defaulters List (PDF)</div>
                    <div className="text-[10px] text-muted-foreground">Pending reminders & follow-ups</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {user?.role === "admin" && (
            <>
              <Button onClick={() => setAddFeeOpen(true)} data-testid="add-fee-btn" className="rounded-xl h-10 bg-primary text-primary-foreground shadow-sm">
                <Plus className="w-4 h-4 mr-1.5" /> Add Fee
              </Button>
              <Button variant="outline" onClick={() => setGenerateFeesOpen(true)} data-testid="generate-fees-btn" className="rounded-xl h-10 shadow-sm">
                <Wand2 className="w-4 h-4 mr-1.5" /> Generate Month Fees
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Month Navigation & Previous Months Switcher */}
      <div className="bg-white border border-border/60 shadow-sm rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Month Picker Control */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-muted/40 border border-border/60 rounded-xl p-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={selectedMonthKey === "all" || availableMonths.findIndex((m) => m.key === selectedMonthKey) >= availableMonths.length - 1}
              onClick={() => navigateMonth(1)}
              className="h-8 w-8 rounded-lg"
              title="Previous month in history"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="px-2 min-w-[160px] text-center">
              <Select value={selectedMonthKey} onValueChange={setSelectedMonthKey}>
                <SelectTrigger className="border-0 shadow-none focus:ring-0 h-8 font-medium text-sm text-center">
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-primary inline" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all" className="font-semibold text-primary">
                    All Months (All-Time Ledger)
                  </SelectItem>
                  {availableMonths.map((m) => (
                    <SelectItem key={m.key} value={m.key}>
                      {m.label} {m.key === currentMonthKey ? "· Current" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="icon"
              disabled={selectedMonthKey === "all" || availableMonths.findIndex((m) => m.key === selectedMonthKey) <= 0}
              onClick={() => navigateMonth(-1)}
              className="h-8 w-8 rounded-lg"
              title="Next month in history"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {selectedMonthKey !== currentMonthKey && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMonthKey(currentMonthKey)}
              className="h-9 text-xs text-primary hover:text-primary hover:bg-primary/10 rounded-xl"
            >
              Back to Current Month
            </Button>
          )}

          {selectedMonthKey !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMonthKey("all")}
              className="h-9 text-xs text-muted-foreground hover:text-foreground rounded-xl"
            >
              View All-Time
            </Button>
          )}
        </div>

        {/* Toggle Previous Months Historical Breakdown Table */}
        <div className="flex items-center gap-2">
          <Button
            variant={showMonthOverview ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowMonthOverview(!showMonthOverview)}
            className="rounded-xl h-9 text-xs gap-1.5 ml-auto"
          >
            <TableProperties className="w-3.5 h-3.5 text-primary" />
            {showMonthOverview ? "Hide Month-wise Breakdown" : "View Month-wise Earnings Table"}
          </Button>
        </div>
      </div>

      {/* Month-wise Historical Earnings Breakdown Collapsible Card */}
      {showMonthOverview && (
        <div className="bg-white border border-border/60 shadow-sm rounded-2xl overflow-hidden animate-in fade-in-50">
          <div className="p-4 bg-muted/20 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-medium text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Previous Months Earnings & Collection Performance
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Comparison of billed fees, actual earnings collected, and pending amounts across each recorded month.
              </p>
            </div>
            {(user?.role === "admin" || user?.role === "institute") && (
              <Button variant="outline" size="sm" onClick={handleExportAllMonthsSummaryPDF} className="h-8 text-xs rounded-lg shrink-0">
                <FileText className="w-3.5 h-3.5 mr-1" /> Export Table
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 uppercase tracking-wider text-[10px] text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Month & Year</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Billed Amount</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Earnings Collected</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Pending Dues</th>
                  <th className="py-2.5 px-4 text-center font-semibold">Paid / Total</th>
                  <th className="py-2.5 px-4 text-center font-semibold">Collection Rate</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {monthlyBreakdown.map((m) => (
                  <tr
                    key={m.key}
                    className={`hover:bg-muted/30 transition-colors ${
                      selectedMonthKey === m.key ? "bg-primary/5 font-medium" : ""
                    }`}
                  >
                    <td className="py-3 px-4 font-medium flex items-center gap-2">
                      <span>{m.monthYear}</span>
                      {m.key === currentMonthKey && (
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                          Current
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">₹{m.expected.toLocaleString("en-IN")}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600 font-bold">
                      ₹{m.collected.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-destructive">
                      ₹{m.pending.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {m.paidCount} / {m.totalCount}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          parseFloat(m.rate) >= 80
                            ? "bg-emerald-100 text-emerald-700"
                            : parseFloat(m.rate) >= 50
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {m.rate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant={selectedMonthKey === m.key ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setSelectedMonthKey(m.key)}
                        className="h-7 text-xs rounded-lg"
                      >
                        {selectedMonthKey === m.key ? "Viewing" : "View Month"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/40 font-bold border-t-2 border-border/80">
                <tr>
                  <td className="py-3 px-4 uppercase text-[10px] tracking-wider">Grand Total (All Months)</td>
                  <td className="py-3 px-4 text-right font-mono">₹{grandTotalExpected.toLocaleString("en-IN")}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-600">
                    ₹{grandTotalCollected.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-destructive">
                    ₹{grandTotalPending.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {payments.filter((p) => p.status === "paid").length} / {payments.length}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                      {grandTotalExpected > 0 ? ((grandTotalCollected / grandTotalExpected) * 100).toFixed(1) : 0}%
                    </span>
                  </td>
                  <td className="py-3 px-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* KPI Summary Cards for Selected Scope */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Earnings Card */}
        <div className="bg-white p-5 border border-border/60 shadow-sm rounded-2xl" data-testid="totals-paid">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="label-over text-[10px]">
              {selectedMonthKey === "all" ? "Total Earnings Collected (All-Time)" : `Collected in ${activeMonthObj?.label}`}
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-serif font-bold text-foreground mt-2 flex items-center text-emerald-600">
            <IndianRupee className="w-6 h-6 mr-1" />
            {currentScopeCollected.toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
            <span className="font-semibold text-emerald-600">{currentScopeRate}%</span> of billed total collected
          </div>
        </div>

        {/* Pending Card */}
        <div className="bg-white p-5 border border-border/60 shadow-sm rounded-2xl" data-testid="totals-unpaid">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="label-over text-[10px]">
              {selectedMonthKey === "all" ? "Total Pending Dues (All-Time)" : `Pending in ${activeMonthObj?.label}`}
            </span>
            <IndianRupee className="w-4 h-4 text-destructive" />
          </div>
          <div className="text-3xl font-serif font-bold text-destructive mt-2 flex items-center">
            <IndianRupee className="w-6 h-6 mr-1" />
            {currentScopePending.toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-muted-foreground mt-1.5">
            {filtered.filter((p) => p.status !== "paid").length} students requiring payment follow-up
          </div>
        </div>

        {/* Total Invoiced Card */}
        <div className="bg-white p-5 border border-border/60 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="label-over text-[10px]">
              {selectedMonthKey === "all" ? "Total Invoiced (All-Time)" : `Total Billed for ${activeMonthObj?.label}`}
            </span>
            <Percent className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-serif font-bold text-foreground mt-2 flex items-center">
            <IndianRupee className="w-6 h-6 mr-1" />
            {currentScopeExpected.toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-muted-foreground mt-1.5">
            {filtered.length} fee records in {activeMonthObj ? activeMonthObj.label : "all months"}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-border/60 pb-3">
        <div className="flex gap-1.5 overflow-x-auto">
          {[
            ["all", "All Records"],
            ["unpaid", "Unpaid & Overdue"],
            ["paid", "Paid"],
            ["this_month", "Current Month"],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              data-testid={`filter-${k}`}
              className={`shrink-0 text-xs uppercase tracking-widest px-3.5 py-2 rounded-xl font-medium transition-all ${
                filter === k
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-white border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> records for{" "}
          <span className="font-semibold text-foreground">{activeMonthObj ? activeMonthObj.label : "all months"}</span>
        </div>
      </div>

      {/* Payments List */}
      {loading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">Loading payments...</div>
      ) : (
        <div className="bg-white border border-border/60 shadow-sm rounded-2xl divide-y divide-border/60 overflow-hidden" data-testid="payments-list">
          {filtered.map((p) => {
            const s = students[p.student_id];
            return (
              <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-muted/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="font-medium flex items-center gap-2 flex-wrap">
                    <span className="text-base text-foreground font-serif">{s?.name || "?"}</span>
                    {s?.institute_name && (
                      <span className="text-[10px] font-normal uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/40">
                        {s.institute_name}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground bg-muted/60 px-2 py-0.5 rounded">
                      {monthName(p.month)} {p.year}
                    </span>
                    <span>·</span>
                    <span className="font-mono font-semibold text-sm text-foreground">₹{p.amount.toLocaleString("en-IN")}</span>
                    {p.paid_date && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-700">Paid on {p.paid_date.split("T")[0]}</span>
                      </>
                    )}
                    {p.notes && <span className="italic text-slate-500">· {p.notes}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center flex-wrap justify-end">
                  {/* Send Invoice Button for every student */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setInvoicePayment(p)}
                    data-testid={`invoice-${p.id}`}
                    className="rounded-xl h-8 text-xs font-medium border-border/60 hover:border-primary/50 hover:bg-primary/5 gap-1.5"
                    title={`Send or generate invoice for ${s?.name || "student"}`}
                  >
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Send Invoice
                  </Button>

                  {p.status === "paid" ? (
                    <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4" /> Paid {p.method ? `· ${p.method}` : ""}
                    </div>
                  ) : (
                    <>
                      <span
                        className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-lg font-bold ${
                          p.status === "overdue"
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-warning text-white"
                        }`}
                      >
                        {p.status}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPaymentToMark(p)}
                        data-testid={`pay-${p.id}`}
                        className="rounded-xl h-8 text-xs font-medium"
                      >
                        Mark paid
                      </Button>
                      {(s?.parent_phone || s?.phone) && (
                        <button
                          onClick={() => openWhatsapp(s.parent_phone || s.phone, studentReminderMessage(s, p))}
                          className="p-2 border border-border/40 shadow-sm rounded-xl text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                          title="Send WhatsApp Reminder"
                        >
                          <WhatsappIcon className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                  {user?.role === "admin" && (
                    <button
                      onClick={() => deletePayment(p.id)}
                      className="p-2 ml-1 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                      title="Delete Payment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
              <p>No payment records found for the selected month and filter.</p>
              {selectedMonthKey !== "all" && (
                <Button variant="outline" size="sm" onClick={() => setSelectedMonthKey("all")} className="rounded-xl text-xs">
                  View All-Time Payments
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <MarkPaidDialog
        open={!!paymentToMark}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPaymentToMark(null);
        }}
        payment={paymentToMark}
        studentName={students[paymentToMark?.student_id]?.name || "Student"}
        onSuccess={load}
      />

      <AddFeeDialog
        open={addFeeOpen}
        onOpenChange={setAddFeeOpen}
        students={studentsList}
        existingPayments={payments}
        onSuccess={load}
      />

      <GenerateFeesDialog
        open={generateFeesOpen}
        onOpenChange={setGenerateFeesOpen}
        students={studentsList}
        onSuccess={load}
      />

      <GenerateInvoiceDialog
        open={!!invoicePayment}
        onOpenChange={(isOpen) => {
          if (!isOpen) setInvoicePayment(null);
        }}
        student={students[invoicePayment?.student_id]}
        payment={invoicePayment}
      />
    </div>
  );
}

const monthName = (m) =>
  ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];

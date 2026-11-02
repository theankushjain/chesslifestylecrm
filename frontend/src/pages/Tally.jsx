import { useState, useEffect, useCallback } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import {
  Trash2,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Wallet,
  Download,
  FileText,
  FileSpreadsheet,
  Calendar,
  PieChart,
  Layers
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { generateMonthWiseTallyPDF } from "@/lib/pdfExport";
import { exportToCSV } from "@/lib/export";

const FOUNDERS = ["Ankush", "Chirag"];
const CATEGORIES = ["Salary", "Investment", "Repayment", "Operations", "Marketing", "Software", "Rent", "Other"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Tally() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const [form, setForm] = useState({
    type: "expense",
    category: "Operations",
    amount: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    investor: "none",
  });

  const loadData = useCallback(async (yr = selectedYear) => {
    try {
      const [sumRes, txRes] = await Promise.all([
        api.get(`/tally/summary?year=${yr}`),
        api.get("/transactions")
      ]);
      setSummary(sumRes.data);
      setTransactions(txRes.data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadData(selectedYear);
  }, [selectedYear, loadData]);

  const handleAddInvestmentClick = () => {
    setActiveTab("transactions");
    setForm(f => ({ ...f, type: "income", category: "Investment" }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        investor: form.investor === "none" ? null : form.investor
      };
      await api.post("/transactions", payload);
      toast.success("Transaction added");
      setForm({ ...form, amount: "", description: "" });
      loadData(selectedYear);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await api.delete(`/transactions/${id}`);
      toast.success("Transaction deleted");
      loadData(selectedYear);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  // ------------------ ADMIN EXPORT HANDLERS ------------------

  // 1. Month-wise Financial Report PDF
  const handleExportMonthWiseTallyPDF = () => {
    generateMonthWiseTallyPDF({
      year: selectedYear,
      summary,
      categoryBreakdown: summary?.category_breakdown || {},
      founderBalances: summary?.founder_balances || {}
    });
  };

  // 2. Month-wise Financial Statement CSV
  const handleExportMonthWiseTallyCSV = () => {
    const monthlyData = summary?.monthly_data || [];
    const csvData = monthlyData.map((m, idx) => {
      const fees = m.fees_income !== undefined ? m.fees_income : (m.income || 0);
      const other = m.manual_income !== undefined ? m.manual_income : 0;
      const rev = m.income || (fees + other);
      const exp = m.expense || 0;
      const profit = m.profit !== undefined ? m.profit : (rev - exp);
      const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) + "%" : "0.0%";
      return {
        "Month": MONTH_NAMES[idx] || `Month ${m.month}`,
        "Student Fees (Rs)": fees,
        "Other Income (Rs)": other,
        "Total Revenue (Rs)": rev,
        "Spendings (Rs)": exp,
        "Net Profit (Rs)": profit,
        "Profit Margin": margin
      };
    });

    const totRev = summary?.total_income || 0;
    const totExp = summary?.total_expense || 0;
    const netProf = summary?.net_profit || 0;
    csvData.push({
      "Month": "FULL YEAR TOTAL",
      "Student Fees (Rs)": summary?.payment_revenue || 0,
      "Other Income (Rs)": summary?.manual_income || 0,
      "Total Revenue (Rs)": totRev,
      "Spendings (Rs)": totExp,
      "Net Profit (Rs)": netProf,
      "Profit Margin": totRev > 0 ? ((netProf / totRev) * 100).toFixed(1) + "%" : "0.0%"
    });

    exportToCSV(csvData, `financial_tally_monthwise_${selectedYear}.csv`);
    toast.success("Month-wise financial statement CSV downloaded");
  };

  // 3. Transactions Ledger CSV
  const handleExportTransactionsCSV = () => {
    const filteredTx = transactions.filter(t => t.date && t.date.startsWith(`${selectedYear}-`));
    const listToExport = filteredTx.length > 0 ? filteredTx : transactions;
    const csvData = listToExport.map(t => ({
      "Date": t.date,
      "Type": t.type.toUpperCase(),
      "Category": t.category,
      "Description": t.description || "",
      "Founder / Investor": t.investor || "-",
      "Amount (Rs)": t.amount
    }));

    exportToCSV(csvData, `transactions_ledger_${selectedYear}.csv`);
    toast.success("Transactions ledger CSV downloaded");
  };

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading financials...</div>;

  const availableYears = summary?.available_years && summary.available_years.length > 0
    ? summary.available_years
    : [currentYear, currentYear - 1];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in">
      {/* Header with Title and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="label-over">Accounting & Cash Flow</div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Financial Tally</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review earnings from previous months, track business spendings, founder capital, and net profit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year Selector */}
          <div className="flex items-center gap-2 bg-white border border-border/60 shadow-sm rounded-xl px-3 py-1">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs font-medium text-muted-foreground">Year:</span>
            <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(parseInt(val, 10))}>
              <SelectTrigger className="border-0 shadow-none focus:ring-0 h-8 font-semibold text-sm w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((yr) => (
                  <SelectItem key={yr} value={String(yr)}>
                    {yr} {yr === currentYear ? "(Current)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Admin Download Reports Dropdown */}
          {user?.role === "admin" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl h-10 border-primary/20 hover:border-primary/40 font-medium shadow-sm">
                  <Download className="w-4 h-4 mr-1.5 text-primary" /> Download Report
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-1.5">
                <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground px-2 py-1">
                  Financial Reports ({selectedYear})
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={handleExportMonthWiseTallyPDF} className="cursor-pointer gap-2 py-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-medium text-xs">P&L & Month-wise PDF</div>
                    <div className="text-[10px] text-muted-foreground">Full income, expense & margin report</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportMonthWiseTallyCSV} className="cursor-pointer gap-2 py-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-medium text-xs">Month-wise Statement (CSV)</div>
                    <div className="text-[10px] text-muted-foreground">Excel-ready breakdown by month</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportTransactionsCSV} className="cursor-pointer gap-2 py-2">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-medium text-xs">Transactions Ledger (CSV)</div>
                    <div className="text-[10px] text-muted-foreground">Full audit log of expenses & income</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg">Financial Overview</TabsTrigger>
          <TabsTrigger value="transactions" className="rounded-lg">Transactions Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Revenue ({selectedYear})</CardTitle>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-serif font-bold text-emerald-600">
                  ₹{summary?.total_income?.toLocaleString("en-IN")}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                  <span>Student fees: ₹{(summary?.payment_revenue || 0).toLocaleString("en-IN")}</span>
                  {summary?.manual_income > 0 && <span>Other: ₹{summary.manual_income.toLocaleString("en-IN")}</span>}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Spendings ({selectedYear})</CardTitle>
                <TrendingDown className="w-4 h-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-serif font-bold text-rose-600">
                  ₹{summary?.total_expense?.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Salaries, operations, marketing, software, rent</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Net Profit / Loss ({selectedYear})</CardTitle>
                <Wallet className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-serif font-bold ${summary?.net_profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  ₹{summary?.net_profit?.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary?.total_income > 0
                    ? `Profit Margin: ${((summary.net_profit / summary.total_income) * 100).toFixed(1)}%`
                    : "Revenue minus spendings"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Month-wise Financial Statement & Earnings Table */}
          <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 bg-muted/20 border-b border-border/60">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Month-wise Earnings & P&L Statement ({selectedYear})
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Detailed month-by-month record of student fee collections, manual earnings, expenses, and net profit.
                </CardDescription>
              </div>
              {user?.role === "admin" && (
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  <Button variant="outline" size="sm" onClick={handleExportMonthWiseTallyPDF} className="h-8 text-xs rounded-lg">
                    <FileText className="w-3.5 h-3.5 mr-1 text-emerald-600" /> PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportMonthWiseTallyCSV} className="h-8 text-xs rounded-lg">
                    <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-primary" /> CSV
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 uppercase tracking-wider text-[10px] text-muted-foreground border-b border-border/60">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Month</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Student Fees</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Other Income</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Total Revenue (Earnings)</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Spendings</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Net Profit</th>
                      <th className="py-2.5 px-4 text-center font-semibold">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {(summary?.monthly_data || []).map((m, idx) => {
                      const fees = m.fees_income !== undefined ? m.fees_income : (m.income || 0);
                      const other = m.manual_income !== undefined ? m.manual_income : 0;
                      const rev = m.income || (fees + other);
                      const exp = m.expense || 0;
                      const profit = m.profit !== undefined ? m.profit : (rev - exp);
                      const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : "0.0";
                      const isCurrentMonth = selectedYear === currentYear && m.month === new Date().getMonth() + 1;

                      return (
                        <tr key={m.month} className={`hover:bg-muted/30 transition-colors ${isCurrentMonth ? "bg-primary/5 font-medium" : ""}`}>
                          <td className="py-3 px-4 font-medium flex items-center gap-2">
                            <span>{MONTH_NAMES[idx] || `Month ${m.month}`}</span>
                            {isCurrentMonth && (
                              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                                Current
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">₹{fees.toLocaleString("en-IN")}</td>
                          <td className="py-3 px-4 text-right font-mono text-muted-foreground">₹{other.toLocaleString("en-IN")}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                            ₹{rev.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-rose-600">
                            ₹{exp.toLocaleString("en-IN")}
                          </td>
                          <td className={`py-3 px-4 text-right font-mono font-bold ${profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {profit >= 0 ? "+" : ""}₹{profit.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {rev > 0 ? (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                profit >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                              }`}>
                                {margin}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-muted/40 font-bold border-t-2 border-border/80">
                    <tr>
                      <td className="py-3 px-4 uppercase text-[10px] tracking-wider">Full Year Total</td>
                      <td className="py-3 px-4 text-right font-mono">₹{(summary?.payment_revenue || 0).toLocaleString("en-IN")}</td>
                      <td className="py-3 px-4 text-right font-mono">₹{(summary?.manual_income || 0).toLocaleString("en-IN")}</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600">₹{(summary?.total_income || 0).toLocaleString("en-IN")}</td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600">₹{(summary?.total_expense || 0).toLocaleString("en-IN")}</td>
                      <td className={`py-3 px-4 text-right font-mono ${(summary?.net_profit || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {(summary?.net_profit || 0) >= 0 ? "+" : ""}₹{(summary?.net_profit || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                          {summary?.total_income > 0 ? ((summary.net_profit / summary.total_income) * 100).toFixed(1) : 0}%
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Visual Cash Flow Chart and Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Cash Flow Chart ({selectedYear})</CardTitle>
                <CardDescription className="text-xs">Income vs Spendings monthly visualization</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary?.monthly_data || []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="month" tickFormatter={(m) => format(new Date(2024, m - 1, 1), "MMM")} />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="income" fill="#10b981" name="Income (₹)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="#f43f5e" name="Expense (₹)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-semibold">Founder Investment Ledger</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Track capital injected and pending repayments.</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={handleAddInvestmentClick} className="shrink-0 rounded-xl text-xs">
                  + Add Entry
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Founder</TableHead>
                      <TableHead className="text-right">Invested</TableHead>
                      <TableHead className="text-right">Repaid</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(summary?.founder_balances || {}).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No founder investments recorded yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      Object.entries(summary.founder_balances).map(([name, data]) => (
                        <TableRow key={name}>
                          <TableCell className="font-medium">{name}</TableCell>
                          <TableCell className="text-right text-emerald-600 font-medium">₹{data.invested.toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-right">₹{data.repaid.toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-right font-bold text-primary">₹{data.pending.toLocaleString("en-IN")}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Expense Categories summary if available */}
                {summary?.category_breakdown && Object.keys(summary.category_breakdown).length > 0 && (
                  <div className="mt-6 pt-4 border-t border-border/60">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <PieChart className="w-3.5 h-3.5 text-primary" />
                      Expense Categories Breakdown ({selectedYear})
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(summary.category_breakdown)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, amt]) => (
                          <div key={cat} className="flex items-center justify-between bg-muted/30 px-2.5 py-1.5 rounded-lg">
                            <span className="text-muted-foreground">{cat}</span>
                            <span className="font-mono font-medium">₹{amt.toLocaleString("en-IN")}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Add Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-stretch md:items-end">
                <div className="space-y-1.5 flex-1">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 flex-1">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {(form.category === "Investment" || form.category === "Repayment") && (
                  <div className="space-y-1.5 flex-1">
                    <Label>Founder</Label>
                    <Select value={form.investor} onValueChange={(v) => setForm({ ...form, investor: v })}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Select --</SelectItem>
                        {FOUNDERS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5 flex-1">
                  <Label>Amount (₹)</Label>
                  <Input type="number" required min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" className="rounded-xl" />
                </div>

                <div className="space-y-1.5 flex-[1.5]">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes..." className="rounded-xl" />
                </div>

                <div className="space-y-1.5 flex-1">
                  <Label>Date</Label>
                  <Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-xl" />
                </div>

                <Button type="submit" className="rounded-xl mb-[2px]">Save</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3 bg-muted/20 border-b border-border/60">
              <div>
                <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
                <CardDescription className="text-xs">Ledger of all business inflows and expenditures</CardDescription>
              </div>
              {user?.role === "admin" && (
                <Button variant="outline" size="sm" onClick={handleExportTransactionsCSV} className="rounded-xl text-xs">
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-primary" /> Export CSV
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description / Founder</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-muted-foreground font-mono text-xs">{tx.date}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {tx.type}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{tx.category}</TableCell>
                      <TableCell>
                        {tx.description}
                        {tx.investor && <span className="ml-2 text-xs text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded">[{tx.investor}]</span>}
                      </TableCell>
                      <TableCell className={`text-right font-medium font-mono ${tx.type === 'income' ? 'text-emerald-600' : 'text-foreground'}`}>
                        {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500 rounded-lg" onClick={() => handleDelete(tx.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No transactions found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

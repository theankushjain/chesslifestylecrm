import { useState, useEffect } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { Trash2, IndianRupee, TrendingUp, TrendingDown, Wallet } from "lucide-react";

const FOUNDERS = ["Ankush", "Founder 2", "Founder 3"];
const CATEGORIES = ["Salary", "Investment", "Repayment", "Operations", "Marketing", "Software", "Rent", "Other"];

export default function Tally() {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    type: "expense",
    category: "Operations",
    amount: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    investor: "none",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sumRes, txRes] = await Promise.all([
        api.get("/tally/summary"),
        api.get("/transactions")
      ]);
      setSummary(sumRes.data);
      setTransactions(txRes.data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
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
      loadData();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await api.delete(`/transactions/${id}`);
      toast.success("Transaction deleted");
      loadData();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in">
      <div>
        <h1 className="text-3xl font-serif font-semibold tracking-tight">Financial Tally</h1>
        <p className="text-muted-foreground mt-1">Track investments, salaries, and overall business cash flow.</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{summary?.total_income?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Includes student fees and manual income</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Total Spendings</CardTitle>
                <TrendingDown className="w-4 h-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{summary?.total_expense?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Salaries, ops, and repayments</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <Wallet className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary?.net_profit >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  ₹{summary?.net_profit?.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Revenue minus spendings</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Overview</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary?.monthly_data || []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="month" tickFormatter={(m) => format(new Date(2024, m - 1, 1), "MMM")} />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="#f43f5e" name="Expense" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Founder Investment Ledger</CardTitle>
                <CardDescription>Track capital injected and pending repayments.</CardDescription>
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
                          <TableCell className="text-right text-emerald-500 font-medium">₹{data.invested.toLocaleString()}</TableCell>
                          <TableCell className="text-right">₹{data.repaid.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-primary">₹{data.pending.toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="space-y-1.5 flex-1">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5 flex-1">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {(form.category === "Investment" || form.category === "Repayment") && (
                  <div className="space-y-1.5 flex-1">
                    <Label>Founder</Label>
                    <Select value={form.investor} onValueChange={(v) => setForm({ ...form, investor: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Select --</SelectItem>
                        {FOUNDERS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5 flex-1">
                  <Label>Amount (₹)</Label>
                  <Input type="number" required min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                </div>
                
                <div className="space-y-1.5 flex-[1.5]">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes..." />
                </div>

                <div className="space-y-1.5 flex-1">
                  <Label>Date</Label>
                  <Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>

                <Button type="submit" className="mb-[2px]">Save</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
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
                      <TableCell className="text-muted-foreground">{tx.date}</TableCell>
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
                      <TableCell className={`text-right font-medium ${tx.type === 'income' ? 'text-emerald-500' : ''}`}>
                        {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500" onClick={() => handleDelete(tx.id)}>
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

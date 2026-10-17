import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IndianRupee,
  Search,
  UserCheck,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Calendar,
  X,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export function AddFeeDialog({
  open,
  onOpenChange,
  students = [],
  existingPayments = [],
  initialStudentId = null,
  onSuccess,
}) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [mode, setMode] = useState("existing"); // "existing" | "new"
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId || "");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Date & Period
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);

  // Payment details
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("paid"); // "paid" | "unpaid"
  const [method, setMethod] = useState("UPI");
  const [paidDate, setPaidDate] = useState(now.toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  // New Student fields (if mode === "new")
  const [newStudent, setNewStudent] = useState({
    name: "",
    phone: "",
    parent_name: "",
    parent_phone: "",
    level: "Beginner",
    monthly_fee: 2500,
    fee_type: "monthly",
    fee_amount: 2500,
    institute_id: "",
    status: "active",
  });
  const [institutes, setInstitutes] = useState([]);
  const [saving, setSaving] = useState(false);

  // Load institutes once
  useEffect(() => {
    if (open) {
      api.get("/institutes").then((res) => setInstitutes(res.data || [])).catch(() => {});
    }
  }, [open]);

  // Handle initialStudentId or open state
  useEffect(() => {
    if (open) {
      if (initialStudentId) {
        setSelectedStudentId(initialStudentId);
        setMode("existing");
      }
      setMonth(currentMonth);
      setYear(currentYear);
      setStatus("paid");
      setMethod("UPI");
      setPaidDate(new Date().toISOString().slice(0, 10));
      setNotes("");
    }
  }, [open, initialStudentId, currentMonth, currentYear]);

  // Selected student object
  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  // Pre-fill amount when student is selected or new student fee changes
  useEffect(() => {
    if (mode === "existing" && selectedStudent) {
      const defaultFee = selectedStudent.fee_amount || selectedStudent.monthly_fee || 0;
      setAmount(String(defaultFee));
    } else if (mode === "new") {
      setAmount(String(newStudent.fee_amount || newStudent.monthly_fee || 2500));
    }
  }, [mode, selectedStudent, newStudent.fee_amount, newStudent.monthly_fee]);

  // Check if payment already exists for this student & period
  const existingRecord = useMemo(() => {
    if (!selectedStudentId) return null;
    return existingPayments.find(
      (p) =>
        p.student_id === selectedStudentId &&
        p.month === Number(month) &&
        p.year === Number(year)
    );
  }, [existingPayments, selectedStudentId, month, year]);

  // Filter students for search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students.slice(0, 8);
    const q = searchQuery.toLowerCase();
    return students
      .filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.phone?.includes(q) ||
          s.parent_phone?.includes(q) ||
          s.institute_name?.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [students, searchQuery]);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const numAmount = parseFloat(amount);
    if (amount === "" || isNaN(numAmount)) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (numAmount < 0) {
      toast.error("Amount cannot be negative");
      return;
    }

    setSaving(true);
    try {
      let finalStudentId = selectedStudentId;

      // If adding a new student first
      if (mode === "new") {
        if (!newStudent.name.trim()) {
          toast.error("Student name is required");
          setSaving(false);
          return;
        }

        const studentPayload = {
          ...newStudent,
          fee_amount: numAmount,
          monthly_fee: numAmount,
        };

        const studentRes = await api.post("/students", studentPayload);
        finalStudentId = studentRes.data.id || studentRes.data._id;
        toast.success(`Student "${newStudent.name}" enrolled`);
      } else {
        if (!finalStudentId) {
          toast.error("Please select a student");
          setSaving(false);
          return;
        }
      }

      // Record payment
      const paymentPayload = {
        student_id: finalStudentId,
        month: Number(month),
        year: Number(year),
        amount: numAmount,
        status: status,
        method: status === "paid" ? method || "UPI" : "",
        paid_date: status === "paid" ? paidDate || new Date().toISOString() : null,
        notes: notes.trim(),
      };

      await api.post("/payments", paymentPayload);

      toast.success(
        status === "paid"
          ? `Recorded payment of ₹${numAmount.toLocaleString("en-IN")}`
          : `Added fee due of ₹${numAmount.toLocaleString("en-IN")}`
      );

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl max-w-lg max-h-[90vh] overflow-y-auto" data-testid="add-fee-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <IndianRupee className="w-5 h-5" />
            </span>
            Add / Record Fee
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Record fee received or schedule a fee due for an existing or newly enrolled student.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Mode Switch (Existing vs New Student) */}
          {!initialStudentId && (
            <div className="flex rounded-xl bg-muted/60 p-1 border border-border/40">
              <button
                type="button"
                onClick={() => setMode("existing")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  mode === "existing"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" /> Existing Student
              </button>
              <button
                type="button"
                onClick={() => setMode("new")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  mode === "new"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" /> + New Student
              </button>
            </div>
          )}

          {/* Student Selection / Creation */}
          {mode === "existing" ? (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest font-semibold block">
                Select Student <span className="text-destructive">*</span>
              </Label>
              {selectedStudent ? (
                <div className="p-3 bg-muted/40 border border-border/60 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm text-foreground flex items-center gap-1.5">
                      <span>{selectedStudent.name}</span>
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        {selectedStudent.institute_name || "Direct Enrollment"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {selectedStudent.phone || selectedStudent.parent_phone || "No phone"} ·{" "}
                      <span className="font-mono">₹{selectedStudent.fee_amount || selectedStudent.monthly_fee || 0}/mo</span>
                    </div>
                  </div>
                  {!initialStudentId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedStudentId("");
                        setSearchQuery("");
                      }}
                      className="h-8 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Change
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search student by name, phone or campus..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 rounded-xl"
                      autoFocus
                    />
                  </div>
                  <div className="border border-border/40 rounded-xl divide-y divide-border/40 max-h-48 overflow-y-auto bg-white shadow-sm">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudentId(s.id);
                            setSearchQuery("");
                          }}
                          className="w-full text-left p-2.5 hover:bg-muted/50 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium text-sm">{s.name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {s.institute_name || "Direct"} · {s.phone || s.parent_phone || "No phone"}
                            </div>
                          </div>
                          <span className="text-xs font-mono text-muted-foreground">
                            ₹{s.fee_amount || s.monthly_fee || 0}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        No students found. Switch to "+ New Student" to enroll.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status Alert for Existing Fee Record */}
              {existingRecord && (
                <div
                  className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                    existingRecord.status === "paid"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                      : "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300"
                  }`}
                >
                  {existingRecord.status === "paid" ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  )}
                  <div>
                    {existingRecord.status === "paid" ? (
                      <span>
                        Fee of <strong>₹{existingRecord.amount}</strong> is already marked as{" "}
                        <strong>PAID</strong> for {MONTHS.find((m) => m.value === Number(month))?.label} {year}.
                      </span>
                    ) : (
                      <span>
                        An unpaid fee record of <strong>₹{existingRecord.amount}</strong> exists for this month.
                        Submitting will update and mark it as <strong>PAID</strong>.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* New Student Form */
            <div className="p-3.5 bg-muted/30 border border-border/60 rounded-xl space-y-3">
              <div className="label-over text-[9px] text-primary">New Student Details</div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-semibold">
                  Student Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  className="rounded-xl mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-widest font-semibold">Student Phone</Label>
                  <Input
                    placeholder="10-digit number"
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                    className="rounded-xl mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-semibold">Parent Phone</Label>
                  <Input
                    placeholder="Parent's number"
                    value={newStudent.parent_phone}
                    onChange={(e) => setNewStudent({ ...newStudent, parent_phone: e.target.value })}
                    className="rounded-xl mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-widest font-semibold">Institute / Campus</Label>
                  <Select
                    value={newStudent.institute_id}
                    onValueChange={(v) => {
                      const inst = institutes.find((i) => i.id === v);
                      setNewStudent({
                        ...newStudent,
                        institute_id: v === "direct" ? "" : v,
                        institute_name: inst ? inst.name : "",
                      });
                    }}
                  >
                    <SelectTrigger className="rounded-xl mt-1">
                      <SelectValue placeholder="Direct / Society" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="direct">Direct Enrollment</SelectItem>
                      {institutes.map((inst) => (
                        <SelectItem key={inst.id} value={inst.id}>
                          {inst.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-semibold">Level</Label>
                  <Select
                    value={newStudent.level}
                    onValueChange={(v) => setNewStudent({ ...newStudent, level: v })}
                  >
                    <SelectTrigger className="rounded-xl mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Month & Year Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest font-semibold mb-1 block">
                Fee Month
              </Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-semibold mb-1 block">
                Year
              </Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment Status (Paid / Unpaid) */}
          <div>
            <Label className="text-xs uppercase tracking-widest font-semibold mb-1.5 block">
              Payment Status
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus("paid")}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  status === "paid"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Fee Received (Paid)
              </button>
              <button
                type="button"
                onClick={() => setStatus("unpaid")}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  status === "unpaid"
                    ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                    : "bg-white border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" /> Due / Pending (Unpaid)
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <Label className="text-xs uppercase tracking-widest font-semibold mb-1 block">
              {status === "paid" ? "Amount Received (₹)" : "Amount Due (₹)"} <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                ₹
              </span>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="2500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7 rounded-xl font-mono text-base"
                required
              />
            </div>
          </div>

          {/* Payment Method & Date (only if Paid) */}
          {status === "paid" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-widest font-semibold mb-1 block">
                  Payment Method
                </Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="UPI">UPI (GPay / PhonePe / Paytm)</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer (NEFT/IMPS)</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-widest font-semibold mb-1 block">
                  Payment Date
                </Label>
                <Input
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
          )}

          {/* Notes / Remarks */}
          <div>
            <Label className="text-xs uppercase tracking-widest font-semibold mb-1 block">
              Notes / Remarks (Optional)
            </Label>
            <Input
              placeholder="e.g. Admission fee, GPay ref #1234..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl text-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || (mode === "existing" && existingRecord?.status === "paid")}
              className="rounded-xl"
            >
              {saving ? "Saving..." : status === "paid" ? "Record Fee Payment" : "Save Fee Record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddFeeDialog;

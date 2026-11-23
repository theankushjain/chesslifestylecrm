import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Phone, Search, ChevronRight, CheckCircle2, Circle, Download, Printer, Building2, AlertTriangle, Filter, Check, UserCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
import { WhatsappIcon } from "@/components/crm/WhatsappIcon";
import { openWhatsapp, studentReminderMessage } from "@/lib/whatsapp";
import { useAuth } from "@/context/AuthContext";
import { exportToCSV } from "@/lib/export";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];

function formatProgressDate(isoStr) {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr.slice(0, 10);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1 && diffMs >= 0) return "just now";
    if (diffHours < 24 && d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      return "today";
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear()) {
      return "yesterday";
    }
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch (e) {
    return isoStr.slice(0, 10);
  }
}

function MonthlyProgressDialog() {
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reports/monthly-progress");
      setReports(data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadReports();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl h-10 border-[#F58B10] text-[#F58B10] hover:bg-[#F58B10]/10">
          Monthly Reports
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">Monthly Progress Reports</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-slate-500 mb-4">Students who have progressed this month:</p>
          {loading ? (
            <div className="text-sm text-center py-4">Loading...</div>
          ) : reports.length === 0 ? (
            <div className="text-sm text-center py-4 text-slate-500">No students progressed this month yet.</div>
          ) : (
            <div className="space-y-3">
              {reports.map((s) => {
                const phone = s.parent_phone || s.phone;
                const message = `Hello! We are excited to share ${s.name}'s chess progress report for this month. \n\nView Progress: ${window.location.origin}/p/progress/${s.id}\n\nWe value your input! Please let us know how we're doing by filling out this quick feedback form:\n${window.location.origin}/p/feedback/${s.id}`;
                return (
                  <div key={s.id} className="flex items-center justify-between p-3 border rounded-xl bg-slate-50">
                    <div>
                      <div className="font-semibold">{s.name}</div>
                      <div className="text-xs text-slate-500">Level: {s.level}</div>
                    </div>
                    {phone ? (
                      <Button size="sm" onClick={() => window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank')} className="bg-[#25D366] hover:bg-[#1DA851] text-white">
                        <WhatsappIcon className="w-4 h-4 mr-2" />
                        Send Update
                      </Button>
                    ) : (
                      <span className="text-xs text-red-400">No phone</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Students() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [instituteFilter, setInstituteFilterState] = useState(() => {
    const fromUrl = searchParams.get("institute");
    if (fromUrl) return fromUrl;
    try {
      const fromStorage = localStorage.getItem("crm_students_institute_filter");
      if (fromStorage) return fromStorage;
    } catch (e) {}
    return "all";
  });

  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "active" | "inactive"
  const [feeFilter, setFeeFilter] = useState("all"); // "all" | "paid" | "unpaid"
  const [students, setStudents] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const handleInstituteChange = (val) => {
    setInstituteFilterState(val);
    try {
      localStorage.setItem("crm_students_institute_filter", val);
    } catch (e) {}
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (val === "all") {
          next.delete("institute");
        } else {
          next.set("institute", val);
        }
        return next;
      },
      { replace: true }
    );
  };

  useEffect(() => {
    const paramInst = searchParams.get("institute") || "all";
    if (paramInst !== instituteFilter) {
      setInstituteFilterState(paramInst);
      try {
        localStorage.setItem("crm_students_institute_filter", paramInst);
      } catch (e) {}
    }
  }, [searchParams, instituteFilter]);

  const load = async () => {
    try {
      const [sRes, iRes] = await Promise.all([
        api.get("/students"),
        api.get("/institutes"),
      ]);
      setStudents(sRes.data);
      setInstitutes(iRes.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const curMonthLabel = new Date().toLocaleString("default", { month: "short" });
  const activeCount = students.filter((s) => s.status === "active").length;
  const inactiveCount = students.filter((s) => s.status !== "active").length;
  const paidCount = students.filter((s) => s.is_fee_paid_this_month === true).length;
  const unpaidCount = students.filter((s) => s.is_fee_paid_this_month === false).length;

  const sortedStudents = [...students].sort((a, b) => {
    const aDate = a.progress_updated_at || "";
    const bDate = b.progress_updated_at || "";
    if (aDate && !bDate) return -1;
    if (!aDate && bDate) return 1;
    if (aDate && bDate) {
      if (aDate > bDate) return -1;
      if (aDate < bDate) return 1;
    }
    return (a.name || "").localeCompare(b.name || "");
  });

  const filtered = sortedStudents.filter((s) => {
    const matchesQuery =
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      (s.phone || "").includes(query) ||
      (s.parent_name || "").toLowerCase().includes(query.toLowerCase());
    const matchesInstitute =
      instituteFilter === "all"
        ? true
        : instituteFilter === "unassigned"
        ? !s.institute_id
        : String(s.institute_id || "") === String(instituteFilter);
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? s.status === "active"
        : s.status !== "active";
    const matchesFee =
      feeFilter === "all"
        ? true
        : feeFilter === "paid"
        ? s.is_fee_paid_this_month === true
        : s.is_fee_paid_this_month === false;
    return matchesQuery && matchesInstitute && matchesStatus && matchesFee;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="label-over">Roster</div>
          <h1 className="text-4xl font-serif">Students</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(user?.role === "admin" || user?.role === "institute") && (
            <Button variant="outline" onClick={() => {
              const exportData = sortedStudents.map(s => ({
                Name: s.name,
                Institute: s.institute_name || "Direct Enrollment",
                Phone: s.phone || "",
                "Parent Name": s.parent_name || "",
                "Parent Phone": s.parent_phone || "",
                "Father's Profession": s.father_occupation || "",
                "Mother's Profession": s.mother_occupation || "",
                Level: s.level || "",
                "Monthly Fee": s.monthly_fee || 0,
                Status: s.status || "",
                "Progress Last Updated": s.progress_updated_at ? new Date(s.progress_updated_at).toLocaleDateString() : "Never",
                DOB: s.dob || "",
                Grade: s.grade || "",
                School: s.school || "",
                Hobby: s.hobby || "",
                Notes: s.notes || "",
                Tags: Array.isArray(s.tags) ? s.tags.join(", ") : ""
              }));
              exportToCSV(exportData, "students_report.csv");
            }} className="rounded-xl h-10">
              <Download className="w-4 h-4 mr-1.5" /> Export
            </Button>
          )}
          <Button variant="outline" onClick={() => window.open("/print-blank-form", "_blank")} className="rounded-xl h-10" title="Download blank registration form PDF">
            <Printer className="w-4 h-4 mr-1.5" /> Blank Form
          </Button>
          {user?.role === "admin" && <MonthlyProgressDialog />}
          {(user?.role === "admin" || user?.role === "staff") && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-student-btn" className="rounded-xl h-10">
                  <Plus className="w-4 h-4 mr-1.5" /> Add
                </Button>
              </DialogTrigger>
              <StudentDialog onSaved={() => { setOpen(false); load(); }} institutes={institutes} />
            </Dialog>
          )}
        </div>
      </div>

      {/* Search, Status and Institute Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, phone or parent..." data-testid="student-search"
            value={query} onChange={(e) => setQuery(e.target.value)}
            className="pl-10 rounded-xl bg-white" />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[190px] rounded-xl bg-white shadow-sm border-border/60 text-xs h-10">
            <UserCheck className="w-3.5 h-3.5 mr-1.5 text-primary shrink-0" />
            <SelectValue>
              {statusFilter === "all"
                ? `All Statuses (${students.length})`
                : statusFilter === "active"
                ? `Active Only (${activeCount})`
                : `On Hold (${inactiveCount})`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Statuses ({students.length})</SelectItem>
            <SelectItem value="active">Active Only ({activeCount})</SelectItem>
            <SelectItem value="inactive">On Hold / Inactive ({inactiveCount})</SelectItem>
          </SelectContent>
        </Select>

        <Select value={instituteFilter} onValueChange={handleInstituteChange}>
          <SelectTrigger className="w-full sm:w-[230px] rounded-xl bg-white shadow-sm border-border/60 text-xs h-10">
            <Building2 className="w-3.5 h-3.5 mr-1.5 text-primary shrink-0" />
            <SelectValue>
              {instituteFilter === "all"
                ? `All Institutes (${students.length})`
                : instituteFilter === "unassigned"
                ? `Direct Enrollment (${students.filter((s) => !s.institute_id).length})`
                : institutes.find((inst) => String(inst.id) === String(instituteFilter))?.name || "All Institutes"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Institutes ({students.length})</SelectItem>
            <SelectItem value="unassigned">Direct Enrollment ({students.filter(s => !s.institute_id).length})</SelectItem>
            {institutes.map((inst) => (
              <SelectItem key={inst.id} value={inst.id}>
                {inst.name} ({students.filter(s => String(s.institute_id) === String(inst.id)).length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quick Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
        <button
          onClick={() => { setStatusFilter("all"); setFeeFilter("all"); }}
          className={`px-3 py-1.5 rounded-xl border transition-all ${
            statusFilter === "all" && feeFilter === "all"
              ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
              : "bg-white text-muted-foreground border-border/60 hover:bg-muted/30"
          }`}
        >
          All Students ({students.length})
        </button>

        <button
          onClick={() => {
            setStatusFilter(statusFilter === "active" ? "all" : "active");
          }}
          className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
            statusFilter === "active"
              ? "bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs"
              : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50/50"
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Active Only ({activeCount})
        </button>

        {(user?.role === "admin" || user?.role === "institute") && (
          <>
            <button
              onClick={() => {
                setFeeFilter(feeFilter === "paid" ? "all" : "paid");
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                feeFilter === "paid"
                  ? "bg-emerald-700 text-white border-emerald-700 font-semibold shadow-xs"
                  : "bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50/50"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {curMonthLabel} <span className="hidden sm:inline">Fee </span>Received ({paidCount})
            </button>

            <button
              onClick={() => {
                setFeeFilter(feeFilter === "unpaid" ? "all" : "unpaid");
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                feeFilter === "unpaid"
                  ? "bg-rose-600 text-white border-rose-600 font-semibold shadow-xs"
                  : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50/50"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {curMonthLabel} <span className="hidden sm:inline">Fee </span>Due ({unpaidCount})
            </button>
          </>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="bg-white border border-border/40 shadow-sm rounded-xl divide-y divide-border/60" data-testid="students-list">
          {filtered.map((s) => (
            <div key={s.id} className="flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <Link to={`/students/${s.id}`} data-testid={`student-row-${s.id}`}
                className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 p-3 sm:p-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary text-primary-foreground flex items-center justify-center font-serif text-base sm:text-lg rounded-lg shrink-0">
                  {s.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                    <span className="truncate max-w-[150px] sm:max-w-none">{s.name}</span>
                    {s.institute_name && (
                      <span className="text-[10px] px-1.5 sm:px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 font-medium rounded-full flex items-center gap-1 shrink-0">
                        <Building2 className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[90px] sm:max-w-none">{s.institute_name}</span>
                      </span>
                    )}
                    {s.progress_updated_at && (
                      <span
                        className="text-[10px] px-1.5 sm:px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/80 font-medium rounded-full flex items-center gap-1 shrink-0"
                        title={`Progress updated: ${new Date(s.progress_updated_at).toLocaleString()}`}
                      >
                        <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                        <span className="hidden sm:inline">Progress: </span>{formatProgressDate(s.progress_updated_at)}
                      </span>
                    )}
                    {Array.isArray(s.tags) && s.tags.length > 0 && (
                      <span className="flex items-center gap-1">
                        {s.tags.slice(0, 2).map((t, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary uppercase tracking-wider font-semibold rounded">
                            {t}
                          </span>
                        ))}
                        {s.tags.length > 2 && <span className="text-[10px] text-muted-foreground">+{s.tags.length - 2}</span>}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {s.level} · {s.phone || "no phone"}
                  </div>
                  {s.notes && (
                    <div className="text-xs text-muted-foreground line-clamp-1 sm:line-clamp-2 mt-0.5 max-w-md" title={s.notes}>
                      <span className="font-medium">Note:</span> {s.notes}
                    </div>
                  )}
                </div>
              </Link>
              <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 pr-3 pl-1 sm:px-4">
                {/* Current Month Fee Status Badge */}
                {(user?.role === "admin" || user?.role === "institute") && (
                  s.is_fee_paid_this_month ? (
                    <span
                      className="text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0"
                      title={s.current_month_fee?.paid_date ? `Paid on ${s.current_month_fee.paid_date.slice(0, 10)}` : 'Paid this month'}
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="hidden sm:inline">{curMonthLabel} Fee </span>
                      <span>Paid</span>
                    </span>
                  ) : (
                    <span
                      className="text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 shrink-0"
                      title="Current month fee due / unpaid"
                    >
                      <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                      <span className="hidden sm:inline">{curMonthLabel} Fee </span>
                      <span>Due</span>
                    </span>
                  )
                )}

                {(user?.role === "admin" || user?.role === "institute") && (s.fee_amount || s.monthly_fee) ? (
                  <span className="text-xs font-mono hidden md:inline text-muted-foreground">₹{s.fee_amount || s.monthly_fee}/{s.fee_type === "per_class" ? "class" : "mo"}</span>
                ) : null}

                {/* Status indicator */}
                {s.status === "active" ? (
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 hidden sm:inline">Active</span>
                ) : (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 hidden sm:inline">{s.status || "On Hold"}</span>
                )}
                {(s.parent_phone || s.phone) && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation();
                      const ok = openWhatsapp(s.parent_phone || s.phone, studentReminderMessage(s, null));
                      if (!ok) toast.error("No valid phone number");
                    }}
                    data-testid={`whatsapp-student-${s.id}`}
                    title="Send WhatsApp"
                    className="p-1 sm:p-1.5 text-[#25D366] hover:bg-[#25D366]/10 rounded transition-colors">
                    <WhatsappIcon className="w-4 h-4" />
                  </button>
                )}
                <Link to={`/students/${s.id}`} className="p-1 hidden sm:block">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No students found.</div>
          )}
        </div>
      )}
    </div>
  );
}

function StudentDialog({ onSaved, student, institutes = [] }) {
  const { user } = useAuth();
  const [form, setForm] = useState(student || {
    name: "", phone: "", parent_name: "", parent_phone: "",
    level: "Beginner", monthly_fee: 2500, fee_type: "monthly", fee_amount: 2500, notes: "", status: "active", dob: "", tags: [],
    institute_id: "", institute_name: ""
  });
  const [tagsStr, setTagsStr] = useState((Array.isArray(student?.tags) ? student.tags : []).join(", "));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { 
        ...form, 
        tags: tagsStr.split(",").map(t => t.trim()).filter(Boolean) 
      };
      if (student) {
        await api.patch(`/students/${student.id}`, payload);
        toast.success("Student updated");
      } else {
        await api.post("/students", payload);
        toast.success("Student added");
      }
      onSaved();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  return (
    <DialogContent className="rounded-xl max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-serif text-2xl">{student ? "Edit student" : "New student"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs uppercase tracking-widest">Name</Label>
          <Input data-testid="student-form-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-widest">Phone</Label>
            <Input data-testid="student-form-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest">Level</Label>
            <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
              <SelectTrigger data-testid="student-form-level" className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-widest">Parent name</Label>
            <Input value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} className="rounded-xl" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest">Parent phone</Label>
            <Input value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} className="rounded-xl" />
          </div>
        </div>
        {user?.role === "admin" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest">Fee Type</Label>
              <Select value={form.fee_type} onValueChange={(v) => setForm({ ...form, fee_type: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="per_class">Per Class</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest">Fee Amount (₹)</Label>
              <Input type="number" data-testid="student-form-fee" value={form.fee_amount} onChange={(e) => setForm({ ...form, fee_amount: Number(e.target.value) })} className="rounded-xl" />
            </div>
          </div>
        )}
        <div>
          <Label className="text-xs uppercase tracking-widest font-semibold">Institute / Campus</Label>
          <Select
            value={form.institute_id || "none"}
            onValueChange={(v) => {
              const inst = institutes.find((i) => i.id === v);
              setForm({
                ...form,
                institute_id: v === "none" ? null : v,
                institute_name: inst ? inst.name : "",
              });
            }}
          >
            <SelectTrigger className="rounded-xl mt-1">
              <SelectValue placeholder="Direct / No Institute" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="none">Direct / No Institute</SelectItem>
              {institutes.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.name} ({i.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest">Date of birth</Label>
          <Input type="date" data-testid="student-form-dob" value={form.dob || ""} onChange={(e) => setForm({ ...form, dob: e.target.value })} className="rounded-xl" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest">Tags (comma-separated)</Label>
          <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="e.g. VIP, sibling, tournament" className="rounded-xl" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest">Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl" rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving || !form.name} data-testid="student-form-save" className="rounded-xl">
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { downloadProgressReport } from "@/lib/ProgressReportGenerator";
import { generateInvoice } from "@/lib/invoiceGenerator";
import { openWhatsapp } from "@/lib/whatsapp";
import { WhatsappIcon } from "@/components/crm/WhatsappIcon";
import {
  Trophy,
  Award,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Clock,
  IndianRupee,
  CalendarDays,
  ClipboardList,
  FileText,
  Download,
  Share2,
  Copy,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Search,
  ArrowRight,
  Check,
  User,
  QrCode,
  Building2,
  CreditCard,
  AlertTriangle,
  BookOpen,
  CalendarCheck,
  Percent,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function StudentPortal() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [outcomes, setOutcomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingReport, setDownloadingReport] = useState(false);

  // Filters for learning progress
  const [progressFilter, setProgressFilter] = useState("all"); // 'all' | 'completed' | 'in_progress'
  const [progressSearch, setProgressSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("all");

  // Filters for attendance
  const [attendanceFilter, setAttendanceFilter] = useState("all"); // 'all' | 'present' | 'absent' | 'late'
  const [attendanceMonth, setAttendanceMonth] = useState("all");

  // Filters for fees
  const [feeFilter, setFeeFilter] = useState("all"); // 'all' | 'pending' | 'paid'

  const handleTabChange = (val) => {
    setSearchParams(val === "overview" ? {} : { tab: val });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [sRes, aRes, pRes] = await Promise.all([
        api.get("/students"),
        api.get("/attendance"),
        api.get("/payments"),
      ]);

      let curStudent = sRes.data?.[0];
      if (!curStudent && user?.linked_student_id) {
        try {
          const single = await api.get(`/students/${user.linked_student_id}`);
          curStudent = single.data;
        } catch {}
      }

      setStudent(curStudent || null);
      setAttendance(aRes.data || []);
      setPayments(pRes.data || []);

      if (curStudent?.id) {
        try {
          const progRes = await api.get(`/students/${curStudent.id}/progress`);
          setOutcomes(progRes.data?.outcomes || []);
        } catch {
          setOutcomes([]);
        }
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Calculations for Progress ---
  const totalOutcomes = outcomes.length;
  const completedOutcomes = outcomes.filter((o) => o.completed).length;
  const progressPercent = totalOutcomes > 0 ? Math.round((completedOutcomes / totalOutcomes) * 100) : 0;

  // Group outcomes by Level -> Module
  const groupedProgress = useMemo(() => {
    const acc = {};
    outcomes.forEach((curr) => {
      const lvl = curr.level || "General Curriculum";
      const mod = curr.module || "Fundamentals";
      if (!acc[lvl]) acc[lvl] = {};
      if (!acc[lvl][mod]) acc[lvl][mod] = [];
      acc[lvl][mod].push(curr);
    });
    return acc;
  }, [outcomes]);

  const allLevels = useMemo(() => Object.keys(groupedProgress), [groupedProgress]);

  // Set default level when levels load
  useEffect(() => {
    if (selectedLevel === "all" && allLevels.length > 0 && student?.level) {
      const match = allLevels.find((l) => l.toLowerCase().includes(student.level.toLowerCase()));
      if (match) setSelectedLevel(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLevels, student?.level]);

  // Filtered outcomes list
  const filteredGroupedProgress = useMemo(() => {
    const res = {};
    const searchLower = progressSearch.trim().toLowerCase();

    Object.entries(groupedProgress).forEach(([lvl, modules]) => {
      if (selectedLevel !== "all" && lvl !== selectedLevel) return;

      const matchedModules = {};
      Object.entries(modules).forEach(([modName, items]) => {
        const filteredItems = items.filter((item) => {
          if (progressFilter === "completed" && !item.completed) return false;
          if (progressFilter === "in_progress" && item.completed) return false;
          if (searchLower && !item.text.toLowerCase().includes(searchLower)) return false;
          return true;
        });

        if (filteredItems.length > 0) {
          matchedModules[modName] = filteredItems;
        }
      });

      if (Object.keys(matchedModules).length > 0) {
        res[lvl] = matchedModules;
      }
    });

    return res;
  }, [groupedProgress, selectedLevel, progressFilter, progressSearch]);

  // --- Calculations for Attendance ---
  const totalClasses = attendance.length;
  const presentCount = attendance.filter((a) => a.status === "present").length;
  const absentCount = attendance.filter((a) => a.status === "absent").length;
  const lateCount = attendance.filter((a) => a.status === "late").length;
  const attendanceRate = totalClasses > 0 ? Math.round(((presentCount + lateCount) / totalClasses) * 100) : 0;

  // Unique months available in attendance
  const attendanceMonths = useMemo(() => {
    const set = new Set();
    attendance.forEach((a) => {
      if (a.date && a.date.length >= 7) {
        set.add(a.date.slice(0, 7)); // 'YYYY-MM'
      }
    });
    return Array.from(set).sort().reverse();
  }, [attendance]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter((a) => {
      if (attendanceFilter !== "all" && a.status !== attendanceFilter) return false;
      if (attendanceMonth !== "all" && !a.date?.startsWith(attendanceMonth)) return false;
      return true;
    });
  }, [attendance, attendanceFilter, attendanceMonth]);

  // --- Calculations for Fees ---
  const paidPayments = useMemo(() => payments.filter((p) => p.status === "paid"), [payments]);
  const pendingPayments = useMemo(() => payments.filter((p) => p.status !== "paid"), [payments]);

  const totalPaidAmount = useMemo(
    () => paidPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [paidPayments]
  );
  const totalPendingAmount = useMemo(
    () => pendingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [pendingPayments]
  );

  const filteredPayments = useMemo(() => {
    if (feeFilter === "paid") return paidPayments;
    if (feeFilter === "pending") return pendingPayments;
    return payments;
  }, [payments, feeFilter, paidPayments, pendingPayments]);

  const handleDownloadReport = async () => {
    if (!student) return;
    setDownloadingReport(true);
    try {
      await downloadProgressReport(student, outcomes);
      toast.success("Progress report downloaded successfully!");
    } catch (err) {
      toast.error("Failed to generate progress report");
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleCopyProgressLink = () => {
    if (!student?.id) return;
    const url = `${window.location.origin}/p/progress/${student.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Public progress report link copied to clipboard!");
  };

  const handlePrintInvoice = (p) => {
    if (!student) return;
    generateInvoice({
      student,
      amount: p.amount,
      description: `Chess Coaching Fee - ${monthName(p.month)} ${p.year}`,
      descNotes: p.notes || `Chess Training for ${monthName(p.month)} ${p.year}`,
      invoiceDate: p.paid_date ? new Date(p.paid_date) : new Date(p.year, p.month - 1, 1),
      paymentDetails: student.payment_details,
    });
  };

  const handleCopyUpi = (upiId) => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    toast.success(`Copied UPI ID: ${upiId}`);
  };

  const handleSendPaymentWhatsApp = () => {
    const details = student?.payment_details;
    const phone = student?.phone || student?.parent_phone || "";
    const msg = `Hi, I have initiated the fee payment for ${student?.name}. Attached is the transaction reference. Kindly confirm receipt. Thank you!`;
    const targetPhone = details?.support_phone || "919999999999";
    openWhatsapp(targetPhone, msg);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-4 border-[#F58B10]/20 border-t-[#F58B10] rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Loading your student account...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <div className="p-4 bg-amber-500/10 text-amber-700 rounded-2xl border border-amber-500/20 mb-4 inline-block">
          <AlertCircle className="w-8 h-8 mx-auto" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-foreground mb-2">No Student Profile Linked</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Your account is not currently linked to an active student record. Please contact your chess coach or academy administration.
        </p>
        <Link to="/tasks">
          <Button variant="outline" className="rounded-xl">Go to Tasks</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto animate-fade-in space-y-6">
      {/* ========================================================= */}
      {/* HEADER PROFILE BANNER */}
      {/* ========================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-[#242B38] text-white p-6 md:p-8 shadow-xl border border-white/10">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 bg-[#F58B10]/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start md:items-center gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-[#F58B10] to-[#E07905] text-white font-serif font-bold text-2xl md:text-3xl flex items-center justify-center shadow-lg shadow-[#F58B10]/30 shrink-0">
              {student.name?.[0] || "S"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                  Student Portal
                </span>
                {student.level && (
                  <span className="text-[10px] uppercase tracking-widest font-semibold px-2.5 py-0.5 rounded-full bg-[#F58B10]/20 text-[#F58B10] border border-[#F58B10]/30">
                    {student.level}
                  </span>
                )}
                {student.institute_name && (
                  <span className="text-[10px] uppercase tracking-widest font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/70 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {student.institute_name}
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-white" data-testid="student-portal-name">
                {student.name}
              </h1>
              <p className="text-xs md:text-sm text-white/60 mt-1">
                Enrolled Student · Fee: ₹{student.fee_amount || student.monthly_fee || 0}/{student.fee_type === "per_class" ? "class" : "month"}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            <Button
              onClick={handleDownloadReport}
              disabled={downloadingReport}
              variant="outline"
              size="sm"
              className="rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white text-xs h-9"
              data-testid="student-portal-download-report-btn"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              {downloadingReport ? "Generating..." : "Download Progress PDF"}
            </Button>
            <Button
              onClick={handleCopyProgressLink}
              variant="outline"
              size="sm"
              className="rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white text-xs h-9"
              title="Copy shareable progress report link"
              data-testid="student-portal-share-btn"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share Report
            </Button>
          </div>
        </div>

        {/* Highlight Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 text-white">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="text-[10px] uppercase tracking-widest text-white/50 font-medium">Learning Progress</div>
            <div className="text-2xl font-serif font-bold text-white mt-0.5">{progressPercent}%</div>
            <div className="text-[11px] text-white/60 mt-0.5">{completedOutcomes} of {totalOutcomes} skills</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="text-[10px] uppercase tracking-widest text-white/50 font-medium">Attendance Rate</div>
            <div className="text-2xl font-serif font-bold text-emerald-400 mt-0.5">{attendanceRate}%</div>
            <div className="text-[11px] text-white/60 mt-0.5">{presentCount} attended / {totalClasses} classes</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="text-[10px] uppercase tracking-widest text-white/50 font-medium">Fees Paid</div>
            <div className="text-2xl font-serif font-bold text-white mt-0.5">₹{totalPaidAmount.toLocaleString("en-IN")}</div>
            <div className="text-[11px] text-white/60 mt-0.5">{paidPayments.length} paid month(s)</div>
          </div>
          <div className={`rounded-xl p-3 border transition-colors ${totalPendingAmount > 0 ? "bg-rose-500/15 border-rose-500/30 text-rose-300" : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"}`}>
            <div className="text-[10px] uppercase tracking-widest font-medium opacity-80">Pending Dues</div>
            <div className="text-2xl font-serif font-bold mt-0.5">
              ₹{totalPendingAmount.toLocaleString("en-IN")}
            </div>
            <div className="text-[11px] opacity-80 mt-0.5">
              {totalPendingAmount > 0 ? `${pendingPayments.length} month(s) pending` : "All dues cleared 🎉"}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MAIN TABS NAVIGATION */}
      {/* ========================================================= */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
        <TabsList className="w-full justify-start rounded-2xl bg-white border border-border/60 p-1.5 shadow-sm h-auto flex flex-wrap gap-1">
          <TabsTrigger
            value="overview"
            data-testid="student-tab-overview"
            className="rounded-xl py-2.5 px-4 text-xs md:text-sm font-medium data-[state=active]:bg-[#242B38] data-[state=active]:text-white transition-all flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="progress"
            data-testid="student-tab-progress"
            className="rounded-xl py-2.5 px-4 text-xs md:text-sm font-medium data-[state=active]:bg-[#242B38] data-[state=active]:text-white transition-all flex items-center gap-2"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            Learning Progress
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 font-mono font-semibold">
              {progressPercent}%
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="attendance"
            data-testid="student-tab-attendance"
            className="rounded-xl py-2.5 px-4 text-xs md:text-sm font-medium data-[state=active]:bg-[#242B38] data-[state=active]:text-white transition-all flex items-center gap-2"
          >
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
            Attendance
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 font-mono font-semibold">
              {attendanceRate}%
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="fees"
            data-testid="student-tab-fees"
            className="rounded-xl py-2.5 px-4 text-xs md:text-sm font-medium data-[state=active]:bg-[#242B38] data-[state=active]:text-white transition-all flex items-center gap-2"
          >
            <IndianRupee className="w-4 h-4 text-orange-500" />
            Fees & Dues
            {totalPendingAmount > 0 ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono font-semibold">
                ₹{totalPendingAmount.toLocaleString("en-IN")} Due
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 font-mono font-semibold">
                Paid
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================= */}
        <TabsContent value="overview" className="space-y-6 m-0">
          {/* Pending Fee Alert Notice (if pending > 0) */}
          {totalPendingAmount > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm" data-testid="pending-fee-alert">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-rose-900">
                    Pending Fee Notice: ₹{totalPendingAmount.toLocaleString("en-IN")} Due
                  </h4>
                  <p className="text-xs md:text-sm text-rose-700 mt-0.5">
                    You have {pendingPayments.length} pending fee month(s) recorded:{" "}
                    <strong>
                      {pendingPayments.map((p) => `${monthName(p.month)} ${p.year}`).join(", ")}
                    </strong>
                    . Please see the Fees tab for bank details or UPI payment instructions.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => handleTabChange("fees")}
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs shrink-0 w-full sm:w-auto"
              >
                View Fees & Pay <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          )}

          {/* Bento Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Progress Card */}
            <Card className="rounded-2xl border-border/60 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                    Curriculum & Skills
                  </span>
                  <Trophy className="w-4 h-4 text-amber-500" />
                </div>
                <CardTitle className="text-xl font-serif">Learning Progress</CardTitle>
                <CardDescription className="text-xs">
                  Master chess tactics, openings, and endgame techniques
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                    <span className="text-muted-foreground">Overall Completion</span>
                    <span className="font-mono text-[#F58B10] font-bold">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#F58B10] to-[#E07905] h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs py-2 px-3 bg-secondary/50 rounded-xl">
                  <span className="text-muted-foreground">Skills Completed</span>
                  <span className="font-semibold">{completedOutcomes} of {totalOutcomes}</span>
                </div>
                <Button
                  onClick={() => handleTabChange("progress")}
                  variant="outline"
                  className="w-full rounded-xl text-xs justify-between group"
                >
                  Explore Progress Details
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </CardContent>
            </Card>

            {/* Attendance Card */}
            <Card className="rounded-2xl border-border/60 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                    Class Attendance
                  </span>
                  <CalendarCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <CardTitle className="text-xl font-serif">Attendance Overview</CardTitle>
                <CardDescription className="text-xs">
                  Participation and consistency in scheduled chess sessions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                    <span className="text-muted-foreground">Attendance Rate</span>
                    <span className="font-mono text-emerald-600 font-bold">{attendanceRate}%</span>
                  </div>
                  <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${attendanceRate}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                    <div className="font-bold font-mono text-base">{presentCount}</div>
                    <div className="text-[9px] uppercase tracking-wider">Present</div>
                  </div>
                  <div className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
                    <div className="font-bold font-mono text-base">{lateCount}</div>
                    <div className="text-[9px] uppercase tracking-wider">Late</div>
                  </div>
                  <div className="p-2 bg-rose-50 text-rose-700 rounded-xl border border-rose-100">
                    <div className="font-bold font-mono text-base">{absentCount}</div>
                    <div className="text-[9px] uppercase tracking-wider">Absent</div>
                  </div>
                </div>
                <Button
                  onClick={() => handleTabChange("attendance")}
                  variant="outline"
                  className="w-full rounded-xl text-xs justify-between group"
                >
                  View Attendance History
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </CardContent>
            </Card>

            {/* Fees Card */}
            <Card className="rounded-2xl border-border/60 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                    Fee Statement
                  </span>
                  <IndianRupee className="w-4 h-4 text-orange-500" />
                </div>
                <CardTitle className="text-xl font-serif">Fee Status</CardTitle>
                <CardDescription className="text-xs">
                  Summary of your fee payments and pending dues
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-secondary/50 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Total Fees Paid:</span>
                    <span className="font-bold font-mono text-emerald-600">
                      ₹{totalPaidAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Pending Dues:</span>
                    <span className={`font-bold font-mono ${totalPendingAmount > 0 ? "text-rose-600" : "text-muted-foreground"}`}>
                      ₹{totalPendingAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs px-1">
                  <span className="text-muted-foreground">Current Plan:</span>
                  <span className="font-medium font-mono">
                    ₹{student.fee_amount || student.monthly_fee || 0}/{student.fee_type === "per_class" ? "class" : "month"}
                  </span>
                </div>

                <Button
                  onClick={() => handleTabChange("fees")}
                  variant="outline"
                  className="w-full rounded-xl text-xs justify-between group"
                >
                  View Complete Fee Ledger
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Split: Recent Classes + Recent Mastered Topics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Classes */}
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-serif">Recent Classes</CardTitle>
                  <CardDescription className="text-xs">Last recorded class sessions</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTabChange("attendance")}
                  className="text-xs text-primary hover:text-primary/80"
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/60">
                  {attendance.slice(0, 5).map((a) => {
                    const isPresent = a.status === "present";
                    const isAbsent = a.status === "absent";
                    return (
                      <div key={a.id} className="p-3.5 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isPresent
                                ? "bg-emerald-500/10 text-emerald-600"
                                : isAbsent
                                ? "bg-rose-500/10 text-rose-600"
                                : "bg-amber-500/10 text-amber-600"
                            }`}
                          >
                            {isPresent ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : isAbsent ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <Clock className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-foreground">{a.date}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-xs">
                              {a.topic || "Regular Class Session"}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase tracking-wider rounded-lg font-medium ${
                            isPresent
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isAbsent
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {a.status}
                        </Badge>
                      </div>
                    );
                  })}
                  {attendance.length === 0 && (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No attendance records found yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Completed Outcomes */}
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-serif">Recently Mastered Skills</CardTitle>
                  <CardDescription className="text-xs">Learning milestones achieved</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTabChange("progress")}
                  className="text-xs text-primary hover:text-primary/80"
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/60">
                  {outcomes
                    .filter((o) => o.completed)
                    .slice(0, 5)
                    .map((o) => (
                      <div key={o.id} className="p-3.5 flex items-start gap-3 hover:bg-secondary/20 transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-foreground leading-snug">
                            {o.text}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            <span className="font-medium text-[#F58B10]">{o.module}</span>
                            {o.completed_date && (
                              <>
                                <span>·</span>
                                <span>{o.completed_date}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  {completedOutcomes === 0 && (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No completed skills recorded yet. Check out the curriculum!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ========================================================= */}
        {/* TAB 2: LEARNING PROGRESS */}
        {/* ========================================================= */}
        <TabsContent value="progress" className="space-y-6 m-0">
          {/* Header Summary & Report Download Banner */}
          <div className="bg-white border border-border/60 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-[#F58B10] font-bold">
                  Curriculum Milestones
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs font-medium text-muted-foreground">
                  {completedOutcomes} of {totalOutcomes} skills mastered
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
                Chess Learning Roadmap
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground max-w-xl">
                Track your advancement across levels, piece mastery, tactical themes, opening principles, and tournament endgames.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={handleDownloadReport}
                disabled={downloadingReport}
                className="rounded-xl bg-[#242B38] text-white hover:bg-[#1a1f29] shadow-sm text-xs h-10 px-4"
              >
                <Download className="w-3.5 h-3.5 mr-2" />
                {downloadingReport ? "Preparing PDF..." : "Download Report PDF"}
              </Button>
              <Button
                onClick={handleCopyProgressLink}
                variant="outline"
                className="rounded-xl border-border/60 text-xs h-10 px-4"
              >
                <Share2 className="w-3.5 h-3.5 mr-2" /> Share Link
              </Button>
              {student.id && (
                <Link to={`/p/progress/${student.id}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-muted-foreground hover:text-foreground" title="Open Public View">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Progress Bar & Filter Bar */}
          <div className="bg-white border border-border/60 rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-muted-foreground">Mastery Progress</span>
                <span className="font-mono text-[#F58B10] font-bold text-sm">{progressPercent}%</span>
              </div>
              <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#F58B10] to-[#E07905] h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              {/* Level Selector */}
              {allLevels.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={selectedLevel === "all" ? "default" : "outline"}
                    onClick={() => setSelectedLevel("all")}
                    className={`rounded-xl text-xs h-8 ${selectedLevel === "all" ? "bg-[#242B38] text-white" : ""}`}
                  >
                    All Levels
                  </Button>
                  {allLevels.map((lvl) => (
                    <Button
                      key={lvl}
                      size="sm"
                      variant={selectedLevel === lvl ? "default" : "outline"}
                      onClick={() => setSelectedLevel(lvl)}
                      className={`rounded-xl text-xs h-8 ${selectedLevel === lvl ? "bg-[#242B38] text-white" : ""}`}
                    >
                      {lvl}
                    </Button>
                  ))}
                </div>
              )}

              {/* Status pills & search */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <div className="flex items-center bg-secondary/50 p-1 rounded-xl border border-border/40 text-xs">
                  <button
                    onClick={() => setProgressFilter("all")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      progressFilter === "all" ? "bg-white shadow-xs text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setProgressFilter("completed")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      progressFilter === "completed" ? "bg-white shadow-xs text-emerald-700 font-semibold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Completed ({completedOutcomes})
                  </button>
                  <button
                    onClick={() => setProgressFilter("in_progress")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      progressFilter === "in_progress" ? "bg-white shadow-xs text-amber-700 font-semibold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    In Progress ({totalOutcomes - completedOutcomes})
                  </button>
                </div>

                <div className="relative min-w-[140px] sm:min-w-[180px]">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search topics..."
                    value={progressSearch}
                    onChange={(e) => setProgressSearch(e.target.value)}
                    className="h-8 pl-8 text-xs rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Grouped Progress Accordion */}
          <div className="space-y-4">
            {Object.keys(filteredGroupedProgress).length === 0 ? (
              <div className="bg-white border border-border/60 rounded-2xl p-12 text-center text-muted-foreground">
                <p className="text-base font-serif text-foreground font-semibold">No skills matching this filter</p>
                <p className="text-xs text-muted-foreground mt-1">Try selecting another level or clearing your search filter.</p>
              </div>
            ) : (
              Object.entries(filteredGroupedProgress).map(([lvlName, modules]) => (
                <div key={lvlName} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <GraduationCap className="w-5 h-5 text-[#F58B10]" />
                    <h3 className="text-lg font-serif font-bold text-foreground">{lvlName}</h3>
                  </div>

                  <Accordion type="multiple" defaultValue={Object.keys(modules)} className="space-y-3">
                    {Object.entries(modules).map(([modName, items]) => {
                      const modCompleted = items.filter((i) => i.completed).length;
                      const modTotal = items.length;
                      const modAllDone = modCompleted === modTotal && modTotal > 0;

                      return (
                        <AccordionItem
                          key={modName}
                          value={modName}
                          className="bg-white border border-border/60 rounded-2xl shadow-sm px-4 md:px-6 overflow-hidden"
                        >
                          <AccordionTrigger className="hover:no-underline py-4">
                            <div className="flex items-center justify-between w-full pr-4 text-left">
                              <div>
                                <div className="text-sm md:text-base font-serif font-bold text-foreground flex items-center gap-2">
                                  {modName}
                                  {modAllDone && (
                                    <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-300/40 text-[10px]">
                                      Mastered
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {modCompleted} of {modTotal} completed
                                </div>
                              </div>
                              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-lg bg-secondary text-foreground">
                                {Math.round((modCompleted / modTotal) * 100)}%
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-4 pt-1">
                            <div className="space-y-2 border-t border-border/40 pt-3">
                              {items.map((item) => (
                                <div
                                  key={item.id}
                                  className={`p-3 rounded-xl flex items-start gap-3 transition-colors ${
                                    item.completed ? "bg-emerald-500/5 hover:bg-emerald-500/10" : "bg-secondary/40 hover:bg-secondary/60"
                                  }`}
                                >
                                  <div
                                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                      item.completed
                                        ? "bg-emerald-500 text-white"
                                        : "border border-muted-foreground/40 text-transparent"
                                    }`}
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div
                                      className={`text-xs md:text-sm font-medium ${
                                        item.completed ? "text-foreground font-semibold" : "text-muted-foreground"
                                      }`}
                                    >
                                      {item.text}
                                    </div>
                                    {item.completed && item.completed_date && (
                                      <div className="text-[10px] text-emerald-700 mt-0.5 font-medium flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Completed on {item.completed_date}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* ========================================================= */}
        {/* TAB 3: ATTENDANCE */}
        {/* ========================================================= */}
        <TabsContent value="attendance" className="space-y-6 m-0">
          {/* Attendance Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardContent className="p-4 md:p-5">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Total Sessions
                </div>
                <div className="text-3xl font-serif font-bold text-foreground mt-1">
                  {totalClasses}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Classes held so far</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-sm bg-emerald-50/50 border-emerald-100">
              <CardContent className="p-4 md:p-5">
                <div className="text-[10px] uppercase tracking-widest text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Present
                </div>
                <div className="text-3xl font-serif font-bold text-emerald-700 mt-1">
                  {presentCount}
                </div>
                <p className="text-[11px] text-emerald-600/80 mt-0.5">Sessions attended</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-sm bg-amber-50/50 border-amber-100">
              <CardContent className="p-4 md:p-5">
                <div className="text-[10px] uppercase tracking-widest text-amber-700 font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Late
                </div>
                <div className="text-3xl font-serif font-bold text-amber-700 mt-1">
                  {lateCount}
                </div>
                <p className="text-[11px] text-amber-600/80 mt-0.5">Joined with delay</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-sm bg-rose-50/50 border-rose-100">
              <CardContent className="p-4 md:p-5">
                <div className="text-[10px] uppercase tracking-widest text-rose-700 font-semibold flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> Absent
                </div>
                <div className="text-3xl font-serif font-bold text-rose-700 mt-1">
                  {absentCount}
                </div>
                <p className="text-[11px] text-rose-600/80 mt-0.5">Missed classes</p>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Log Card */}
          <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-serif">Class Attendance Log</CardTitle>
                  <CardDescription className="text-xs">
                    Comprehensive record of dates and topics covered
                  </CardDescription>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Filter */}
                  <div className="flex items-center bg-secondary/50 p-1 rounded-xl border border-border/40 text-xs">
                    {["all", "present", "late", "absent"].map((st) => (
                      <button
                        key={st}
                        onClick={() => setAttendanceFilter(st)}
                        className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-colors ${
                          attendanceFilter === st
                            ? "bg-white shadow-xs text-foreground font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  {/* Month Filter */}
                  {attendanceMonths.length > 0 && (
                    <select
                      value={attendanceMonth}
                      onChange={(e) => setAttendanceMonth(e.target.value)}
                      className="h-8 px-2.5 text-xs rounded-xl bg-white border border-border/60 font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="all">All Months</option>
                      {attendanceMonths.map((m) => {
                        const [y, mo] = m.split("-");
                        return (
                          <option key={m} value={m}>
                            {monthName(parseInt(mo, 10))} {y}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="divide-y divide-border/60">
                {filteredAttendance.map((a) => {
                  const isPresent = a.status === "present";
                  const isAbsent = a.status === "absent";
                  const isLate = a.status === "late";

                  return (
                    <div
                      key={a.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-secondary/20 transition-colors"
                      data-testid={`attendance-row-${a.id}`}
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                            isPresent
                              ? "bg-emerald-500/10 text-emerald-600"
                              : isAbsent
                              ? "bg-rose-500/10 text-rose-600"
                              : "bg-amber-500/10 text-amber-600"
                          }`}
                        >
                          {isPresent ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : isAbsent ? (
                            <XCircle className="w-5 h-5" />
                          ) : (
                            <Clock className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {formatDisplayDate(a.date)}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              ({a.date})
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {a.topic || "Regular Class Session"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <Badge
                          variant="outline"
                          className={`text-xs uppercase tracking-wider rounded-lg font-medium px-2.5 py-0.5 ${
                            isPresent
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isAbsent
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {a.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}

                {filteredAttendance.length === 0 && (
                  <div className="p-12 text-center text-muted-foreground">
                    <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium text-foreground">No attendance records found</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {attendanceFilter !== "all" || attendanceMonth !== "all"
                        ? "Try clearing your filters to see past records."
                        : "Your attendance will appear here once classes are conducted."}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* TAB 4: FEES & PAYMENTS */}
        {/* ========================================================= */}
        <TabsContent value="fees" className="space-y-6 m-0">
          {/* Highlights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Paid */}
            <Card className="rounded-2xl border-border/60 shadow-sm bg-emerald-50/40 border-emerald-100">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-emerald-800 font-semibold">
                    Total Fees Paid
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-serif font-bold text-emerald-700 mt-2">
                  ₹{totalPaidAmount.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-emerald-700/80 mt-1">
                  Across {paidPayments.length} paid month(s)
                </p>
              </CardContent>
            </Card>

            {/* Total Pending */}
            <Card className={`rounded-2xl border-border/60 shadow-sm transition-all ${
              totalPendingAmount > 0 ? "bg-rose-50/50 border-rose-200 ring-1 ring-rose-200" : "bg-secondary/40"
            }`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] uppercase tracking-widest font-semibold ${
                    totalPendingAmount > 0 ? "text-rose-800" : "text-muted-foreground"
                  }`}>
                    Pending Dues
                  </span>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    totalPendingAmount > 0 ? "bg-rose-100 text-rose-700" : "bg-muted text-muted-foreground"
                  }`}>
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className={`text-3xl font-serif font-bold mt-2 ${
                  totalPendingAmount > 0 ? "text-rose-700" : "text-foreground"
                }`}>
                  ₹{totalPendingAmount.toLocaleString("en-IN")}
                </div>
                <p className={`text-xs mt-1 ${totalPendingAmount > 0 ? "text-rose-700/90 font-medium" : "text-muted-foreground"}`}>
                  {totalPendingAmount > 0
                    ? `${pendingPayments.length} month(s) awaiting payment`
                    : "No outstanding pending dues 🎉"}
                </p>
              </CardContent>
            </Card>

            {/* Plan Details */}
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                    Fee Rate
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-serif font-bold text-foreground mt-2">
                  ₹{student.fee_amount || student.monthly_fee || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1 capitalize">
                  Billed {student.fee_type === "per_class" ? "per class session" : "monthly"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Instructions / Bank Details (Prominent when pending or always accessible) */}
          {student.payment_details && (
            <Card className="rounded-2xl border-border/60 shadow-sm bg-gradient-to-br from-white to-secondary/30 overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/40 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[#F58B10] font-bold">
                      Payment Gateway & Instructions
                    </span>
                    <CardTitle className="text-xl font-serif mt-0.5">
                      How to Pay Your Chess Fees
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Official bank transfer and UPI details for {student.payment_details.source || "The Chess Lifestyle"}
                    </CardDescription>
                  </div>
                  {student.payment_details.upi_id && (
                    <Button
                      onClick={() => handleCopyUpi(student.payment_details.upi_id)}
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs h-8"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy UPI ID
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Account / UPI Info */}
                  <div className="space-y-3">
                    {student.payment_details.upi_id && (
                      <div className="p-3 bg-white rounded-xl border border-border/60 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            UPI ID / VPA
                          </div>
                          <div className="text-sm font-mono font-bold text-foreground mt-0.5">
                            {student.payment_details.upi_id}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyUpi(student.payment_details.upi_id)}
                          className="h-8 px-2 text-xs text-[#F58B10] hover:text-[#F58B10]"
                        >
                          Copy
                        </Button>
                      </div>
                    )}

                    {student.payment_details.beneficiary_name && (
                      <div className="p-3 bg-white rounded-xl border border-border/60">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          Beneficiary Name
                        </div>
                        <div className="text-sm font-semibold text-foreground mt-0.5">
                          {student.payment_details.beneficiary_name}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {student.payment_details.bank_name && (
                        <div className="p-3 bg-white rounded-xl border border-border/60">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Bank Name
                          </div>
                          <div className="text-xs font-semibold text-foreground mt-0.5">
                            {student.payment_details.bank_name}
                          </div>
                        </div>
                      )}
                      {student.payment_details.account_number && (
                        <div className="p-3 bg-white rounded-xl border border-border/60">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Account Number
                          </div>
                          <div className="text-xs font-mono font-bold text-foreground mt-0.5">
                            {student.payment_details.account_number}
                          </div>
                        </div>
                      )}
                      {student.payment_details.ifsc_code && (
                        <div className="p-3 bg-white rounded-xl border border-border/60 sm:col-span-2">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            IFSC Code
                          </div>
                          <div className="text-xs font-mono font-bold text-foreground mt-0.5">
                            {student.payment_details.ifsc_code}
                          </div>
                        </div>
                      )}
                    </div>

                    {student.payment_details.notes && (
                      <p className="text-xs text-muted-foreground italic mt-2">
                        Note: {student.payment_details.notes}
                      </p>
                    )}
                  </div>

                  {/* QR Code / Share Confirmation */}
                  <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-border/60 text-center">
                    {student.payment_details.qr_code_url ? (
                      <div className="mb-3 p-2 bg-white rounded-xl border border-border/40 shadow-xs">
                        <img
                          src={student.payment_details.qr_code_url}
                          alt="UPI Payment QR Code"
                          className="w-40 h-40 object-contain mx-auto"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground mb-3">
                        <QrCode className="w-10 h-10 opacity-40" />
                      </div>
                    )}
                    <p className="text-xs font-medium text-foreground">
                      Scan via GPay, PhonePe, Paytm, or BHIM UPI
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 mb-3 max-w-xs">
                      After payment, send your screenshot via WhatsApp for instant receipt confirmation.
                    </p>
                    <Button
                      onClick={handleSendPaymentWhatsApp}
                      className="rounded-xl bg-[#25D366] hover:bg-[#25D366]/90 text-white text-xs w-full max-w-xs shadow-xs"
                    >
                      <WhatsappIcon className="w-4 h-4 mr-2" /> Share Payment Receipt
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Individual Fee Statement Table / Cards */}
          <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-serif">Fee History & Invoices</CardTitle>
                  <CardDescription className="text-xs">
                    List of all recorded monthly and per-session fees
                  </CardDescription>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center bg-secondary/50 p-1 rounded-xl border border-border/40 text-xs self-start sm:self-center">
                  <button
                    onClick={() => setFeeFilter("all")}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      feeFilter === "all" ? "bg-white shadow-xs text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All ({payments.length})
                  </button>
                  <button
                    onClick={() => setFeeFilter("pending")}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      feeFilter === "pending" ? "bg-white shadow-xs text-rose-700 font-semibold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Pending ({pendingPayments.length})
                  </button>
                  <button
                    onClick={() => setFeeFilter("paid")}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      feeFilter === "paid" ? "bg-white shadow-xs text-emerald-700 font-semibold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Paid ({paidPayments.length})
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="divide-y divide-border/60">
                {filteredPayments.map((p) => {
                  const isPaid = p.status === "paid";
                  return (
                    <div
                      key={p.id}
                      className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-secondary/20 transition-colors"
                      data-testid={`fee-row-${p.id}`}
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                            isPaid
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-rose-500/10 text-rose-600"
                          }`}
                        >
                          {isPaid ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Clock className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-serif font-bold text-foreground">
                              {monthName(p.month)} {p.year}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase tracking-wider rounded-lg font-medium ${
                                isPaid
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              {isPaid ? "Paid" : "Pending Due"}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                            {isPaid ? (
                              <>
                                {p.paid_date && <span>Paid on {p.paid_date}</span>}
                                {p.method && <span>· Mode: {p.method}</span>}
                              </>
                            ) : (
                              <span className="text-rose-600 font-medium">Payment pending</span>
                            )}
                            {p.notes && <span>· Note: {p.notes}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-right">
                          <div className="text-lg font-serif font-bold font-mono text-foreground">
                            ₹{Number(p.amount || 0).toLocaleString("en-IN")}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                            {isPaid ? "Received" : "Due Amount"}
                          </div>
                        </div>

                        <Button
                          onClick={() => handlePrintInvoice(p)}
                          variant="outline"
                          size="sm"
                          className="rounded-xl text-xs h-8 px-3 border-border/60 hover:bg-secondary"
                          title="Generate printable invoice / receipt"
                          data-testid={`fee-invoice-btn-${p.id}`}
                        >
                          <FileText className="w-3.5 h-3.5 mr-1.5" />
                          Invoice
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {filteredPayments.length === 0 && (
                  <div className="p-12 text-center text-muted-foreground">
                    <IndianRupee className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium text-foreground">No fee records found</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {feeFilter !== "all"
                        ? "No records match the selected status."
                        : "No fee statements have been billed yet."}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const monthName = (m) =>
  ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1] || "";

function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

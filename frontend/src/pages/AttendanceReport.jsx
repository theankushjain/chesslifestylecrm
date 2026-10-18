import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Building2,
  Search,
  Calendar,
  CheckCheck,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { generatePDF } from "@/lib/pdfExport";

const STATUS_ICONS = {
  present: { icon: CheckCircle2, color: "text-success" },
  absent: { icon: XCircle, color: "text-destructive" },
  late: { icon: Clock, color: "text-warning" },
};

const STORAGE_KEY = "crm_attendance_institute_filter";

export default function AttendanceReport() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Persistent institute filter across month navigation, student views, and browser back/forward
  const [instituteFilter, setInstituteFilterState] = useState(() => {
    const fromUrl = searchParams.get("institute");
    if (fromUrl) return fromUrl;
    try {
      const fromStorage = localStorage.getItem(STORAGE_KEY);
      if (fromStorage) return fromStorage;
    } catch (e) {}
    return "all";
  });

  const [students, setStudents] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [metaLoading, setMetaLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Handle institute filter change with persistent URL and localStorage
  const handleInstituteChange = useCallback(
    (val) => {
      setInstituteFilterState(val);
      try {
        localStorage.setItem(STORAGE_KEY, val);
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
    },
    [setSearchParams]
  );

  // Sync if URL query param changes via browser Back/Forward
  useEffect(() => {
    const fromUrl = searchParams.get("institute") || "all";
    if (fromUrl !== instituteFilter) {
      setInstituteFilterState(fromUrl);
      try {
        localStorage.setItem(STORAGE_KEY, fromUrl);
      } catch (e) {}
    }
  }, [searchParams, instituteFilter]);

  // Load students & institutes once on initial mount
  useEffect(() => {
    let active = true;
    const loadMeta = async () => {
      try {
        const [stdRes, instRes] = await Promise.all([
          api.get("/students"),
          api.get("/institutes"),
        ]);
        if (!active) return;
        const activeStudents = (stdRes.data || []).filter(
          (s) => s.status === "active"
        );
        setStudents(activeStudents);
        setInstitutes(instRes.data || []);
      } catch (e) {
        if (active) toast.error(formatApiError(e));
      } finally {
        if (active) setMetaLoading(false);
      }
    };
    loadMeta();
    return () => {
      active = false;
    };
  }, []);

  // Load attendance data whenever year or month changes
  const loadAttendance = useCallback(
    async (y, m) => {
      setAttendanceLoading(true);
      try {
        const startDate = new Date(y, m, 1).toLocaleDateString("en-CA");
        const endDate = new Date(y, m + 1, 0).toLocaleDateString("en-CA");
        const { data } = await api.get(
          `/attendance?start_date=${startDate}&end_date=${endDate}`
        );
        setAttendance(data || []);
      } catch (e) {
        toast.error(formatApiError(e));
      } finally {
        setAttendanceLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadAttendance(year, month);
  }, [year, month, loadAttendance]);

  // Month navigation: purely updates currentDate, NEVER touches or resets instituteFilter
  const prevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const [actionDate, setActionDate] = useState(() =>
    new Date().toLocaleDateString("en-CA")
  );
  const [bulkLoading, setBulkLoading] = useState(false);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const today = new Date();
  const isCurrentMonth =
    currentDate.getFullYear() === today.getFullYear() &&
    currentDate.getMonth() === today.getMonth();
  const todayDay = isCurrentMonth ? today.getDate() : null;

  const markAllPresentForDate = async () => {
    if (filteredStudents.length === 0) {
      toast.info("No students in the selected scope to mark attendance for.");
      return;
    }
    setBulkLoading(true);
    try {
      const targetDate = actionDate;
      const newRecords = filteredStudents.map((s) => ({
        student_id: s.id,
        date: targetDate,
        status: "present",
        topic: "Class",
      }));

      // Optimistic update
      setAttendance((prev) => {
        const remaining = prev.filter(
          (a) =>
            !(
              a.date === targetDate &&
              filteredStudents.some((s) => s.id === a.student_id)
            )
        );
        return [...remaining, ...newRecords];
      });

      await Promise.all(
        filteredStudents.map((s) =>
          api.post("/attendance", {
            student_id: s.id,
            date: targetDate,
            status: "present",
            topic: "Class",
          })
        )
      );

      toast.success(
        `Marked ${filteredStudents.length} student${
          filteredStudents.length === 1 ? "" : "s"
        } as Present for ${targetDate}`
      );
    } catch (e) {
      toast.error(formatApiError(e));
      loadAttendance(year, month);
    } finally {
      setBulkLoading(false);
    }
  };

  // Map attendance: student_id -> { date (YYYY-MM-DD) -> status }
  const attendanceMap = useMemo(() => {
    const map = {};
    attendance.forEach((a) => {
      if (!map[a.student_id]) {
        map[a.student_id] = {};
      }
      map[a.student_id][a.date] = a.status;
    });
    return map;
  }, [attendance]);

  // Filter students based on selected institution and search query
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesInstitute =
        instituteFilter === "all"
          ? true
          : instituteFilter === "unassigned"
          ? !s.institute_id
          : String(s.institute_id || "") === String(instituteFilter);

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = q
        ? s.name?.toLowerCase().includes(q) ||
          s.phone?.includes(q) ||
          s.parent_name?.toLowerCase().includes(q) ||
          s.institute_name?.toLowerCase().includes(q)
        : true;

      return matchesInstitute && matchesQuery;
    });
  }, [students, instituteFilter, searchQuery]);

  // Selected institute label for the Select display
  const selectedInstituteLabel = useMemo(() => {
    if (instituteFilter === "all") {
      return `All Institutions (${students.length})`;
    }
    if (instituteFilter === "unassigned") {
      const count = students.filter((s) => !s.institute_id).length;
      return `Direct Enrollment (${count})`;
    }
    const found = institutes.find((i) => String(i.id) === String(instituteFilter));
    if (found) {
      const count = students.filter(
        (s) => String(s.institute_id) === String(found.id)
      ).length;
      return `${found.name} (${count})`;
    }
    return "Select Institution";
  }, [instituteFilter, students, institutes]);

  const toggleAttendance = async (studentId, dateStr, currentStatus) => {
    const nextStatus = !currentStatus
      ? "present"
      : currentStatus === "present"
      ? "absent"
      : currentStatus === "absent"
      ? "late"
      : null;

    // Optimistic UI update
    setAttendance((prev) => {
      const existingIdx = prev.findIndex(
        (a) => a.student_id === studentId && a.date === dateStr
      );
      if (nextStatus === null) {
        if (existingIdx >= 0) {
          const nextAtt = [...prev];
          nextAtt.splice(existingIdx, 1);
          return nextAtt;
        }
        return prev;
      }
      if (existingIdx >= 0) {
        const nextAtt = [...prev];
        nextAtt[existingIdx] = { ...nextAtt[existingIdx], status: nextStatus };
        return nextAtt;
      } else {
        return [
          ...prev,
          { student_id: studentId, date: dateStr, status: nextStatus, topic: "Class" },
        ];
      }
    });

    try {
      if (nextStatus === null) {
        await api.delete(`/attendance?student_id=${studentId}&date=${dateStr}`);
      } else {
        await api.post("/attendance", {
          student_id: studentId,
          date: dateStr,
          status: nextStatus,
          topic: "Class",
        });
      }
    } catch (e) {
      toast.error(formatApiError(e));
      loadAttendance(year, month);
    }
  };

  const handleExportPDF = () => {
    const head = ["Student Name", "Campus", "Total Absents (A)", "Total Presents (P)"];

    const summaryData = filteredStudents.map((s) => {
      const stdAtt = attendanceMap[s.id] || {};
      let presentCount = 0;
      let absentCount = 0;

      for (const day of daysArray) {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
          day
        ).padStart(2, "0")}`;
        const status = stdAtt[dateStr];
        if (status === "present" || status === "late") presentCount++;
        else if (status === "absent") absentCount++;
      }

      return {
        name: s.name,
        campus: s.institute_name || "Direct Enrollment",
        presentCount,
        absentCount,
      };
    });

    summaryData.sort((a, b) => b.absentCount - a.absentCount);

    const body = summaryData.map((s) => [
      s.name,
      s.campus,
      String(s.absentCount),
      String(s.presentCount),
    ]);
    const totalAbsents = summaryData.reduce((acc, s) => acc + s.absentCount, 0);

    const monthName = currentDate.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
    const selectedInstName =
      instituteFilter === "all"
        ? "All Institutions"
        : instituteFilter === "unassigned"
        ? "Direct Enrollment"
        : institutes.find((i) => String(i.id) === String(instituteFilter))?.name ||
          "Selected Institution";

    generatePDF({
      title: `Monthly Attendance Summary - ${monthName}`,
      filename: `attendance_summary_${selectedInstName.replace(
        /\s+/g,
        "_"
      )}_${monthName.replace(/\s+/g, "_")}.pdf`,
      summary: [
        `Institution: ${selectedInstName}`,
        `Total Students in Scope: ${filteredStudents.length}`,
        `Total Absences Recorded: ${totalAbsents}`,
        `Below is the list of students prioritized by maximum absents.`,
      ],
      head,
      body,
      orientation: "portrait",
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <div className="label-over">Reports</div>
          <h1 className="text-4xl font-serif">Attendance</h1>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {user?.role === "admin" && (
            <Button
              variant="outline"
              onClick={handleExportPDF}
              className="rounded-xl h-10"
              disabled={metaLoading}
            >
              <FileText className="w-4 h-4 mr-1.5" /> PDF
            </Button>
          )}
          <div className="flex items-center gap-4 bg-white border border-border/40 shadow-sm rounded-xl p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevMonth}
              className="rounded-xl"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="font-medium text-sm w-36 text-center uppercase tracking-widest select-none">
              {currentDate.toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              className="rounded-xl"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filter and Institution Selection Bar */}
      <div className="bg-white border border-border/40 shadow-sm rounded-xl p-3 md:p-4 mb-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search student by name, phone or campus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl bg-slate-50/50 border-border/60 text-sm h-10"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap hidden sm:inline">
                Institute:
              </span>
              <Select
                value={instituteFilter}
                onValueChange={handleInstituteChange}
              >
                <SelectTrigger
                  data-testid="attendance-institution-select"
                  className="w-full sm:w-[280px] rounded-xl bg-white shadow-sm border-primary/40 text-xs h-10 font-medium"
                >
                  <Building2 className="w-3.5 h-3.5 mr-1.5 text-primary shrink-0" />
                  <SelectValue>{selectedInstituteLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-72">
                  <SelectItem value="all">
                    All Institutions ({students.length})
                  </SelectItem>
                  <SelectItem value="unassigned">
                    Direct Enrollment ({students.filter((s) => !s.institute_id).length})
                  </SelectItem>
                  {institutes.length > 0 && <SelectSeparator className="my-1" />}
                  {institutes.map((inst) => {
                    const count = students.filter(
                      (s) => String(s.institute_id) === String(inst.id)
                    ).length;
                    return (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.name} ({count})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {instituteFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleInstituteChange("all")}
                className="h-10 text-xs text-muted-foreground hover:text-foreground rounded-xl"
                title="Reset to All Institutions"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> All
              </Button>
            )}
          </div>
        </div>

        {/* Quick Mark Attendance for Selected Scope */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-border/40 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground flex items-center gap-1.5 whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>Mark Date:</span>
            </span>
            <Input
              type="date"
              value={actionDate}
              onChange={(e) => setActionDate(e.target.value)}
              className="w-auto h-8 text-xs rounded-lg bg-white border-border/60"
            />
            {user?.role === "admin" && (
              <Button
                size="sm"
                variant="outline"
                onClick={markAllPresentForDate}
                disabled={bulkLoading || filteredStudents.length === 0}
                className="h-8 text-xs rounded-lg border-success/40 text-success hover:bg-success/10 hover:text-success font-medium"
                title={`Mark all ${filteredStudents.length} students as present for ${actionDate}`}
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1.5 text-success" />
                {bulkLoading ? "Saving..." : `Mark All Present (${filteredStudents.length})`}
              </Button>
            )}
          </div>

          <div className="text-muted-foreground text-[11px] flex items-center gap-2 flex-wrap">
            <span>
              Showing <strong>{filteredStudents.length}</strong> active student{filteredStudents.length === 1 ? "" : "s"}
              {instituteFilter !== "all" && (
                <span className="text-primary font-medium ml-1">
                  for {institutes.find((i) => String(i.id) === String(instituteFilter))?.name || "Direct Enrollment"}
                </span>
              )}
            </span>
            <span className="text-border hidden sm:inline">|</span>
            <span className="italic hidden sm:inline">Click table cells to toggle P / A / L</span>
          </div>
        </div>
      </div>

      {metaLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          Loading student roster...
        </div>
      ) : (
        <div
          className={`bg-white border border-border/40 shadow-sm rounded-xl overflow-x-auto transition-opacity duration-150 ${
            attendanceLoading ? "opacity-60" : "opacity-100"
          }`}
        >
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-secondary/50 border-b border-border/60">
              <tr>
                <th className="px-4 py-3 font-medium uppercase tracking-widest text-xs sticky left-0 bg-secondary z-10 border-r border-border/60">
                  Student Name ({filteredStudents.length})
                </th>
                {daysArray.map((day) => {
                  const isTodayCol = day === todayDay;
                  return (
                    <th
                      key={day}
                      className={`px-2 py-2 text-center text-xs border-r border-border/60 last:border-r-0 min-w-[34px] ${
                        isTodayCol
                          ? "bg-primary/15 text-primary font-bold"
                          : "font-medium text-muted-foreground"
                      }`}
                      title={isTodayCol ? "Today" : undefined}
                    >
                      <div>{day}</div>
                      {isTodayCol && (
                        <div className="text-[8px] uppercase tracking-tighter text-primary font-bold leading-none">
                          Today
                        </div>
                      )}
                    </th>
                  );
                })}
                <th className="px-4 py-3 font-medium uppercase tracking-widest text-xs text-center border-l border-border/60">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredStudents.map((s) => {
                const stdAtt = attendanceMap[s.id] || {};
                let presentCount = 0;
                let absentCount = 0;

                return (
                  <tr key={s.id} className="hover:bg-secondary/20">
                    <td className="px-4 py-3 sticky left-0 bg-white border-r border-border/60 z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)]">
                      <Link
                        to={`/students/${s.id}`}
                        className="font-medium hover:underline flex items-center gap-2"
                      >
                        <span>{s.name}</span>
                        {s.institute_name && instituteFilter === "all" && (
                          <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            {s.institute_name}
                          </span>
                        )}
                      </Link>
                    </td>
                    {daysArray.map((day) => {
                      const dateStr = `${year}-${String(month + 1).padStart(
                        2,
                        "0"
                      )}-${String(day).padStart(2, "0")}`;
                      const status = stdAtt[dateStr];

                      if (status === "present") presentCount++;
                      if (status === "absent") absentCount++;
                      if (status === "late") presentCount++;

                      const Icon = STATUS_ICONS[status]?.icon;
                      const color = STATUS_ICONS[status]?.color;
                      const isTodayCol = day === todayDay;

                      return (
                        <td
                          key={day}
                          className={`px-2 py-2 text-center border-r border-border/60 last:border-r-0 cursor-pointer hover:bg-secondary/60 transition-colors ${
                            isTodayCol ? "bg-primary/5" : ""
                          }`}
                          onClick={() => toggleAttendance(s.id, dateStr, status)}
                          title={`Click to toggle attendance (${dateStr})`}
                        >
                          {Icon ? (
                            <Icon
                              className={`w-3.5 h-3.5 mx-auto ${color}`}
                              title={`${status} on ${dateStr}`}
                            />
                          ) : (
                            <span className="text-muted-foreground/30">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 border-l border-border/60 text-center">
                      <div className="flex flex-col items-center justify-center text-xs">
                        <span
                          className="text-success font-medium"
                          title="Present (including late)"
                        >
                          {presentCount} P
                        </span>
                        <span className="text-destructive font-medium" title="Absent">
                          {absentCount} A
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td
                    colSpan={daysArray.length + 2}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No active students found for the selected institution.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

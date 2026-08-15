import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { generatePDF } from "@/lib/pdfExport";

const STATUS_ICONS = {
  present: { icon: CheckCircle2, color: "text-success" },
  absent: { icon: XCircle, color: "text-destructive" },
  late: { icon: Clock, color: "text-warning" },
};

export default function AttendanceReport() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const load = async () => {
    setLoading(true);
    try {
      // Get all active students
      const { data: stdData } = await api.get("/students");
      const activeStudents = stdData.filter((s) => s.status === "active");
      setStudents(activeStudents);

      // Determine start and end date for the selected month
      const startDate = new Date(year, month, 1).toLocaleDateString("en-CA"); // YYYY-MM-DD
      const endDate = new Date(year, month + 1, 0).toLocaleDateString("en-CA");

      const { data: attData } = await api.get(`/attendance?start_date=${startDate}&end_date=${endDate}`);
      setAttendance(attData);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [year, month]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

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

  const toggleAttendance = async (studentId, dateStr, currentStatus) => {
    // Determine next status: empty -> present -> absent -> late -> empty...
    const nextStatus = !currentStatus ? "present" : currentStatus === "present" ? "absent" : currentStatus === "absent" ? "late" : null;
    
    // Optimistic UI update
    setAttendance((prev) => {
      const existingIdx = prev.findIndex(a => a.student_id === studentId && a.date === dateStr);
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
        return [...prev, { student_id: studentId, date: dateStr, status: nextStatus, topic: "Class" }];
      }
    });

    try {
      if (nextStatus === null) {
        await api.delete(`/attendance?student_id=${studentId}&date=${dateStr}`);
      } else {
        await api.post("/attendance", { student_id: studentId, date: dateStr, status: nextStatus, topic: "Class" });
      }
    } catch (e) {
      toast.error(formatApiError(e));
      // Revert on error
      load(); 
    }
  };

  const handleExportPDF = () => {
    const head = ["Student Name", "Total Absents (A)", "Total Presents (P)"];
    
    // Calculate totals for all students
    const summaryData = students.map((s) => {
      const stdAtt = attendanceMap[s.id] || {};
      let presentCount = 0;
      let absentCount = 0;
      
      for (const day of daysArray) {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const status = stdAtt[dateStr];
        if (status === "present" || status === "late") presentCount++;
        else if (status === "absent") absentCount++;
      }
      
      return { name: s.name, presentCount, absentCount };
    });

    // Sort by max absents
    summaryData.sort((a, b) => b.absentCount - a.absentCount);
    
    const body = summaryData.map(s => [s.name, String(s.absentCount), String(s.presentCount)]);
    const totalAbsents = summaryData.reduce((acc, s) => acc + s.absentCount, 0);

    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    generatePDF({
      title: `Monthly Attendance Summary - ${monthName}`,
      filename: `attendance_summary_${monthName.replace(" ", "_")}.pdf`,
      summary: [
        `Total Enrolled Students: ${students.length}`,
        `Total Absences Recorded: ${totalAbsents}`,
        `Below is the list of students prioritized by maximum absents.`
      ],
      head,
      body,
      orientation: "portrait"
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <div className="label-over">Reports</div>
          <h1 className="text-4xl font-serif">Attendance</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {user?.role === "admin" && (
            <Button variant="outline" onClick={handleExportPDF} className="rounded-none h-10">
              <FileText className="w-4 h-4 mr-1.5" /> PDF
            </Button>
          )}
          <div className="flex items-center gap-4 bg-white border border-border/60 p-1">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-none">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="font-medium text-sm w-32 text-center uppercase tracking-widest">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </div>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-none">
            <ChevronRight className="w-4 h-4" />
          </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="bg-white border border-border/60 overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-secondary/50 border-b border-border/60">
              <tr>
                <th className="px-4 py-3 font-medium uppercase tracking-widest text-xs sticky left-0 bg-secondary z-10 border-r border-border/60">
                  Student Name
                </th>
                {daysArray.map((day) => (
                  <th key={day} className="px-2 py-3 font-medium text-center text-xs text-muted-foreground border-r border-border/60 last:border-r-0 min-w-[32px]">
                    {day}
                  </th>
                ))}
                <th className="px-4 py-3 font-medium uppercase tracking-widest text-xs text-center border-l border-border/60">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {students.map((s) => {
                const stdAtt = attendanceMap[s.id] || {};
                let presentCount = 0;
                let absentCount = 0;

                return (
                  <tr key={s.id} className="hover:bg-secondary/20">
                    <td className="px-4 py-3 sticky left-0 bg-white border-r border-border/60 z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)]">
                      <Link to={`/students/${s.id}`} className="font-medium hover:underline">
                        {s.name}
                      </Link>
                    </td>
                    {daysArray.map((day) => {
                      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const status = stdAtt[dateStr];
                      
                      if (status === "present") presentCount++;
                      if (status === "absent") absentCount++;
                      if (status === "late") presentCount++; // Usually late counts as present

                      const Icon = STATUS_ICONS[status]?.icon;
                      const color = STATUS_ICONS[status]?.color;

                      return (
                        <td 
                          key={day} 
                          className="px-2 py-2 text-center border-r border-border/60 last:border-r-0 cursor-pointer hover:bg-secondary/60 transition-colors"
                          onClick={() => toggleAttendance(s.id, dateStr, status)}
                          title="Click to toggle attendance"
                        >
                          {Icon ? (
                            <Icon className={`w-3.5 h-3.5 mx-auto ${color}`} title={`${status} on ${dateStr}`} />
                          ) : (
                            <span className="text-muted-foreground/30">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 border-l border-border/60 text-center">
                      <div className="flex flex-col items-center justify-center text-xs">
                        <span className="text-success font-medium" title="Present (including late)">{presentCount} P</span>
                        <span className="text-destructive font-medium" title="Absent">{absentCount} A</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {students.length === 0 && (
                <tr>
                  <td colSpan={daysArray.length + 2} className="px-4 py-8 text-center text-muted-foreground">
                    No active students found.
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

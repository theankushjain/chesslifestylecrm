import { useState, useEffect } from "react";
import { Bell, CheckCircle2, AlertTriangle, BookOpen } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function NotificationBell() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    
    const fetchAlerts = async () => {
      try {
        const { data } = await api.get("/alerts");
        setAlerts(data || []);
      } catch (err) {
        console.error("Failed to fetch alerts:", err);
      }
    };
    
    fetchAlerts();
    // Refresh alerts periodically (e.g., every 3 minutes)
    const interval = setInterval(fetchAlerts, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) {
    return null;
  }

  const handleAlertClick = async (alert) => {
    setOpen(false);

    if (alert.id && !String(alert.id).startsWith("att-") && !String(alert.id).startsWith("bday-")) {
      try {
        await api.post(`/notifications/${alert.id}/read`);
        setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
      } catch {
        // Non-critical, ignore
      }
    }

    if (user?.role === "student") {
      if (alert.type === "attendance") {
        navigate("/portal?tab=attendance");
      } else if (alert.type === "task") {
        navigate("/tasks");
      } else {
        navigate("/portal");
      }
      return;
    }

    if (alert.type === "task") navigate("/tasks");
    else if (alert.type === "lead_followup") navigate("/leads");
    else if (alert.type === "unpaid_fee") navigate("/payments");
    else if (alert.type === "attendance") navigate("/students");
    else if (alert.type === "birthday") navigate("/students");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5 md:w-4 md:h-4" />
          {alerts.length > 0 && (
            <span className="absolute top-0 right-0 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
              {alerts.length > 9 ? "9+" : alerts.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 shadow-lg" align="end">
        <div className="p-3 border-b border-border/40 flex items-center justify-between">
          <h4 className="font-medium text-sm">Notifications</h4>
          <span className="text-xs text-muted-foreground">{alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'}</span>
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-border/20">
          {alerts.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => handleAlertClick(alert)}
                className="p-3 hover:bg-secondary/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between mb-1 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {alert.type === "attendance" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : alert.type === "task" ? (
                      <BookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                    <span className={`text-xs font-semibold truncate ${
                      alert.type === "attendance"
                        ? "text-emerald-700"
                        : alert.severity === "high"
                        ? "text-red-500"
                        : "text-amber-600"
                    }`}>
                      {alert.title}
                    </span>
                  </div>
                  {alert.date && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {alert.date}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground pl-5 leading-relaxed">
                  {alert.message}
                </p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

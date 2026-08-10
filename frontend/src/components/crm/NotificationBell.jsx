import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
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
    if (!user || user.role === "student") return;
    
    const fetchAlerts = async () => {
      try {
        const { data } = await api.get("/alerts");
        setAlerts(data);
      } catch (err) {
        console.error("Failed to fetch alerts:", err);
      }
    };
    
    fetchAlerts();
    // Refresh alerts periodically (e.g., every 5 minutes)
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user || user.role === "student") {
    return null;
  }

  const handleAlertClick = (alert) => {
    setOpen(false);
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
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border/40 flex items-center justify-between">
          <h4 className="font-medium text-sm">Notifications</h4>
          <span className="text-xs text-muted-foreground">{alerts.length} alerts</span>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => handleAlertClick(alert)}
                className="p-3 border-b border-border/40 hover:bg-secondary/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold ${alert.severity === "high" ? "text-red-500" : "text-amber-500"}`}>
                    {alert.title}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
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

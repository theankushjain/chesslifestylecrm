import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { 
  AlertTriangle, Users, Target, IndianRupee, TrendingUp, PhoneCall, 
  Circle, Cake, CalendarDays, Clock, CheckCircle2, Search, MessageCircle, ExternalLink,
  Bell, BellOff, BellRing 
} from "lucide-react";
import { Link } from "react-router-dom";
import { subscribeUserToPush } from "@/lib/push";
import { Button } from "@/components/ui/button";

const SEVERITY = {
  high: { color: "border-l-destructive", label: "URGENT", tint: "text-destructive" },
  medium: { color: "border-l-warning", label: "SOON", tint: "text-warning" },
  low: { color: "border-l-muted-foreground", label: "INFO", tint: "text-muted-foreground" },
};

const ICONS = {
  unpaid_fee: IndianRupee,
  lead_followup: PhoneCall,
  attendance: AlertTriangle,
  birthday: Cake,
};

export default function Dashboard() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [todayClasses, setTodayClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifState, setNotifState] = useState('Notification' in window ? Notification.permission : 'unsupported');
  const [feeTab, setFeeTab] = useState("paid");
  const [feeSearch, setFeeSearch] = useState("");

  const handleNotificationClick = async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      setNotifState(perm);
      if (perm === 'granted') {
        subscribeUserToPush();
      }
    } else if (Notification.permission === 'granted') {
      // Already granted, just ensure subscribed
      subscribeUserToPush();
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [a, s, t] = await Promise.all([
          api.get("/alerts"), api.get("/stats"), api.get("/schedule/today")
        ]);
        setAlerts(a.data);
        setStats(s.data);
        setTodayClasses(t.data);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="label-over">Dashboard</div>
          <h1 className="text-4xl md:text-5xl font-serif">Good day, {user.name.split(" ")[0]}.</h1>
          <p className="text-sm text-muted-foreground mt-1">Here's what needs your attention today.</p>
        </div>
        
        {notifState !== 'unsupported' && (
          <Button 
            variant="outline" 
            onClick={handleNotificationClick}
            disabled={notifState === 'denied'}
            className={`rounded-xl flex items-center gap-2 ${notifState === 'granted' ? 'border-primary text-primary' : ''}`}
          >
            {notifState === 'granted' && <><BellRing className="w-4 h-4" /> Notifications Enabled</>}
            {notifState === 'default' && <><Bell className="w-4 h-4" /> Enable Notifications</>}
            {notifState === 'denied' && <><BellOff className="w-4 h-4" /> Notifications Blocked</>}
          </Button>
        )}
      </div>

      {/* Today's Classes */}
      <section className="mb-8" data-testid="today-classes-section">
        <div className="flex items-center justify-between mb-3">
          <div className="label-over">Today's classes ({todayClasses.length})</div>
          <Link to="/classes" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
            All batches →
          </Link>
        </div>
        {todayClasses.length === 0 ? (
          <div className="border border-border/40 shadow-sm rounded-xl p-4 text-sm text-muted-foreground bg-white">
            No classes scheduled today. Enjoy the break.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {todayClasses.map((c) => (
              <Link key={c.id} to={`/classes/${c.id}`} data-testid={`today-class-${c.id}`}
                className="flex items-center gap-3 p-4 bg-white border border-border/40 shadow-sm rounded-xl hover:border-primary transition-colors group">
                <div className="w-12 h-12 bg-primary text-primary-foreground flex flex-col items-center justify-center shrink-0">
                  <div className="text-[9px] uppercase tracking-widest opacity-70 leading-none">Class</div>
                  <CalendarDays className="w-4 h-4 mt-0.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.time} · {c.duration_min}m</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.student_count}</span>
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground group-hover:text-foreground">
                  Take →
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Alerts */}
      <section className="mb-8" data-testid="alerts-section">
        <div className="flex items-center justify-between mb-3">
          <div className="label-over">Alerts ({alerts.length})</div>
          <div className="text-xs text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        </div>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : alerts.length === 0 ? (
          <div className="border border-border/40 shadow-sm rounded-xl p-6 text-sm text-muted-foreground bg-white">
            All caught up. No alerts right now.
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => {
              const sev = SEVERITY[a.severity] || SEVERITY.low;
              const Icon = ICONS[a.type] || Circle;
              const link = a.type === "lead_followup" ? "/leads" :
                          a.type === "unpaid_fee" ? "/payments" :
                          a.type === "birthday" ? `/students/${a.student_id}` : "/students";
              return (
                <Link key={a.id + a.type} to={link} data-testid={`alert-${a.type}-${a.id}`}
                  className={`flex items-start gap-3 p-4 bg-white border border-border/40 shadow-sm rounded-xl border-l-4 ${sev.color} hover:bg-secondary/40 transition-colors`}>
                  <Icon className={`w-4 h-4 mt-0.5 ${sev.tint}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] uppercase tracking-widest font-medium ${sev.tint}`}>{sev.label}</span>
                    </div>
                    <div className="font-medium text-sm mt-0.5">{a.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{a.message}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Stats */}
      {stats && (
        <section className="mb-8">
          <div className="label-over mb-3">Overview</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/60 border border-border/40 shadow-sm rounded-xl">
            <StatCard icon={Users} label="Active students" value={stats.total_students} testid="stat-students" />
            <StatCard icon={Target} label="Total leads" value={stats.total_leads} sub={`${stats.hot_leads} hot`} testid="stat-leads" />
            <StatCard icon={IndianRupee} label="Month revenue" value={`₹${stats.month_revenue.toLocaleString('en-IN')}`} testid="stat-revenue" />
            <StatCard icon={AlertTriangle} label="Unpaid this month" value={stats.unpaid_count} testid="stat-unpaid" />
          </div>
        </section>
      )}

      {/* Current Month Fee Collection Status */}
      {stats && (
        <section className="mb-8" data-testid="current-month-fees-section">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <div className="label-over">Fee Collections · {stats.current_month_name} {stats.current_year}</div>
              <h2 className="text-xl font-serif">Current Month's Fees</h2>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/payments" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-1">
                View all payments <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="bg-white border border-border/40 shadow-sm rounded-xl p-4 md:p-6">
            {/* Tabs & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
              <div className="inline-flex rounded-lg bg-secondary/60 p-1 border border-border/40">
                <button
                  type="button"
                  onClick={() => setFeeTab("paid")}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    feeTab === "paid" 
                      ? "bg-white text-emerald-800 shadow-sm font-semibold" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Received ({stats.paid_count || 0})</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono">
                    ₹{(stats.month_revenue || 0).toLocaleString("en-IN")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setFeeTab("unpaid")}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    feeTab === "unpaid" 
                      ? "bg-white text-rose-800 shadow-sm font-semibold" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Pending ({stats.unpaid_count || 0})</span>
                  <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-mono">
                    ₹{(stats.unpaid_amount || 0).toLocaleString("en-IN")}
                  </span>
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter student or institute..."
                  value={feeSearch}
                  onChange={(e) => setFeeSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-border/50 bg-secondary/20 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Students list */}
            {(() => {
              const list = feeTab === "paid" ? (stats.paid_students || []) : (stats.unpaid_students || []);
              const filtered = list.filter((s) => {
                if (!feeSearch) return true;
                const q = feeSearch.toLowerCase();
                return (s.name || "").toLowerCase().includes(q) || (s.institute_name || "").toLowerCase().includes(q);
              });

              if (filtered.length === 0) {
                return (
                  <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                    {feeTab === "paid" 
                      ? (stats.paid_count === 0 ? `No fees received yet for ${stats.current_month_name}.` : "No matching paid students found.")
                      : (stats.unpaid_count === 0 ? `All students have paid fees for ${stats.current_month_name}! 🎉` : "No matching pending students found.")}
                  </div>
                );
              }

              return (
                <div className="divide-y divide-border/30 max-h-80 overflow-y-auto pr-1">
                  {filtered.map((s) => (
                    <div key={s.student_id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-secondary/20 px-2 rounded-lg transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {feeTab === "paid" ? (
                          <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link to={`/students/${s.student_id}`} className="font-medium text-sm hover:underline hover:text-primary truncate">
                              {s.name}
                            </Link>
                            {s.institute_name && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border shrink-0">
                                {s.institute_name}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {feeTab === "paid" ? (
                              <span>Paid {s.paid_date ? new Date(s.paid_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : `in ${stats.current_month_name}`}</span>
                            ) : (
                              <span className="text-rose-600 font-medium">Pending for {stats.current_month_name}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-sm font-semibold">
                          ₹{s.amount.toLocaleString("en-IN")}
                        </span>
                        {feeTab === "unpaid" && s.phone && (
                          <a
                            href={`https://wa.me/${s.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Dear Parent, this is a gentle reminder regarding chess fee payment of ₹${s.amount} for ${s.name} for ${stats.current_month_name}. Kindly clear it at your earliest convenience.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md border border-emerald-200 text-xs flex items-center gap-1"
                            title="Remind on WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-[11px]">Remind</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* Funnel */}
      {stats && (
        <section>
          <div className="label-over mb-3">Lead pipeline</div>
          <div className="bg-white border border-border/40 shadow-sm rounded-xl p-4 md:p-6">
            <div className="space-y-3">
              {Object.entries(stats.funnel).map(([stage, count]) => {
                const total = Object.values(stats.funnel).reduce((s, v) => s + v, 0) || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={stage} data-testid={`funnel-${stage}`}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="uppercase tracking-widest">{stage.replace("_", " ")}</span>
                      <span className="font-mono">{count} · {pct}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary">
                      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

const StatCard = ({ icon: Icon, label, value, sub, testid }) => (
  <div className="bg-white p-4 md:p-6" data-testid={testid}>
    <div className="flex items-start justify-between">
      <div>
        <div className="label-over text-[9px]">{label}</div>
        <div className="text-2xl md:text-3xl font-serif mt-2">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </div>
      <Icon className="w-4 h-4 text-muted-foreground" />
    </div>
  </div>
);

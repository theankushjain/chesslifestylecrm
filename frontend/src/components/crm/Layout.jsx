import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Users as UsersIcon, Target, IndianRupee, MessageSquare, LogOut, User, CalendarDays, TrendingUp, UserCog, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard, testid: "nav-dashboard", roles: ["admin", "staff"] },
  { to: "/students", label: "Students", icon: UsersIcon, testid: "nav-students", roles: ["admin", "staff"] },
  { to: "/classes", label: "Classes", icon: CalendarDays, testid: "nav-classes", roles: ["admin", "staff"] },
  { to: "/leads", label: "Leads", icon: Target, testid: "nav-leads", roles: ["admin", "staff"] },
  { to: "/payments", label: "Fees", icon: IndianRupee, testid: "nav-payments", roles: ["admin", "staff"] },
  { to: "/tasks", label: "To-Do", icon: CheckSquare, testid: "nav-tasks", roles: ["admin", "staff", "student"] },
  { to: "/tally", label: "Tally", icon: TrendingUp, testid: "nav-tally", roles: ["admin"] },
  { to: "/users", label: "Users", icon: UserCog, testid: "nav-users", roles: ["admin"] },
  { to: "/chat", label: "AI", icon: MessageSquare, testid: "nav-chat", roles: ["admin", "staff"] },
  { to: "/portal", label: "My Portal", icon: User, testid: "nav-portal", roles: ["student"] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV.filter((n) => n.roles.includes(user.role));

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 border-r border-border/60 flex-col bg-white">
        <div className="p-6 border-b border-border/60">
          <div className="label-over mb-1">The Chess Lifestyle</div>
          <h1 className="text-2xl font-serif font-semibold leading-none">CRM</h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              data-testid={n.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm rounded transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-foreground"
                }`
              }
            >
              <n.icon className="w-4 h-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border/60">
          <div className="px-3 pb-3">
            <div className="text-xs text-muted-foreground">Signed in as</div>
            <div className="text-sm font-medium truncate">{user.name}</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-0.5">{user.role}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="logout-btn" className="w-full justify-start">
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden glass-nav sticky top-0 z-30 border-b border-border/40 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="label-over" style={{ fontSize: "0.6rem" }}>The Chess Lifestyle</div>
          <h1 className="text-xl font-serif font-semibold leading-none -mt-0.5">CRM</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="logout-btn-mobile">
          <LogOut className="w-5 h-5" />
        </Button>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-24 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-nav border-t border-border/40 z-40">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              data-testid={`${n.testid}-mobile`}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[10px] uppercase tracking-widest transition-colors ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <n.icon className={`w-5 h-5 ${isActive ? "" : "opacity-70"}`} />
                  <span>{n.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

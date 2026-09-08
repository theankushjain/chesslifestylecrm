import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Users as UsersIcon, Target, IndianRupee, MessageSquare, LogOut, User, CalendarDays, TrendingUp, UserCog, CheckSquare, Menu, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import NotificationBell from "./NotificationBell";

const NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard, testid: "nav-dashboard", roles: ["admin"] },
  { to: "/students", label: "Students", icon: UsersIcon, testid: "nav-students", roles: ["admin", "staff"] },
  { to: "/classes", label: "Classes", icon: CalendarDays, testid: "nav-classes", roles: ["admin", "staff"] },
  { to: "/attendance", label: "Attendance", icon: ClipboardList, testid: "nav-attendance", roles: ["admin", "staff"] },
  { to: "/leads", label: "Leads", icon: Target, testid: "nav-leads", roles: ["admin"] },
  { to: "/payments", label: "Fees", icon: IndianRupee, testid: "nav-payments", roles: ["admin"] },
  { to: "/tasks", label: "To-Do", icon: CheckSquare, testid: "nav-tasks", roles: ["admin", "staff", "student"] },
  { to: "/tally", label: "Tally", icon: TrendingUp, testid: "nav-tally", roles: ["admin"] },
  { to: "/users", label: "Users", icon: UserCog, testid: "nav-users", roles: ["admin"] },
  { to: "/chat", label: "AI", icon: MessageSquare, testid: "nav-chat", roles: ["admin"] },
  { to: "/portal", label: "My Portal", icon: User, testid: "nav-portal", roles: ["student"] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV.filter((n) => n.roles.includes(user.role));
  
  const MAX_VISIBLE = 4;
  const visibleItems = items.length > MAX_VISIBLE ? items.slice(0, 3) : items;
  const hiddenItems = items.length > MAX_VISIBLE ? items.slice(3) : [];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans selection:bg-brand/20">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col bg-[#242B38] text-white shadow-xl z-20">
        <div className="p-6 border-b border-white/10">
          <div className="text-[10px] uppercase tracking-widest text-white/50 font-medium mb-1">The Chess Lifestyle</div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">CRM</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              data-testid={n.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                  isActive 
                    ? "bg-[#F58B10] text-white shadow-md shadow-[#F58B10]/20" 
                    : "hover:bg-white/10 text-white/70 hover:text-white"
                }`
              }
            >
              <n.icon className="w-5 h-5" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 bg-black/10">
          <div className="px-3 pb-4">
            <div className="text-[10px] text-white/50 uppercase tracking-widest font-medium">Signed in as</div>
            <div className="text-sm font-medium truncate flex items-center justify-between mt-1">
              {user.name}
              <div className="flex items-center gap-2">
                <NotificationBell />
                <NavLink to="/profile" className="text-white/50 hover:text-[#F58B10] transition-colors" title="My Profile">
                  <UserCog className="w-4 h-4" />
                </NavLink>
              </div>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-[#F58B10] mt-1 font-semibold">{user.role}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="logout-btn" className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10 rounded-xl">
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 bg-[#242B38] text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div>
          <div className="text-[9px] uppercase tracking-widest text-white/50 font-medium">The Chess Lifestyle</div>
          <h1 className="text-2xl font-serif font-bold leading-none mt-0.5">CRM</h1>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <NavLink to="/profile" className="p-2 text-white/70 hover:text-[#F58B10] transition-colors">
            <UserCog className="w-5 h-5" />
          </NavLink>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white/70 hover:text-white hover:bg-white/10 rounded-full" data-testid="logout-btn-mobile">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-24 md:pb-8 overflow-y-auto w-full">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border/40 z-40 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="grid px-2 pt-2" style={{ gridTemplateColumns: `repeat(${visibleItems.length + (hiddenItems.length > 0 ? 1 : 0)}, minmax(0, 1fr))` }}>
          {visibleItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              data-testid={`${n.testid}-mobile`}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1.5 py-2 px-1 text-[10px] font-medium transition-all duration-200 rounded-xl ${
                  isActive ? "text-[#F58B10]" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-[#F58B10]/10' : ''}`}>
                    <n.icon className={`w-5 h-5 ${isActive ? "" : "opacity-80"}`} />
                  </div>
                  <span className="truncate w-full text-center">{n.label}</span>
                </>
              )}
            </NavLink>
          ))}
          {hiddenItems.length > 0 && (
            <Sheet>
              <SheetTrigger asChild>
                <button className="flex flex-col items-center justify-center gap-1.5 py-2 px-1 text-[10px] font-medium transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-xl">
                  <div className="p-1.5 rounded-lg">
                    <Menu className="w-5 h-5 opacity-80" />
                  </div>
                  <span className="truncate w-full text-center">More</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="p-0 border-t rounded-t-2xl overflow-hidden h-[50vh] flex flex-col shadow-2xl">
                <div className="p-5 border-b border-border/40 bg-white">
                  <h2 className="font-serif font-bold text-xl">More Menu</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-3 grid gap-2 bg-neutral-50/50">
                  {hiddenItems.map((n) => (
                    <SheetTrigger key={n.to} asChild>
                      <NavLink
                        to={n.to}
                        end={n.to === "/"}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 ${
                            isActive 
                              ? "bg-[#F58B10] text-white shadow-md shadow-[#F58B10]/20" 
                              : "hover:bg-white border border-transparent hover:border-border/60 hover:shadow-sm bg-white text-foreground"
                          }`
                        }
                      >
                        <n.icon className="w-5 h-5" />
                        <span>{n.label}</span>
                      </NavLink>
                    </SheetTrigger>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </nav>
    </div>
  );
}

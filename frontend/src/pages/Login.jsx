import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Crown } from "lucide-react";

const AUTH_IMG = "https://images.pexels.com/photos/6041464/pexels-photo-6041464.jpeg";

const PRESETS = [
  { label: "Admin", email: "admin@thechesslifestyle.com", password: "admin123", testid: "preset-admin" },
  { label: "Staff", email: "staff@thechesslifestyle.com", password: "staff123", testid: "preset-staff" },
  { label: "Student", email: "aarav@student.com", password: "student123", testid: "preset-student" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}`);
      navigate(user.role === "student" ? "/portal" : "/");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (p) => { setEmail(p.email); setPassword(p.password); };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left visual */}
      <div className="hidden md:block relative overflow-hidden">
        <img src={AUTH_IMG} alt="Chess pieces" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 h-full flex flex-col justify-between p-10 text-white">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-brand" />
            <span className="label-over text-white/80">The Chess Lifestyle</span>
          </div>
          <div>
            <h2 className="font-serif text-5xl leading-tight">Every move,<br/>tracked.</h2>
            <p className="mt-4 text-white/70 max-w-sm">
              A CRM built for the rhythm of a chess academy. Students, leads, fees, follow-ups — one board, always in check.
            </p>
          </div>
          <div className="text-xs text-white/60">© {new Date().getFullYear()} thechesslifestyle.com</div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 md:p-12 chess-pattern">
        <div className="w-full max-w-md bg-white border border-border/60 p-8 md:p-10 animate-fade-in">
          <div className="mb-8">
            <div className="label-over mb-2">Sign in</div>
            <h1 className="font-serif text-4xl">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter your credentials to continue.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-xs uppercase tracking-widest">Email</Label>
              <Input
                id="email" type="email" required
                data-testid="login-email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 rounded-none border-x-0 border-t-0 border-b-2 px-0 focus-visible:ring-0 focus-visible:border-primary"
                placeholder="you@academy.com"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs uppercase tracking-widest">Password</Label>
              <Input
                id="password" type="password" required
                data-testid="login-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 rounded-none border-x-0 border-t-0 border-b-2 px-0 focus-visible:ring-0 focus-visible:border-primary"
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" disabled={loading} data-testid="login-submit"
              className="w-full rounded-none h-11 text-sm tracking-widest uppercase">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-8">
            <div className="label-over mb-3">Quick access</div>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label} type="button" onClick={() => applyPreset(p)}
                  data-testid={p.testid}
                  className="border border-border/60 py-2 text-xs uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KeyRound, User } from "lucide-react";

export default function Profile() {
  const { user, login } = useAuth(); // login function not directly used, but we could refresh user state if we had a dedicated refresh method. Actually, useAuth could just reload the window if name changes, or we can just update local state.
  const [form, setForm] = useState({
    name: user?.name || "",
    password: "",
    confirmPassword: ""
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.password && form.password !== form.confirmPassword) {
      return toast.error("Passwords do not match");
    }

    setSaving(true);
    try {
      const payload = {};
      if (form.name !== user.name) payload.name = form.name;
      if (form.password) payload.password = form.password;

      if (Object.keys(payload).length === 0) {
        toast.info("No changes to save");
        setSaving(false);
        return;
      }

      await api.patch("/auth/me", payload);
      toast.success("Profile updated successfully!");
      if (payload.password) {
        setForm({ ...form, password: "", confirmPassword: "" });
      }
      if (payload.name) {
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-serif font-semibold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings and password.</p>
      </div>

      <Card className="rounded-none border-border/60">
        <CardHeader className="bg-secondary/30 border-b border-border/60">
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> Profile Details
          </CardTitle>
          <CardDescription>Update your personal information.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Name</Label>
              <Input 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                className="rounded-none" 
                required
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-border/40">
              <div className="flex items-center gap-2 text-sm font-medium">
                <KeyRound className="w-4 h-4 text-muted-foreground" /> Change Password
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">New Password</Label>
                <Input 
                  type="password"
                  placeholder="Leave blank to keep current password"
                  value={form.password} 
                  onChange={(e) => setForm({ ...form, password: e.target.value })} 
                  className="rounded-none" 
                />
              </div>
              
              {form.password && (
                <div className="space-y-1.5 animate-in slide-in-from-top-1">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Confirm New Password</Label>
                  <Input 
                    type="password"
                    value={form.confirmPassword} 
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} 
                    className="rounded-none" 
                    required
                  />
                </div>
              )}
            </div>

            <Button type="submit" disabled={saving || !form.name} className="rounded-none w-full md:w-auto mt-4">
              {saving ? "Saving Changes..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

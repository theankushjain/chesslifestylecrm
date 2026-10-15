import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  GraduationCap,
  Home,
  Plus,
  Search,
  Users,
  Phone,
  MapPin,
  Pencil,
  Trash2,
  ChevronRight,
  School,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const INSTITUTE_TYPES = [
  { value: "School", label: "School", icon: GraduationCap, color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "Society", label: "Residential Society", icon: Home, color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "Academy", label: "Academy / Center", icon: Award, color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "Club", label: "Club", icon: Users, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "Other", label: "Other", icon: Building2, color: "bg-slate-50 text-slate-700 border-slate-200" },
];

export function getTypeBadge(type = "School") {
  const match = INSTITUTE_TYPES.find((t) => t.value === type) || INSTITUTE_TYPES[4];
  const Icon = match.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${match.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {match.label}
    </span>
  );
}

export default function Institutes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInstitute, setEditingInstitute] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const canEdit = user?.role === "admin" || user?.role === "staff";
  const canDelete = user?.role === "admin";

  const load = async () => {
    try {
      const { data } = await api.get("/institutes");
      setInstitutes(data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/institutes/${deleteTarget.id}`);
      toast.success(`Deleted ${deleteTarget.name}`);
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const filtered = institutes.filter((inst) => {
    const matchesSearch =
      inst.name.toLowerCase().includes(search.toLowerCase()) ||
      (inst.contact_person || "").toLowerCase().includes(search.toLowerCase()) ||
      (inst.address || "").toLowerCase().includes(search.toLowerCase()) ||
      (inst.phone || "").includes(search);
    const matchesType = typeFilter === "all" || inst.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalStudents = institutes.reduce((acc, curr) => acc + (curr.student_count || 0), 0);
  const totalSchools = institutes.filter((i) => i.type === "School").length;
  const totalSocieties = institutes.filter((i) => i.type === "Society").length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="label-over">Partnerships & Campuses</div>
          <h1 className="text-4xl font-serif">Institutes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage different schools, residential societies, and campuses to view their enrolled students.
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={() => {
              setEditingInstitute(null);
              setDialogOpen(true);
            }}
            data-testid="add-institute-btn"
            className="rounded-xl h-10 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Institute
          </Button>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-white p-4 md:p-5 rounded-xl border border-border/40 shadow-sm">
          <div className="label-over text-[9px]">Total Institutes</div>
          <div className="text-2xl md:text-3xl font-serif mt-1 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {institutes.length}
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl border border-border/40 shadow-sm">
          <div className="label-over text-[9px]">Total Enrolled Students</div>
          <div className="text-2xl md:text-3xl font-serif mt-1 flex items-center gap-2 text-primary">
            <Users className="w-5 h-5" />
            {totalStudents}
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl border border-border/40 shadow-sm">
          <div className="label-over text-[9px]">Schools</div>
          <div className="text-2xl md:text-3xl font-serif mt-1 flex items-center gap-2 text-blue-600">
            <School className="w-5 h-5" />
            {totalSchools}
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl border border-border/40 shadow-sm">
          <div className="label-over text-[9px]">Societies</div>
          <div className="text-2xl md:text-3xl font-serif mt-1 flex items-center gap-2 text-purple-600">
            <Home className="w-5 h-5" />
            {totalSocieties}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by institute name, coordinator, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-white"
            data-testid="search-institute-input"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            ["all", "All"],
            ["School", "Schools"],
            ["Society", "Societies"],
            ["Academy", "Academies"],
            ["Club", "Clubs"],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setTypeFilter(val)}
              className={`shrink-0 text-xs uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
                typeFilter === val
                  ? "bg-primary text-primary-foreground border-primary font-medium shadow-sm"
                  : "bg-white text-muted-foreground hover:text-foreground border-border/60 hover:bg-muted/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Institute Grid */}
      {loading ? (
        <div className="text-sm text-muted-foreground p-8 text-center">Loading institutes...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-border/40 rounded-xl p-12 text-center shadow-sm">
          <Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-lg font-serif font-medium">No institutes found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {search || typeFilter !== "all"
              ? "No institutes matched your search filters. Try clearing the filter."
              : "Create schools and societies to organize enrolled students by campus."}
          </p>
          {canEdit && (
            <Button
              onClick={() => {
                setEditingInstitute(null);
                setDialogOpen(true);
              }}
              className="mt-4 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Institute
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="institutes-grid">
          {filtered.map((inst) => (
            <div
              key={inst.id}
              className="bg-white border border-border/40 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group hover:border-primary/40 relative"
              data-testid={`institute-card-${inst.id}`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/institutes/${inst.id}`}
                      className="font-serif font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1 block"
                      title={inst.name}
                    >
                      {inst.name}
                    </Link>
                  </div>
                  <div className="shrink-0">{getTypeBadge(inst.type)}</div>
                </div>

                {inst.address && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-3 line-clamp-1">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{inst.address}</span>
                  </div>
                )}

                <div className="space-y-1.5 text-xs text-muted-foreground py-2 border-t border-border/40 my-2">
                  {inst.contact_person && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-foreground font-medium">{inst.contact_person}</span>
                    </div>
                  )}
                  {inst.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 shrink-0" />
                      <span>{inst.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-border/40 flex items-center justify-between mt-2">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                  <Users className="w-4 h-4" />
                  <span>{inst.student_count || 0}</span>
                  <span className="text-xs font-normal text-muted-foreground">students</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {canEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingInstitute(inst);
                        setDialogOpen(true);
                      }}
                      className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                      title="Edit Institute"
                      data-testid={`edit-institute-${inst.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(inst);
                      }}
                      className="p-1.5 text-destructive/70 hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                      title="Delete Institute"
                      data-testid={`delete-institute-${inst.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/institutes/${inst.id}`)}
                    className="rounded-xl ml-1 text-xs h-8 px-3"
                    data-testid={`view-institute-${inst.id}`}
                  >
                    View Students <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Institute Dialog */}
      <InstituteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        institute={editingInstitute}
        onSaved={load}
      />

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl">Delete Institute?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? Any enrolled students
              will remain in the CRM and become unassigned from this institute.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InstituteDialog({ open, onOpenChange, institute, onSaved }) {
  const [form, setForm] = useState({
    name: "",
    type: "School",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (institute) {
      setForm({
        name: institute.name || "",
        type: institute.type || "School",
        contact_person: institute.contact_person || "",
        phone: institute.phone || "",
        email: institute.email || "",
        address: institute.address || "",
        notes: institute.notes || "",
      });
    } else {
      setForm({
        name: "",
        type: "School",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
        notes: "",
      });
    }
  }, [institute, open]);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Please enter an institute name");
      return;
    }

    setSaving(true);
    try {
      if (institute) {
        await api.patch(`/institutes/${institute.id}`, form);
        toast.success("Institute updated");
      } else {
        await api.post("/institutes", form);
        toast.success("Institute created");
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl max-w-lg max-h-[90vh] overflow-y-auto" data-testid="institute-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {institute ? "Edit Institute" : "New Institute"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label className="text-xs uppercase tracking-widest font-semibold">
              Institute / Campus Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Delhi Public School or Green Glen Society"
              className="rounded-xl mt-1"
              data-testid="institute-form-name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest font-semibold">Type</Label>
              <Select
                value={form.type}
                onValueChange={(val) => setForm({ ...form, type: val })}
              >
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {INSTITUTE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-widest font-semibold">Coordinator / Contact Person</Label>
              <Input
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                placeholder="e.g. Mrs. Sunita"
                className="rounded-xl mt-1"
                data-testid="institute-form-contact"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest font-semibold">Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91..."
                className="rounded-xl mt-1"
                data-testid="institute-form-phone"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-widest font-semibold">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contact@..."
                className="rounded-xl mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest font-semibold">Address / Location</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="e.g. Sector 4 Campus / Clubhouse Wing A"
              className="rounded-xl mt-1"
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest font-semibold">Notes / Batch Timings</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any details regarding classes, security gates, or batch coordination..."
              className="rounded-xl mt-1"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !form.name.trim()}
              data-testid="institute-form-save"
              className="rounded-xl"
            >
              {saving ? "Saving..." : institute ? "Save Changes" : "Create Institute"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

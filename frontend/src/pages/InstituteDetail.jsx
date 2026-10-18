import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  Users,
  Plus,
  Search,
  ChevronRight,
  Download,
  UserPlus,
  UserMinus,
  Pencil,
  Check,
  CheckCircle2,
  ClipboardList,
} from "lucide-react";
import { WhatsappIcon } from "@/components/crm/WhatsappIcon";
import { openWhatsapp } from "@/lib/whatsapp";
import { exportToCSV } from "@/lib/export";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { getTypeBadge } from "./Institutes";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];

export default function InstituteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [institute, setInstitute] = useState(null);
  const [allInstitutes, setAllInstitutes] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const canEdit = user?.role === "admin" || user?.role === "staff";

  const loadData = async () => {
    setLoading(true);
    try {
      const [instRes, allInstRes, stuRes] = await Promise.all([
        api.get(`/institutes/${id}`),
        api.get("/institutes"),
        api.get(`/institutes/${id}/students`),
      ]);
      setInstitute(instRes.data);
      setAllInstitutes(allInstRes.data);
      setStudents(stuRes.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleUnassignStudent = async (student) => {
    if (!confirm(`Remove ${student.name} from ${institute.name}? The student will remain in the CRM.`)) {
      return;
    }
    try {
      await api.delete(`/institutes/${id}/students/${student.id}`);
      toast.success(`${student.name} removed from ${institute.name}`);
      loadData();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const handleExportCSV = () => {
    if (!students.length) {
      toast.info("No students to export");
      return;
    }
    const data = students.map((s) => ({
      "Institute": institute.name,
      "Student Name": s.name,
      "Level": s.level || "Beginner",
      "Phone": s.phone || "",
      "Parent Name": s.parent_name || "",
      "Parent Phone": s.parent_phone || "",
      "Fee Type": s.fee_type || "monthly",
      "Fee Amount": s.fee_amount || s.monthly_fee || 0,
      "Status": s.status || "active",
      "Grade": s.grade || "",
      "Date of Birth": s.dob || "",
      "Notes": s.notes || "",
    }));
    exportToCSV(data, `${institute.name.replace(/\s+/g, "_")}_Students.csv`);
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.phone || "").includes(search) ||
      (s.parent_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.parent_phone || "").includes(search);
    const matchesLevel = levelFilter === "all" || s.level === levelFilter;
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesLevel && matchesStatus;
  });

  if (loading && !institute) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading institute details...</div>;
  }

  if (!institute) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Institute not found.</p>
        <Link to="/institutes" className="text-primary hover:underline mt-2 inline-block">
          Return to Institutes list
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Top Bar: Back button and Institute Quick-Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/institutes"
            className="p-2 border border-border/60 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Back to Institutes"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="label-over text-[9px]">Institute Roster</div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground">
              {institute.name}
            </h1>
          </div>
        </div>

        {/* Quick Switcher dropdown right at top */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold hidden md:inline">
            Switch Institute:
          </span>
          <Select
            value={id}
            onValueChange={(newId) => navigate(`/institutes/${newId}`)}
          >
            <SelectTrigger
              className="w-[220px] rounded-xl bg-white shadow-sm border-primary/30 font-medium"
              data-testid="institute-switcher-select"
            >
              <Building2 className="w-4 h-4 mr-1 text-primary shrink-0" />
              <SelectValue placeholder="Switch Institute" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {allInstitutes.map((inst) => (
                <SelectItem key={inst.id} value={inst.id}>
                  {inst.name} ({inst.student_count || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Institute Overview Card */}
      <div className="bg-white border border-border/40 rounded-xl p-5 md:p-6 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-border/40">
          <div className="flex flex-wrap items-center gap-2.5">
            {getTypeBadge(institute.type)}
            <span className="text-xs text-muted-foreground font-mono">
              ID: {institute.id.slice(0, 8)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
                className="rounded-xl h-9"
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit Institute
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/attendance?institute=${institute.id}`)}
              className="rounded-xl h-9"
              title="Mark or view attendance for this institute"
            >
              <ClipboardList className="w-3.5 h-3.5 mr-1.5 text-primary" /> Mark Attendance
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="rounded-xl h-9"
              title="Export students roster as CSV"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export Roster
            </Button>
            {canEdit && (
              <Button
                size="sm"
                onClick={() => setEnrollDialogOpen(true)}
                data-testid="enroll-student-btn"
                className="rounded-xl h-9"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Enroll Student
              </Button>
            )}
          </div>
        </div>

        {/* Contact info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <div className="label-over text-[9px]">Coordinator</div>
            <div className="text-sm font-medium mt-0.5 text-foreground">
              {institute.contact_person || "Not specified"}
            </div>
          </div>

          <div>
            <div className="label-over text-[9px]">Contact Phone</div>
            <div className="text-sm font-medium mt-0.5 text-foreground flex items-center gap-1.5">
              {institute.phone ? (
                <>
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  <span>{institute.phone}</span>
                </>
              ) : (
                "Not specified"
              )}
            </div>
          </div>

          <div>
            <div className="label-over text-[9px]">Campus Location</div>
            <div className="text-sm font-medium mt-0.5 text-foreground flex items-center gap-1.5 truncate">
              {institute.address ? (
                <>
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{institute.address}</span>
                </>
              ) : (
                "Not specified"
              )}
            </div>
          </div>

          <div>
            <div className="label-over text-[9px]">Enrolled Students</div>
            <div className="text-xl font-serif font-bold text-primary flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{students.length}</span>
            </div>
          </div>
        </div>

        {institute.notes && (
          <div className="mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-lg">
            <span className="font-semibold text-foreground">Notes: </span>
            {institute.notes}
          </div>
        )}
      </div>

      {/* Students Section Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
            <span>Enrolled Students</span>
            <span className="text-sm font-sans font-normal px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {filteredStudents.length} of {students.length}
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Only students who have registered from <strong>{institute.name}</strong> are displayed below.
          </p>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white border border-border/40 rounded-xl p-3 shadow-sm mb-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search enrolled students by name, phone or parent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-muted/20 border-border/60"
            data-testid="search-institute-students"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Level Filter */}
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[140px] rounded-xl text-xs h-9">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="Beginner">Beginner</SelectItem>
              <SelectItem value="Intermediate">Intermediate</SelectItem>
              <SelectItem value="Advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] rounded-xl text-xs h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on hold">On Hold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Enrolled Students Table / List */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white border border-border/40 rounded-xl p-12 text-center shadow-sm">
          <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-lg font-serif font-medium">No students found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {students.length === 0
              ? `There are no students enrolled from ${institute.name} yet.`
              : "No students matched your search or filters."}
          </p>
          {canEdit && students.length === 0 && (
            <Button
              onClick={() => setEnrollDialogOpen(true)}
              className="mt-4 rounded-xl"
            >
              <UserPlus className="w-4 h-4 mr-1.5" /> Enroll First Student
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-border/40 rounded-xl shadow-sm overflow-hidden divide-y divide-border/60">
          <div className="hidden md:grid grid-cols-12 gap-3 p-3.5 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-4">Student</div>
            <div className="col-span-2">Level & Grade</div>
            <div className="col-span-3">Parent & Contact</div>
            <div className="col-span-2">Fees</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {filteredStudents.map((s) => {
            const parentContact = s.parent_phone || s.phone;
            return (
              <div
                key={s.id}
                className="p-4 flex flex-col md:grid md:grid-cols-12 gap-3 items-start md:items-center hover:bg-muted/20 transition-colors"
                data-testid={`student-row-${s.id}`}
              >
                {/* Name & Avatar */}
                <div className="col-span-4 flex items-center gap-3 w-full">
                  <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-serif font-bold text-sm shrink-0">
                    {s.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/students/${s.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors block truncate"
                    >
                      {s.name}
                    </Link>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className="capitalize">{s.status || "active"}</span>
                      {s.dob && <span>· DOB: {s.dob}</span>}
                    </div>
                  </div>
                </div>

                {/* Level & Grade */}
                <div className="col-span-2 flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium border border-border/40">
                    {s.level || "Beginner"}
                  </span>
                  {s.grade && (
                    <span className="text-xs text-muted-foreground">
                      Grade {s.grade}
                    </span>
                  )}
                </div>

                {/* Parent contact */}
                <div className="col-span-3 text-xs">
                  <div className="text-foreground font-medium flex items-center gap-1.5">
                    <span>{s.parent_name || "Parent"}</span>
                    {parentContact && (
                      <button
                        onClick={() => openWhatsapp(parentContact, `Hi ${s.parent_name || 'there'}, message from The Chess Lifestyle (${institute.name}).`)}
                        className="text-[#25D366] hover:opacity-80 p-0.5"
                        title="Chat on WhatsApp"
                      >
                        <WhatsappIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {parentContact && (
                    <div className="text-muted-foreground text-[11px] flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" /> {parentContact}
                    </div>
                  )}
                </div>

                {/* Fees */}
                <div className="col-span-2 text-xs">
                  <div className="font-mono font-medium text-foreground">
                    ₹{s.fee_amount || s.monthly_fee || 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {s.fee_type === "per_class" ? "Per Class" : "Monthly"}
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-1 flex items-center justify-end gap-1.5 w-full md:w-auto">
                  <Link
                    to={`/students/${s.id}`}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                    title="View Student Profile"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  {canEdit && (
                    <button
                      onClick={() => handleUnassignStudent(s)}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10"
                      title="Unlink from this Institute"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Enroll / Assign Student Dialog */}
      <EnrollStudentModal
        open={enrollDialogOpen}
        onOpenChange={setEnrollDialogOpen}
        institute={institute}
        onEnrolled={loadData}
      />

      {/* Edit Institute Dialog */}
      <EditInstituteModal
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        institute={institute}
        onSaved={loadData}
      />
    </div>
  );
}

function EnrollStudentModal({ open, onOpenChange, institute, onEnrolled }) {
  const [activeTab, setActiveTab] = useState("new");
  const [unassignedStudents, setUnassignedStudents] = useState([]);
  const [loadingUnassigned, setLoadingUnassigned] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [assigning, setAssigning] = useState(false);

  // New student form state
  const [newStudent, setNewStudent] = useState({
    name: "",
    phone: "",
    level: "Beginner",
    fee_type: "monthly",
    fee_amount: 3000,
    parent_name: "",
    parent_phone: "",
    dob: "",
    grade: "",
    notes: "",
  });
  const [creating, setCreating] = useState(false);

  // Load unassigned students when tab switches or opens
  useEffect(() => {
    if (open && activeTab === "existing") {
      loadUnassigned();
    }
  }, [open, activeTab]);

  const loadUnassigned = async () => {
    setLoadingUnassigned(true);
    try {
      // Get all students and filter out ones already in this institute
      const { data } = await api.get("/students");
      const available = data.filter((s) => s.institute_id !== institute?.id);
      setUnassignedStudents(available);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoadingUnassigned(false);
    }
  };

  const handleCreateNew = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newStudent.name.trim()) {
      toast.error("Please enter student name");
      return;
    }

    setCreating(true);
    try {
      await api.post("/students", {
        ...newStudent,
        monthly_fee: newStudent.fee_amount,
        institute_id: institute.id,
        institute_name: institute.name,
      });
      toast.success(`${newStudent.name} enrolled into ${institute.name}!`);
      onOpenChange(false);
      onEnrolled();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setCreating(false);
    }
  };

  const handleAssignExisting = async () => {
    if (!selectedStudentIds.length) {
      toast.error("Please select at least one student");
      return;
    }

    setAssigning(true);
    try {
      await api.post(`/institutes/${institute.id}/students`, {
        student_ids: selectedStudentIds,
      });
      toast.success(`Assigned ${selectedStudentIds.length} student(s) to ${institute.name}`);
      setSelectedStudentIds([]);
      onOpenChange(false);
      onEnrolled();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setAssigning(false);
    }
  };

  const toggleStudentSelection = (sid) => {
    setSelectedStudentIds((prev) =>
      prev.includes(sid) ? prev.filter((id) => id !== sid) : [...prev, sid]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl max-w-lg max-h-[90vh] overflow-y-auto" data-testid="enroll-student-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            Enroll Student into {institute?.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 rounded-xl mb-4">
            <TabsTrigger value="new" className="rounded-xl text-xs uppercase tracking-wider font-semibold">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Register New
            </TabsTrigger>
            <TabsTrigger value="existing" className="rounded-xl text-xs uppercase tracking-wider font-semibold">
              <Users className="w-3.5 h-3.5 mr-1.5" /> Assign Existing
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Register New Student */}
          <TabsContent value="new" className="m-0 space-y-4">
            <form onSubmit={handleCreateNew} className="space-y-3">
              <div>
                <Label className="text-xs uppercase tracking-widest font-semibold">Student Name *</Label>
                <Input
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  placeholder="e.g. Aarav Sharma"
                  className="rounded-xl mt-1"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-widest font-semibold">Level</Label>
                  <Select
                    value={newStudent.level}
                    onValueChange={(val) => setNewStudent({ ...newStudent, level: val })}
                  >
                    <SelectTrigger className="rounded-xl mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {LEVELS.map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-widest font-semibold">Grade / Class</Label>
                  <Input
                    value={newStudent.grade}
                    onChange={(e) => setNewStudent({ ...newStudent, grade: e.target.value })}
                    placeholder="e.g. 5th"
                    className="rounded-xl mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-widest font-semibold">Parent Name</Label>
                  <Input
                    value={newStudent.parent_name}
                    onChange={(e) => setNewStudent({ ...newStudent, parent_name: e.target.value })}
                    placeholder="Parent name"
                    className="rounded-xl mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-widest font-semibold">Parent Phone</Label>
                  <Input
                    value={newStudent.parent_phone}
                    onChange={(e) => setNewStudent({ ...newStudent, parent_phone: e.target.value })}
                    placeholder="+91..."
                    className="rounded-xl mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-widest font-semibold">Fee Type</Label>
                  <Select
                    value={newStudent.fee_type}
                    onValueChange={(val) => setNewStudent({ ...newStudent, fee_type: val })}
                  >
                    <SelectTrigger className="rounded-xl mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="per_class">Per Class</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-widest font-semibold">Fee Amount (₹)</Label>
                  <Input
                    type="number"
                    value={newStudent.fee_amount}
                    onChange={(e) => setNewStudent({ ...newStudent, fee_amount: Number(e.target.value) })}
                    className="rounded-xl mt-1 font-mono"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-widest font-semibold">Date of Birth</Label>
                <Input
                  type="date"
                  value={newStudent.dob}
                  onChange={(e) => setNewStudent({ ...newStudent, dob: e.target.value })}
                  className="rounded-xl mt-1"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={creating}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating || !newStudent.name.trim()}
                  className="rounded-xl"
                >
                  {creating ? "Enrolling..." : "Enroll Student"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          {/* TAB 2: Assign Existing Student */}
          <TabsContent value="existing" className="m-0 space-y-4">
            <p className="text-xs text-muted-foreground">
              Select any existing student to link them directly to <strong>{institute?.name}</strong>:
            </p>

            {loadingUnassigned ? (
              <div className="text-xs text-center py-8 text-muted-foreground">Loading students...</div>
            ) : unassignedStudents.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                All existing students are already enrolled in this institute.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-border/60 rounded-xl divide-y divide-border/40">
                {unassignedStudents.map((s) => {
                  const isSelected = selectedStudentIds.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => toggleStudentSelection(s.id)}
                      className={`p-3 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <div>
                        <div className="font-medium text-sm text-foreground">{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.level || "Beginner"} · {s.institute_name ? `Currently in ${s.institute_name}` : "Direct Enrollment"}
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={assigning}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAssignExisting}
                disabled={assigning || !selectedStudentIds.length}
                className="rounded-xl"
              >
                {assigning ? "Assigning..." : `Assign Selected (${selectedStudentIds.length})`}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function EditInstituteModal({ open, onOpenChange, institute, onSaved }) {
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
      await api.patch(`/institutes/${institute.id}`, form);
      toast.success("Institute updated");
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
      <DialogContent className="rounded-xl max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Edit Institute</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label className="text-xs uppercase tracking-widest font-semibold">Institute Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-xl mt-1"
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
                  <SelectItem value="School">School</SelectItem>
                  <SelectItem value="Society">Residential Society</SelectItem>
                  <SelectItem value="Academy">Academy / Center</SelectItem>
                  <SelectItem value="Club">Club</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-widest font-semibold">Coordinator / Contact</Label>
              <Input
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest font-semibold">Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-widest font-semibold">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest font-semibold">Address / Campus Location</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="rounded-xl mt-1"
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest font-semibold">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
              className="rounded-xl"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

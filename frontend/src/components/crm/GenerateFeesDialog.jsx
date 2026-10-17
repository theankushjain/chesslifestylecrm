import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wand2, Building2, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export function GenerateFeesDialog({
  open,
  onOpenChange,
  students = [],
  onSuccess,
}) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [institutes, setInstitutes] = useState([]);
  const [selectedInstituteId, setSelectedInstituteId] = useState("");
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [generating, setGenerating] = useState(false);
  const [loadingInstitutes, setLoadingInstitutes] = useState(false);

  // Load institutes when dialog opens
  useEffect(() => {
    if (open) {
      setLoadingInstitutes(true);
      api
        .get("/institutes")
        .then((res) => {
          const list = res.data || [];
          setInstitutes(list);
          if (list.length > 0) {
            setSelectedInstituteId((prev) => prev || list[0].id);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingInstitutes(false));

      setMonth(currentMonth);
      setYear(currentYear);
    }
  }, [open, currentMonth, currentYear]);

  // Compute active students count for selected institute
  const targetStudentCount = useMemo(() => {
    const activeStudents = students.filter((s) => s.status === "active");
    if (!selectedInstituteId || selectedInstituteId === "all") {
      return activeStudents.length;
    }
    if (selectedInstituteId === "unassigned") {
      return activeStudents.filter((s) => !s.institute_id).length;
    }
    return activeStudents.filter((s) => s.institute_id === selectedInstituteId).length;
  }, [students, selectedInstituteId]);

  const selectedInstituteName = useMemo(() => {
    if (selectedInstituteId === "all") return "All Institutions & Direct";
    if (selectedInstituteId === "unassigned") return "Direct Enrollment";
    const inst = institutes.find((i) => i.id === selectedInstituteId);
    return inst ? inst.name : "Selected Institution";
  }, [institutes, selectedInstituteId]);

  const handleGenerate = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!selectedInstituteId) {
      toast.error("Please select an institution");
      return;
    }

    setGenerating(true);
    try {
      const res = await api.post("/payments/generate", {
        institute_id: selectedInstituteId,
        month: Number(month),
        year: Number(year),
      });

      const { generated, skipped_existing, institute_name } = res.data;
      const mName = MONTHS.find((m) => m.value === Number(month))?.label || "";

      if (generated > 0) {
        toast.success(
          `Generated ${generated} fee record${generated === 1 ? "" : "s"} for ${institute_name} (${mName} ${year})`
        );
      } else {
        toast.info(
          `No new fees needed. All active students in ${institute_name} already have fee records for ${mName} ${year}`
        );
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl max-w-md" data-testid="generate-fees-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Wand2 className="w-5 h-5" />
            </span>
            Generate Month Fees
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Select an institution to generate monthly fee records for its active students.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleGenerate} className="space-y-4 py-2">
          {/* Institution Selector */}
          <div>
            <Label className="text-xs uppercase tracking-widest font-semibold mb-1.5 block">
              Institution / Campus <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedInstituteId}
              onValueChange={setSelectedInstituteId}
              disabled={loadingInstitutes || generating}
            >
              <SelectTrigger data-testid="generate-institution-select" className="rounded-xl">
                <SelectValue placeholder="Choose institution..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-60">
                {institutes.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Institutions & Schools
                    </div>
                    {institutes.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.name}
                      </SelectItem>
                    ))}
                    <div className="border-t border-border/40 my-1"></div>
                  </>
                )}
                <SelectItem value="unassigned">Direct Enrollment (Society / Private)</SelectItem>
                <SelectItem value="all">All Institutions & Campuses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Month & Year Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest font-semibold mb-1.5 block">
                Month
              </Label>
              <Select
                value={String(month)}
                onValueChange={(v) => setMonth(Number(v))}
                disabled={generating}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-56">
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-semibold mb-1.5 block">
                Year
              </Label>
              <Select
                value={String(year)}
                onValueChange={(v) => setYear(Number(v))}
                disabled={generating}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Target Student Count Banner */}
          <div className="bg-muted/40 border border-border/60 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" /> Active Students in Scope:
              </span>
              <span className="font-semibold text-foreground text-sm font-mono">
                {targetStudentCount} student{targetStudentCount === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-muted-foreground" /> Target Campus:
              </span>
              <span className="font-medium text-foreground truncate max-w-[200px]">
                {selectedInstituteName}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground flex items-start gap-1.5 px-0.5">
            <AlertCircle className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <span>
              Fee dues will only be created for students without an existing fee record in this month.
              Existing records will remain untouched.
            </span>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={generating}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={generating || !selectedInstituteId}
              data-testid="generate-fees-confirm-btn"
              className="rounded-xl"
            >
              <Wand2 className="w-4 h-4 mr-1.5" />
              {generating ? "Generating..." : `Generate for ${selectedInstituteName}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default GenerateFeesDialog;

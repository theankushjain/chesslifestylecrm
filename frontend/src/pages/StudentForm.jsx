import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function StudentForm() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    phone: "",
    grade: "",
    school: "",
    father_occupation: "",
    mother_occupation: "",
    hobby: ""
  });

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const { data } = await api.get(`/public/students/${id}/form`);
        setStudent(data);
        setFormData({
          name: data.name || "",
          dob: data.dob || "",
          phone: data.phone || "",
          grade: data.grade || "",
          school: data.school || "",
          father_occupation: data.father_occupation || "",
          mother_occupation: data.mother_occupation || "",
          hobby: data.hobby || "",
        });
      } catch (err) {
        setError("Invalid link or student not found.");
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [id]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/public/students/${id}/form`, formData);
      setSubmitted(true);
      toast.success("Details updated successfully!");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 font-sans">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm tracking-widest uppercase">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 max-w-md w-full border border-border shadow-sm text-center">
          <h2 className="text-2xl font-serif text-destructive mb-2">Oops!</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-white p-10 max-w-md w-full border border-border shadow-sm text-center animate-in fade-in slide-in-from-bottom-4">
          <div className="mx-auto w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-serif mb-3 text-foreground">Thank You!</h2>
          <p className="text-muted-foreground leading-relaxed">
            Your child's details have been successfully updated. We appreciate your time in helping us personalize their chess journey!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4 md:p-8 font-sans selection:bg-brand/20">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-brand/5 text-brand px-4 py-1.5 rounded-full text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            <span>The Chess Lifestyle</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif tracking-tight text-foreground">
            Student Details
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-md mx-auto leading-relaxed">
            Help us personalize <strong className="text-foreground font-medium">{student.name}'s</strong> learning experience by providing a few details.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-border/60 shadow-xl shadow-black/[0.02] p-6 md:p-10 space-y-8 animate-in fade-in duration-500 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand/40 via-brand to-brand/40" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Student Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
                className="h-12 bg-neutral-50/50 focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-2.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Date of Birth</Label>
              <Input
                type="date"
                value={formData.dob}
                onChange={(e) => handleChange("dob", e.target.value)}
                className="h-12 bg-neutral-50/50 focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-2.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Class / Grade</Label>
              <Input
                value={formData.grade}
                onChange={(e) => handleChange("grade", e.target.value)}
                placeholder="e.g. 5th Grade"
                className="h-12 bg-neutral-50/50 focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-2.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">School Name</Label>
              <Input
                value={formData.school}
                onChange={(e) => handleChange("school", e.target.value)}
                placeholder="Name of current school"
                className="h-12 bg-neutral-50/50 focus:bg-white transition-colors"
              />
            </div>
            
            <div className="space-y-2.5 md:col-span-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Primary Contact (Phone)</Label>
              <Input
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+1 234 567 8900"
                className="h-12 bg-neutral-50/50 focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-2.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Father's Occupation</Label>
              <Input
                value={formData.father_occupation}
                onChange={(e) => handleChange("father_occupation", e.target.value)}
                placeholder="e.g. Software Engineer"
                className="h-12 bg-neutral-50/50 focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-2.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Mother's Occupation</Label>
              <Input
                value={formData.mother_occupation}
                onChange={(e) => handleChange("mother_occupation", e.target.value)}
                placeholder="e.g. Teacher"
                className="h-12 bg-neutral-50/50 focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-2.5 md:col-span-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Favorite Hobby</Label>
              <Input
                value={formData.hobby}
                onChange={(e) => handleChange("hobby", e.target.value)}
                placeholder="e.g. Reading, Football, Painting"
                className="h-12 bg-neutral-50/50 focus:bg-white transition-colors"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Knowing their hobbies helps our coaches use relatable analogies to make learning fun!
              </p>
            </div>
          </div>

          <div className="pt-6">
            <Button
              type="submit"
              disabled={saving}
              className="w-full h-14 text-base font-medium group transition-all"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <div className="flex items-center justify-center gap-2 w-full">
                  <span>Save Details</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </Button>
          </div>
        </form>
        
        <div className="mt-8 text-center text-sm text-muted-foreground/60">
          Secure, private, and solely used to enhance the learning experience.
        </div>
      </div>
    </div>
  );
}

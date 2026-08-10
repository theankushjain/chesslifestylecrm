import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { Plus, Save, Download, Share2 } from "lucide-react";
import { downloadProgressReport } from "@/lib/ProgressReportGenerator";
import { openWhatsapp } from "@/lib/whatsapp";
import { WhatsappIcon } from "@/components/crm/WhatsappIcon";

export default function LearningProgressTab({ student }) {
  const [outcomes, setOutcomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProgress = async () => {
    try {
      const res = await api.get(`/students/${student.id}/progress`);
      setOutcomes(res.data.outcomes || []);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgress();
  }, [student.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/students/${student.id}/progress`, { outcomes });
      toast.success("Progress saved successfully");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (id, checked) => {
    setOutcomes(prev => prev.map(o => {
      if (o.id === id) {
        return { 
          ...o, 
          completed: checked, 
          completed_date: checked ? new Date().toISOString().split("T")[0] : null 
        };
      }
      return o;
    }));
  };

  const handleDateChange = (id, dateStr) => {
    setOutcomes(prev => prev.map(o => {
      if (o.id === id) return { ...o, completed_date: dateStr };
      return o;
    }));
  };
  
  const handleTextChange = (id, text) => {
    setOutcomes(prev => prev.map(o => {
      if (o.id === id) return { ...o, text };
      return o;
    }));
  };

  const handleAddCustom = (level, module, insertAfterIndex) => {
    const newOutcome = {
      id: "custom-" + Date.now(),
      level,
      module,
      text: "New custom learning outcome",
      completed: false,
      completed_date: null
    };
    
    setOutcomes(prev => {
      const copy = [...prev];
      // Find the absolute index in the flat array
      const itemsInModule = copy.filter(o => o.level === level && o.module === module);
      const afterItem = itemsInModule[insertAfterIndex];
      const absoluteIndex = copy.findIndex(o => o.id === afterItem.id);
      
      if (absoluteIndex !== -1) {
        copy.splice(absoluteIndex + 1, 0, newOutcome);
      } else {
        copy.push(newOutcome);
      }
      return copy;
    });
  };

  const shareLink = () => {
    const url = `${window.location.origin}/p/progress/${student.id}`;
    const msg = `Hi! You can view ${student.name}'s latest learning progress report anytime by clicking this link:\n\n${url}`;
    const ok = openWhatsapp(student.parent_phone || student.phone, msg);
    if (!ok) toast.error("No valid phone number for student/parent.");
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading progress...</div>;

  // Group by Level -> Module
  const grouped = outcomes.reduce((acc, curr) => {
    if (!acc[curr.level]) acc[curr.level] = {};
    if (!acc[curr.level][curr.module]) acc[curr.level][curr.module] = [];
    acc[curr.level][curr.module].push(curr);
    return acc;
  }, {});

  const levels = Object.keys(grouped);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif">Learning Outcomes Checklist</h2>
          <p className="text-sm text-muted-foreground">Mark completed items. You can also add custom outcomes within any module.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => downloadProgressReport(student, outcomes)} className="rounded-none">
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>
          <Button variant="outline" onClick={shareLink} className="rounded-none text-[#25D366] hover:text-[#25D366] hover:bg-[#25D366]/10">
            <WhatsappIcon className="w-4 h-4 mr-2" /> Share Link
          </Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-none">
            <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Progress"}
          </Button>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full bg-white border border-border/60">
        {levels.map((level, i) => (
          <AccordionItem key={i} value={level} className="border-b last:border-0 border-border/60">
            <AccordionTrigger className="px-4 hover:bg-gray-50 hover:no-underline font-serif text-lg">
              {level}
            </AccordionTrigger>
            <AccordionContent className="p-0 border-t border-border/60">
              <Accordion type="multiple" className="w-full">
                {Object.keys(grouped[level]).map((module, j) => (
                  <AccordionItem key={j} value={module} className="border-b last:border-0 border-border/60">
                    <AccordionTrigger className="px-6 hover:bg-gray-50 hover:no-underline text-sm font-semibold bg-gray-50/50">
                      {module}
                    </AccordionTrigger>
                    <AccordionContent className="p-0">
                      <div className="divide-y divide-border/60">
                        {grouped[level][module].map((outcome, k) => (
                          <div key={outcome.id} className="p-4 pl-8 hover:bg-gray-50/50 transition-colors group">
                            <div className="flex items-start gap-3">
                              <Checkbox 
                                id={`check-${outcome.id}`}
                                checked={outcome.completed}
                                onCheckedChange={(c) => handleToggle(outcome.id, !!c)}
                                className="mt-1"
                              />
                              <div className="flex-1 space-y-2">
                                <label htmlFor={`check-${outcome.id}`} className={`text-sm leading-relaxed block ${outcome.completed ? 'text-muted-foreground line-through' : ''}`}>
                                  {outcome.id.startsWith("custom-") ? (
                                    <Input 
                                      value={outcome.text} 
                                      onChange={(e) => handleTextChange(outcome.id, e.target.value)} 
                                      className="h-8 rounded-none mt-1" 
                                    />
                                  ) : (
                                    outcome.text
                                  )}
                                </label>
                                {outcome.completed && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground uppercase tracking-widest">Completed:</span>
                                    <Input 
                                      type="date" 
                                      value={outcome.completed_date || ""}
                                      onChange={(e) => handleDateChange(outcome.id, e.target.value)}
                                      className="h-7 text-xs w-36 rounded-none"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Insert button appears on hover */}
                            <div className="mt-3 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 text-xs rounded-none text-muted-foreground hover:text-primary"
                                onClick={() => handleAddCustom(level, module, k)}
                              >
                                <Plus className="w-3 h-3 mr-1" /> Add custom below
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  BookOpen,
  CheckCircle2,
  Plus,
  X,
  Layers,
  Sparkles,
  RotateCcw,
} from "lucide-react";

export default function BatchTopicPickerModal({
  open,
  onOpenChange,
  batch,
  outcomes = [],
  selectedOutcomeTexts = [],
  onToggleOutcome,
  customTopics = [],
  onAddCustomTopic,
  onRemoveCustomTopic,
  onClearAll,
}) {
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [completionFilter, setCompletionFilter] = useState("all"); // 'all' | 'pending' | 'completed'
  const [customInput, setCustomInput] = useState("");

  // Extract distinct levels
  const levels = useMemo(() => {
    const set = new Set();
    outcomes.forEach((o) => {
      if (o.level) set.add(o.level);
    });
    return Array.from(set);
  }, [outcomes]);

  // Filter outcomes
  const filteredOutcomes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return outcomes.filter((o) => {
      // Level filter
      if (selectedLevel !== "all" && o.level !== selectedLevel) return false;

      // Completion filter
      if (completionFilter === "pending" && o.completed_all) return false;
      if (completionFilter === "completed" && !o.completed_all) return false;

      // Search query
      if (q) {
        const textMatch = (o.text || "").toLowerCase().includes(q);
        const moduleMatch = (o.module || "").toLowerCase().includes(q);
        const levelMatch = (o.level || "").toLowerCase().includes(q);
        return textMatch || moduleMatch || levelMatch;
      }
      return true;
    });
  }, [outcomes, search, selectedLevel, completionFilter]);

  // Group by Level -> Module
  const grouped = useMemo(() => {
    const map = {};
    for (const o of filteredOutcomes) {
      const lvl = o.level || "General Curriculum";
      const mod = o.module || "General Topics";
      if (!map[lvl]) map[lvl] = {};
      if (!map[lvl][mod]) map[lvl][mod] = [];
      map[lvl][mod].push(o);
    }
    return map;
  }, [filteredOutcomes]);

  const handleAddCustom = (e) => {
    if (e) e.preventDefault();
    const val = customInput.trim();
    if (!val) return;
    onAddCustomTopic(val);
    setCustomInput("");
  };

  const selectedCount = selectedOutcomeTexts.length + customTopics.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 rounded-2xl overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-muted/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="font-serif text-2xl">
                  Select Class Topics & Learning Outcomes
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Choose multiple outcomes taught in this class. They will automatically be marked completed for all attending students.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Quick Custom Topic bar */}
          <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Or type a custom topic (e.g. Mini-tournament, Puzzle rush)..."
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCustom(e)}
                className="h-9 rounded-xl text-xs"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleAddCustom}
              disabled={!customInput.trim()}
              className="h-9 rounded-xl text-xs px-3"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Custom
            </Button>
          </div>

          {/* Chips of currently selected custom topics & outcomes */}
          {selectedCount > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto pt-1">
              <span className="text-[11px] font-medium text-muted-foreground mr-1">
                Selected ({selectedCount}):
              </span>
              {selectedOutcomeTexts.map((text) => (
                <span
                  key={text}
                  className="inline-flex items-center gap-1 text-[11px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-lg max-w-xs truncate"
                  title={text}
                >
                  <span className="truncate">{text}</span>
                  <button
                    type="button"
                    onClick={() => onToggleOutcome(text)}
                    className="hover:opacity-75 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {customTopics.map((ct) => (
                <span
                  key={ct}
                  className="inline-flex items-center gap-1 text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-lg max-w-xs truncate"
                  title={ct}
                >
                  <Sparkles className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{ct}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveCustomTopic(ct)}
                    className="hover:opacity-75 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={onClearAll}
                className="text-[11px] text-destructive hover:underline ml-1"
              >
                Clear all
              </button>
            </div>
          )}
        </DialogHeader>

        {/* Filter Toolbar */}
        <div className="p-4 border-b border-border/40 bg-muted/5 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search outcomes by keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl text-xs bg-white"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Level selector */}
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="h-9 px-2.5 text-xs bg-white border border-border/60 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Levels</option>
              {levels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>

            {/* Completion filter */}
            <select
              value={completionFilter}
              onChange={(e) => setCompletionFilter(e.target.value)}
              className="h-9 px-2.5 text-xs bg-white border border-border/60 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending for batch</option>
              <option value="completed">Completed by all</option>
            </select>
          </div>
        </div>

        {/* Scrollable list of outcomes grouped by Level & Module */}
        <ScrollArea className="flex-1 p-6 overflow-y-auto max-h-[50vh]">
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No learning outcomes matched your filter. Try clearing the search or changing the level filter.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([level, modules]) => (
                <div key={level} className="space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                    <Layers className="w-4 h-4 text-primary" />
                    <h3 className="font-serif font-semibold text-sm tracking-wide text-foreground">
                      {level}
                    </h3>
                  </div>

                  {Object.entries(modules).map(([mod, items]) => (
                    <div
                      key={mod}
                      className="bg-muted/15 border border-border/40 rounded-xl p-3.5 space-y-2.5"
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {mod}
                      </div>

                      <div className="space-y-1.5">
                        {items.map((o) => {
                          const isSelected = selectedOutcomeTexts.includes(o.text);
                          const total = o.total_students || 0;
                          const completedCount = o.completed_count || 0;
                          const allDone = o.completed_all;

                          return (
                            <label
                              key={o.id || o.text}
                              className={`flex items-start gap-3 p-2.5 rounded-xl border transition-colors cursor-pointer select-none ${
                                isSelected
                                  ? "bg-primary/5 border-primary/40 shadow-sm"
                                  : "bg-white border-border/40 hover:bg-muted/20"
                              }`}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => onToggleOutcome(o.text)}
                                className="mt-0.5 rounded-md"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-foreground font-medium leading-relaxed">
                                  {o.text}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  {allDone ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      Completed by all ({total}/{total})
                                    </span>
                                  ) : completedCount > 0 ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                      Completed by {completedCount}/{total} students
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-[10px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md">
                                      Pending (0/{total})
                                    </span>
                                  )}
                                  {allDone && (
                                    <span className="text-[10px] text-muted-foreground italic">
                                      (Select to teach/review again)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="p-4 px-6 border-t border-border/40 bg-muted/10 flex items-center justify-between sm:justify-between">
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground font-mono">
              {selectedCount}
            </span>{" "}
            topic{selectedCount !== 1 ? "s" : ""} selected for this class
          </div>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl h-10 px-5"
          >
            Done Selecting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

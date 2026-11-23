import { useState, useEffect, useRef } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CheckSquare, 
  Calendar, 
  User as UserIcon, 
  Download, 
  FileText, 
  Upload, 
  Link as LinkIcon, 
  ExternalLink, 
  Eye, 
  Trash2, 
  X, 
  FileUp, 
  CheckCircle2, 
  Paperclip,
  Loader2,
  Send,
  Check,
  Clock,
  Shield,
  MessageSquare
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";

export default function Tasks() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";
  const isStudent = user?.role === "student";
  const isAdminOrStaff = isAdmin || isStaff;

  const fileInputRef = useRef(null);
  const solutionFileInputRef = useRef(null);
  
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterMyTasks, setFilterMyTasks] = useState(false);

  // Form State for creating task
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignee: isStaff ? "all_students" : "all_staff",
    due_date: "",
  });

  // PDF Attachment State: "none" | "upload" | "link"
  const [attachmentType, setAttachmentType] = useState("none");
  const [selectedFile, setSelectedFile] = useState(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Solution Submission Dialog State
  const [solutionDialogOpen, setSolutionDialogOpen] = useState(false);
  const [activeSolutionTask, setActiveSolutionTask] = useState(null);
  const [solutionText, setSolutionText] = useState("");
  const [solutionAttachmentType, setSolutionAttachmentType] = useState("none");
  const [solutionFile, setSolutionFile] = useState(null);
  const [solutionLinkUrl, setSolutionLinkUrl] = useState("");
  const [solutionLinkTitle, setSolutionLinkTitle] = useState("");
  const [submittingSolution, setSubmittingSolution] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      const [taskRes, userRes, stuRes, batchRes] = await Promise.all([
        api.get("/tasks"),
        isAdmin ? api.get("/users").catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        isAdminOrStaff ? api.get("/students").catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        isAdminOrStaff ? api.get("/batches").catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);
      setTasks(taskRes.data);
      if (isAdmin) setUsers(userRes.data || []);
      if (isAdminOrStaff) {
        setStudents(stuRes.data || []);
        setBatches(batchRes.data || []);
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getPdfFullUrl = (pdfUrl) => {
    if (!pdfUrl) return "";
    if (pdfUrl.startsWith("http://") || pdfUrl.startsWith("https://")) {
      return pdfUrl;
    }
    const rawUrl = process.env.REACT_APP_BACKEND_URL || "";
    const backend = rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : "";
    return `${backend}${pdfUrl}`;
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please select a valid PDF file");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("PDF file size cannot exceed 15 MB");
      return;
    }
    setSelectedFile(file);
    setAttachmentType("upload");
  };

  const handleSolutionFileSelect = (file) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please select a valid PDF file");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("PDF file size cannot exceed 15 MB");
      return;
    }
    setSolutionFile(file);
    setSolutionAttachmentType("upload");
  };

  const removeAttachment = () => {
    setSelectedFile(null);
    setLinkUrl("");
    setLinkTitle("");
    setAttachmentType("none");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
    });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    setSubmitting(true);
    try {
      let taskPayload = {
        ...form,
        pdf_url: null,
        pdf_name: null,
        pdf_file_id: null,
        pdf_type: null,
        pdf_size: null,
      };

      if (attachmentType === "upload" && selectedFile) {
        toast.info("Uploading PDF file...");
        const base64Data = await fileToBase64(selectedFile);
        const uploadRes = await api.post("/tasks/upload-pdf", {
          filename: selectedFile.name,
          data: base64Data,
          size: selectedFile.size,
        });
        taskPayload.pdf_url = uploadRes.data.url;
        taskPayload.pdf_name = uploadRes.data.filename;
        taskPayload.pdf_file_id = uploadRes.data.file_id;
        taskPayload.pdf_type = "upload";
        taskPayload.pdf_size = uploadRes.data.size;
      } else if (attachmentType === "link" && linkUrl.trim()) {
        const url = linkUrl.trim();
        taskPayload.pdf_url = url;
        taskPayload.pdf_name = linkTitle.trim() || "PDF Resource";
        taskPayload.pdf_type = "link";
      }

      await api.post("/tasks", taskPayload);
      toast.success("Task created successfully");

      // Reset form
      setForm({
        ...form,
        title: "",
        description: "",
        due_date: "",
        assignee: isStaff ? "all_students" : "all_staff"
      });
      removeAttachment();
      loadData();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle status - permitted only for Admin or Staff who created the task (or assignee)
  const toggleStatus = async (task, forcedStatus = null) => {
    if (isStudent) {
      toast.error("Students cannot mark tasks as completed. Please submit your solution.");
      return;
    }

    const canComplete = isAdmin || (isStaff && (task.created_by === user?.id || task.assignee === user?.id));
    if (!canComplete) {
      toast.error("Only the admin or the coach who assigned this task can mark it as completed.");
      return;
    }

    const newStatus = forcedStatus || (task.status === "completed" ? "pending" : "completed");
    try {
      await api.patch(`/tasks/${task.id}`, { status: newStatus });
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
      toast.success(newStatus === "completed" ? "Task marked completed & approved" : "Task marked pending");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleDeleteTask = async (taskId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      toast.success("Task deleted");
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleDownloadPdf = (pdfUrl, pdfName, pdfType = "upload", e) => {
    if (e) e.stopPropagation();
    if (!pdfUrl) return;

    if (pdfType === "link") {
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const fullUrl = getPdfFullUrl(pdfUrl);
    const downloadUrl = `${fullUrl}?download=true`;

    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = pdfName || "file.pdf";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleViewPdf = (pdfUrl, e) => {
    if (e) e.stopPropagation();
    if (!pdfUrl) return;
    const fullUrl = getPdfFullUrl(pdfUrl);
    window.open(fullUrl, "_blank", "noopener,noreferrer");
  };

  const openSolutionModal = (task) => {
    setActiveSolutionTask(task);
    setSolutionText(task.solution?.solution_text || "");
    setSolutionLinkUrl(task.solution?.solution_url || "");
    setSolutionLinkTitle(task.solution?.solution_name || "");
    setSolutionFile(null);
    setSolutionAttachmentType(task.solution?.solution_url ? "link" : "none");
    setSolutionDialogOpen(true);
  };

  const handleSubmitSolution = async (e) => {
    e.preventDefault();
    if (!activeSolutionTask) return;
    if (!solutionText.trim() && !solutionFile && !solutionLinkUrl.trim()) {
      toast.error("Please enter your solution answer or attach a solution file/link");
      return;
    }

    setSubmittingSolution(true);
    try {
      let solutionUrl = solutionLinkUrl.trim() || null;
      let solutionName = solutionLinkTitle.trim() || null;
      let solutionFileId = null;

      if (solutionAttachmentType === "upload" && solutionFile) {
        toast.info("Uploading solution PDF...");
        const base64Data = await fileToBase64(solutionFile);
        const uploadRes = await api.post("/tasks/upload-pdf", {
          filename: solutionFile.name,
          data: base64Data,
          size: solutionFile.size,
        });
        solutionUrl = uploadRes.data.url;
        solutionName = uploadRes.data.filename;
        solutionFileId = uploadRes.data.file_id;
      }

      const res = await api.post(`/tasks/${activeSolutionTask.id}/submit`, {
        solution_text: solutionText,
        solution_url: solutionUrl,
        solution_name: solutionName,
        solution_file_id: solutionFileId,
      });

      toast.success("Solution submitted to coach successfully!");
      setTasks(tasks.map(t => t.id === activeSolutionTask.id ? res.data : t));
      setSolutionDialogOpen(false);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmittingSolution(false);
    }
  };

  const getAssigneeLabel = (assigneeId) => {
    if (assigneeId === "all_staff") return "All Staff";
    if (assigneeId === "all_students") return "All Students";
    const u = users.find(x => x.id === assigneeId);
    if (u) return `Staff: ${u.name || u.email}`;
    const s = students.find(x => x.id === assigneeId);
    if (s) return s.name;
    const b = batches.find(x => x.id === assigneeId);
    if (b) return `Batch: ${b.name}`;
    return "Assigned Student / Group";
  };

  const getCreatedByLabel = (task) => {
    if (task.created_by_name) return task.created_by_name;
    if (task.created_by === user?.id) return "You";
    return "Coach / Admin";
  };

  if (loading) return <div className="p-8">Loading tasks...</div>;

  let displayTasks = tasks;
  if (isAdmin && filterMyTasks) {
    displayTasks = tasks.filter(t => t.created_by === user.id || t.assignee === user.id);
  } else if (isStaff && filterMyTasks) {
    displayTasks = tasks.filter(t => t.created_by === user.id);
  }

  const pendingTasks = displayTasks.filter(t => t.status !== "completed");
  const completedTasks = displayTasks.filter(t => t.status === "completed");

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Tasks & Homework Assignments", 14, 15);
    
    const tableColumn = ["Task Title", "Assignee", "Assigned By", "Due Date", "PDF Material", "Status"];
    const tableRows = [];

    displayTasks.forEach(task => {
      const pdfText = task.pdf_url 
        ? (task.pdf_type === "upload" ? `File: ${task.pdf_name || "PDF"}` : `Link: ${task.pdf_name || "Link"}`)
        : "None";
      const taskData = [
        task.title,
        getAssigneeLabel(task.assignee),
        getCreatedByLabel(task),
        task.due_date ? format(new Date(task.due_date), "MMM d, yyyy") : "-",
        pdfText,
        task.status
      ];
      tableRows.push(taskData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    doc.save("tasks_and_homework_list.pdf");
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-serif font-semibold tracking-tight">Assignments & To-Dos</h1>
            <p className="text-muted-foreground mt-1">
              {isStudent 
                ? "View your assigned homework, download study PDFs, and submit your solutions."
                : "Manage homework, worksheets, and track student solution submissions."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2 h-9">
            <Download className="w-4 h-4" /> Export PDF List
          </Button>
          {isAdmin && (
            <div className="flex items-center gap-1 bg-secondary p-1 rounded-lg">
              <Button variant={!filterMyTasks ? "default" : "ghost"} size="sm" onClick={() => setFilterMyTasks(false)} className="rounded-md">All Tasks</Button>
              <Button variant={filterMyTasks ? "default" : "ghost"} size="sm" onClick={() => setFilterMyTasks(true)} className="rounded-md">My Tasks</Button>
            </div>
          )}
          {isStaff && (
            <div className="flex items-center gap-1 bg-secondary p-1 rounded-lg">
              <Button variant={!filterMyTasks ? "default" : "ghost"} size="sm" onClick={() => setFilterMyTasks(false)} className="rounded-md">All</Button>
              <Button variant={filterMyTasks ? "default" : "ghost"} size="sm" onClick={() => setFilterMyTasks(true)} className="rounded-md">Assigned by Me</Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Assign Task Card (Admin & Staff) */}
        {isAdminOrStaff && (
          <div className="lg:col-span-1">
            <Card className="sticky top-8 border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Assign Task / Homework</CardTitle>
                <CardDescription className="text-xs">
                  {isAdmin ? "Admin can assign tasks to staff, batches, or students." : "Staff coaches can assign tasks to students and batches."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Title *</Label>
                    <Input 
                      required 
                      placeholder="e.g. Tactical Puzzles Worksheet 4" 
                      value={form.title} 
                      onChange={(e) => setForm({ ...form, title: e.target.value })} 
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Assignee *</Label>
                    <Select value={form.assignee} onValueChange={(v) => setForm({ ...form, assignee: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {/* Admin can assign to Anyone (Staff, Students, Batches) */}
                        {isAdmin && (
                          <SelectGroup>
                            <SelectLabel>Staff & Organization</SelectLabel>
                            <SelectItem value="all_staff">All Staff Members</SelectItem>
                            {users.filter(u => u.role !== 'student').map(u => (
                              <SelectItem key={u.id} value={u.id}>Staff: {u.name || u.email}</SelectItem>
                            ))}
                          </SelectGroup>
                        )}

                        {/* Both Admin and Staff can assign to Students */}
                        <SelectGroup>
                          <SelectLabel>Students & Groups</SelectLabel>
                          <SelectItem value="all_students">All Students</SelectItem>
                        </SelectGroup>

                        {batches.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Batches</SelectLabel>
                            {batches.map(b => <SelectItem key={b.id} value={b.id}>Batch: {b.name}</SelectItem>)}
                          </SelectGroup>
                        )}

                        {students.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Individual Students</SelectLabel>
                            {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Due Date (Optional)</Label>
                    <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Description / Instructions</Label>
                    <Input 
                      placeholder="e.g. Solve exercises 1-12 before next class" 
                      value={form.description} 
                      onChange={(e) => setForm({ ...form, description: e.target.value })} 
                    />
                  </div>

                  {/* PDF Material Options */}
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-primary" />
                        PDF Material (Optional)
                      </Label>
                      {attachmentType !== "none" && (
                        <button
                          type="button"
                          onClick={removeAttachment}
                          className="text-[11px] text-muted-foreground hover:text-rose-600 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Mode Selector Buttons */}
                    <div className="grid grid-cols-2 gap-2 bg-secondary/50 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentType(attachmentType === "upload" ? "none" : "upload");
                          if (attachmentType !== "upload") {
                            setLinkUrl("");
                            setLinkTitle("");
                          }
                        }}
                        className={`py-1.5 px-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                          attachmentType === "upload"
                            ? "bg-white text-primary shadow-sm font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <FileUp className="w-3.5 h-3.5" />
                        Upload PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentType(attachmentType === "link" ? "none" : "link");
                          if (attachmentType !== "link") {
                            setSelectedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }
                        }}
                        className={`py-1.5 px-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                          attachmentType === "link"
                            ? "bg-white text-primary shadow-sm font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        Link to PDF
                      </button>
                    </div>

                    {/* Upload PDF Box */}
                    {attachmentType === "upload" && (
                      <div className="space-y-2 animate-in fade-in">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                          }}
                        />

                        {selectedFile ? (
                          <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <div className="p-2 bg-rose-500/10 text-rose-600 rounded-lg shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-xs font-medium truncate text-foreground">{selectedFile.name}</p>
                                <p className="text-[10px] text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeAttachment}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsDragging(false);
                              if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                              isDragging 
                                ? "border-primary bg-primary/5" 
                                : "border-border/80 hover:border-primary/50 hover:bg-secondary/40"
                            }`}
                          >
                            <Upload className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground" />
                            <p className="text-xs font-medium text-foreground">Click to browse or drag & drop</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">PDF worksheets, homework up to 15 MB</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Link to PDF Input */}
                    {attachmentType === "link" && (
                      <div className="space-y-2 animate-in fade-in bg-secondary/30 p-2.5 rounded-xl border border-border/60">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">PDF Link / URL *</Label>
                          <Input
                            type="url"
                            placeholder="https://drive.google.com/... or https://.../worksheet.pdf"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Link Title / Label (Optional)</Label>
                          <Input
                            placeholder="e.g. Puzzle Sheet 3 or Opening Study"
                            value={linkTitle}
                            onChange={(e) => setLinkTitle(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Students can click this link to directly view and download the PDF.
                        </p>
                      </div>
                    )}
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full gap-2 mt-2">
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating Task...
                      </>
                    ) : (
                      "Create Task"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tasks List */}
        <div className={`lg:col-span-${isAdminOrStaff ? '2' : '3'} space-y-8`}>
          {/* Pending / In-Progress Tasks */}
          <div>
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              Assigned Tasks & Homework
              <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-mono">{pendingTasks.length}</span>
            </h3>
            <div className="space-y-4">
              {pendingTasks.map(task => {
                const canComplete = isAdmin || (isStaff && (task.created_by === user?.id || task.assignee === user?.id));
                const canDelete = isAdmin || (isStaff && task.created_by === user?.id);
                const isSubmitted = task.status === "submitted" || !!task.solution;

                return (
                  <div key={task.id} className="p-4 md:p-5 rounded-2xl border bg-card hover:border-primary/40 transition-all shadow-xs space-y-3">
                    <div className="flex items-start gap-3">
                      {/* Only Admin or assigning Staff coach can toggle completed */}
                      {canComplete ? (
                        <div className="pt-0.5 shrink-0">
                          <div 
                            onClick={() => toggleStatus(task)}
                            title="Click to approve and mark completed"
                            className="w-5 h-5 rounded border-2 border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                          />
                        </div>
                      ) : (
                        <div className="pt-0.5 shrink-0">
                          <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                            <Clock className="w-3 h-3" />
                          </div>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium text-foreground text-base">{task.title}</h4>
                              {isSubmitted ? (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" /> Solution Submitted
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                  Pending Solution
                                </span>
                              )}
                            </div>
                          </div>

                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDeleteTask(task.id, e)}
                              title="Delete task"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap">{task.description}</p>
                        )}

                        {/* PDF Attachment Card (Worksheet from coach) */}
                        {task.pdf_url && (
                          <div className="mt-3 p-2.5 rounded-xl bg-secondary/60 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-2 bg-rose-500/10 text-rose-600 rounded-lg shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">
                                  {task.pdf_name || (task.pdf_type === "upload" ? "Worksheet.pdf" : "PDF Resource")}
                                </p>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                                  <span className="uppercase font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">PDF</span>
                                  {task.pdf_size && <span>{formatFileSize(task.pdf_size)}</span>}
                                  <span>•</span>
                                  <span>{task.pdf_type === "link" ? "External Link" : "Attached Worksheet"}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={(e) => handleViewPdf(task.pdf_url, e)}
                                className="h-7 text-xs gap-1.5 bg-background hover:bg-secondary"
                              >
                                {task.pdf_type === "link" ? <ExternalLink className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                {task.pdf_type === "link" ? "Open Link" : "View"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={(e) => handleDownloadPdf(task.pdf_url, task.pdf_name, task.pdf_type, e)}
                                className="h-7 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Download
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Submitted Solution Box (visible to Admin, Staff & Student) */}
                        {task.solution && (
                          <div className="mt-3 p-3 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-blue-900 flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                                Solution by {task.solution.submitted_by_name || "Student"}
                              </span>
                              {task.solution.submitted_at && (
                                <span className="text-[10px] text-blue-700 font-mono">
                                  {format(new Date(task.solution.submitted_at), "MMM d, h:mm a")}
                                </span>
                              )}
                            </div>

                            {task.solution.solution_text && (
                              <p className="text-xs text-blue-950 whitespace-pre-wrap bg-white/70 p-2.5 rounded-lg border border-blue-100">
                                {task.solution.solution_text}
                              </p>
                            )}

                            {task.solution.solution_url && (
                              <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                                <span className="truncate text-blue-800 text-[11px] font-medium flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  {task.solution.solution_name || "Solution Attachment"}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => handleViewPdf(task.solution.solution_url, e)}
                                    className="h-6 text-[10px] px-2 bg-white"
                                  >
                                    View
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="default"
                                    onClick={(e) => handleDownloadPdf(task.solution.solution_url, task.solution.solution_name, "upload", e)}
                                    className="h-6 text-[10px] px-2 bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    Download
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Coach Action on submitted solution */}
                            {canComplete && (
                              <div className="pt-1 flex justify-end">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => toggleStatus(task, "completed")}
                                  className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Approve & Mark Completed
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Student Action: Submit or Update Solution */}
                        {isStudent && (
                          <div className="mt-3 flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => openSolutionModal(task)}
                              className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground shadow-xs"
                            >
                              <Send className="w-3.5 h-3.5" />
                              {task.solution ? "Update Solution" : "Submit Solution"}
                            </Button>
                          </div>
                        )}

                        {/* Task Metadata Badges: Assigned to, Created by, Due Date */}
                        <div className="flex items-center gap-2.5 mt-3 text-xs text-muted-foreground font-medium flex-wrap pt-1 border-t border-border/40">
                          {/* Assignee Badge */}
                          <div className="flex items-center gap-1.5 bg-secondary px-2 py-0.5 rounded-md">
                            <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>Assigned to: <strong className="text-foreground">{getAssigneeLabel(task.assignee)}</strong></span>
                          </div>

                          {/* Created By Details (Visible to Admin, Staff & Student) */}
                          <div className="flex items-center gap-1.5 bg-secondary px-2 py-0.5 rounded-md">
                            <Shield className="w-3.5 h-3.5 text-primary" />
                            <span>Assigned by: <strong className="text-foreground">{getCreatedByLabel(task)}</strong></span>
                          </div>

                          {/* Due Date */}
                          {task.due_date && (
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ${new Date(task.due_date) < new Date() ? 'bg-rose-100 text-rose-700' : 'bg-secondary'}`}>
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Due: {format(new Date(task.due_date), "MMM d, yyyy")}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {pendingTasks.length === 0 && (
                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/60" />
                  <p className="font-medium">No active tasks</p>
                  <p className="text-xs">All assignments have been completed or none assigned.</p>
                </div>
              )}
            </div>
          </div>

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-4 text-muted-foreground flex items-center gap-2">
                Completed & Approved Tasks
                <span className="bg-secondary text-muted-foreground text-xs px-2 py-0.5 rounded-full font-mono">{completedTasks.length}</span>
              </h3>
              <div className="space-y-3 opacity-80 hover:opacity-100 transition-opacity">
                {completedTasks.map(task => {
                  const canComplete = isAdmin || (isStaff && (task.created_by === user?.id || task.assignee === user?.id));
                  const canDelete = isAdmin || (isStaff && task.created_by === user?.id);

                  return (
                    <div key={task.id} className="p-4 rounded-xl border bg-secondary/40 flex gap-4 group">
                      <div className="pt-0.5 shrink-0">
                        {canComplete ? (
                          <div 
                            onClick={() => toggleStatus(task, "pending")}
                            title="Click to mark pending / unapproved"
                            className="w-5 h-5 rounded border-2 border-emerald-600 bg-emerald-600 flex items-center justify-center cursor-pointer text-white"
                          >
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded border-2 border-emerald-600 bg-emerald-600 flex items-center justify-center text-white">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium line-through text-muted-foreground">{task.title}</h4>
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDeleteTask(task.id, e)}
                              title="Delete task"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-opacity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>

                        {/* PDF Attachment (also accessible when completed) */}
                        {task.pdf_url && (
                          <div className="mt-2 p-2 rounded-lg bg-card/60 border border-border/60 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="text-xs text-muted-foreground truncate">{task.pdf_name || "Worksheet PDF"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={(e) => handleViewPdf(task.pdf_url, e)}
                                className="h-6 text-[11px] px-2 gap-1"
                              >
                                <Eye className="w-3 h-3" /> View
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={(e) => handleDownloadPdf(task.pdf_url, task.pdf_name, task.pdf_type, e)}
                                className="h-6 text-[11px] px-2 gap-1"
                              >
                                <Download className="w-3 h-3" /> Download
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* View Submitted Solution */}
                        {task.solution && (
                          <div className="mt-2 text-xs text-emerald-800 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100 flex items-center justify-between">
                            <span>Solution was submitted by {task.solution.submitted_by_name || "Student"}</span>
                            {task.solution.solution_url && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewPdf(task.solution.solution_url)}
                                className="h-6 text-[11px] text-emerald-800 hover:bg-emerald-100"
                              >
                                View Solution PDF
                              </Button>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2.5 mt-2 text-[11px] text-muted-foreground flex-wrap">
                          <span>Assigned to: {getAssigneeLabel(task.assignee)}</span>
                          <span>•</span>
                          <span>Assigned by: {getCreatedByLabel(task)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Student Solution Submission Dialog */}
      <Dialog open={solutionDialogOpen} onOpenChange={setSolutionDialogOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Submit Task Solution
            </DialogTitle>
            <DialogDescription className="text-xs">
              {activeSolutionTask?.title}: submit your written answers, chess moves, or attach your solved worksheet.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitSolution} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Your Solution / Answer / PGN Moves</Label>
              <Textarea
                rows={4}
                placeholder="Type your moves, exercise answers, or notes here (e.g. 1. Rxg7+ Kxg7 2. Qg5+ Kh8...)"
                value={solutionText}
                onChange={(e) => setSolutionText(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>

            {/* Solution Attachment Option */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-primary" />
                  Attach Solution PDF or Link (Optional)
                </Label>
                {solutionAttachmentType !== "none" && (
                  <button
                    type="button"
                    onClick={() => {
                      setSolutionAttachmentType("none");
                      setSolutionFile(null);
                      setSolutionLinkUrl("");
                    }}
                    className="text-[11px] text-muted-foreground hover:text-rose-600 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 bg-secondary/50 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSolutionAttachmentType(solutionAttachmentType === "upload" ? "none" : "upload")}
                  className={`py-1.5 px-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    solutionAttachmentType === "upload"
                      ? "bg-white text-primary shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileUp className="w-3.5 h-3.5" />
                  Upload Solution PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSolutionAttachmentType(solutionAttachmentType === "link" ? "none" : "link")}
                  className={`py-1.5 px-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    solutionAttachmentType === "link"
                      ? "bg-white text-primary shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  Link to Study / PDF
                </button>
              </div>

              {solutionAttachmentType === "upload" && (
                <div className="space-y-2 animate-in fade-in">
                  <input
                    ref={solutionFileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleSolutionFileSelect(e.target.files[0]);
                    }}
                  />
                  {solutionFile ? (
                    <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xs truncate">{solutionFile.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSolutionFile(null)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => solutionFileInputRef.current?.click()}
                      className="border-2 border-dashed rounded-xl p-3 text-center cursor-pointer hover:border-primary/50 text-xs text-muted-foreground"
                    >
                      Click to choose solution PDF file (max 15 MB)
                    </div>
                  )}
                </div>
              )}

              {solutionAttachmentType === "link" && (
                <div className="space-y-2 animate-in fade-in bg-secondary/30 p-2.5 rounded-xl border border-border/60">
                  <Input
                    type="url"
                    placeholder="https://lichess.org/study/... or Google Drive URL"
                    value={solutionLinkUrl}
                    onChange={(e) => setSolutionLinkUrl(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSolutionDialogOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingSolution}
                className="rounded-xl text-xs gap-1.5"
              >
                {submittingSolution ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Submit to Coach
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

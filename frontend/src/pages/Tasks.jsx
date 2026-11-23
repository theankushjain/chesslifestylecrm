import { useState, useEffect, useRef } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Loader2
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";

export default function Tasks() {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === "admin" || user?.role === "staff";
  const fileInputRef = useRef(null);
  
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterMyTasks, setFilterMyTasks] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignee: "all_staff",
    due_date: "",
  });

  // PDF Attachment State: "none" | "upload" | "link"
  const [attachmentType, setAttachmentType] = useState("none");
  const [selectedFile, setSelectedFile] = useState(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      const [taskRes, userRes, stuRes, batchRes] = await Promise.all([
        api.get("/tasks"),
        isAdminOrStaff ? api.get("/users").catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        isAdminOrStaff ? api.get("/students").catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        isAdminOrStaff ? api.get("/batches").catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);
      setTasks(taskRes.data);
      if (isAdminOrStaff) {
        setUsers(userRes.data);
        setStudents(stuRes.data);
        setBatches(batchRes.data);
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
      setForm({ ...form, title: "", description: "", due_date: "" });
      removeAttachment();
      loadData();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (task) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    try {
      await api.patch(`/tasks/${task.id}`, { status: newStatus });
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
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

  const handleDownloadPdf = (task, e) => {
    e.stopPropagation();
    if (!task.pdf_url) return;

    if (task.pdf_type === "link") {
      window.open(task.pdf_url, "_blank", "noopener,noreferrer");
      return;
    }

    const fullUrl = getPdfFullUrl(task.pdf_url);
    const downloadUrl = `${fullUrl}?download=true`;

    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = task.pdf_name || "assignment.pdf";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleViewPdf = (task, e) => {
    e.stopPropagation();
    if (!task.pdf_url) return;
    const fullUrl = getPdfFullUrl(task.pdf_url);
    window.open(fullUrl, "_blank", "noopener,noreferrer");
  };

  const getAssigneeLabel = (assigneeId) => {
    if (assigneeId === "all_staff") return "All Staff";
    if (assigneeId === "all_students") return "All Students";
    const u = users.find(x => x.id === assigneeId);
    if (u) return u.name;
    const s = students.find(x => x.id === assigneeId);
    if (s) return s.name;
    const b = batches.find(x => x.id === assigneeId);
    if (b) return `Batch: ${b.name}`;
    return "Unknown";
  };

  if (loading) return <div className="p-8">Loading tasks...</div>;

  let displayTasks = tasks;
  if (user?.role === "admin" && filterMyTasks) {
    displayTasks = tasks.filter(t => t.assignee === user.id);
  }

  const pendingTasks = displayTasks.filter(t => t.status !== "completed");
  const completedTasks = displayTasks.filter(t => t.status === "completed");

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Tasks & Homework List", 14, 15);
    
    const tableColumn = ["Task Title", "Assignee", "Due Date", "PDF Material", "Status"];
    const tableRows = [];

    displayTasks.forEach(task => {
      const pdfText = task.pdf_url 
        ? (task.pdf_type === "upload" ? `File: ${task.pdf_name || "PDF"}` : `Link: ${task.pdf_name || "Link"}`)
        : "None";
      const taskData = [
        task.title,
        getAssigneeLabel(task.assignee),
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
            <p className="text-muted-foreground mt-1">Manage homework, lesson worksheets, and tasks with PDF materials.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2 h-9">
            <Download className="w-4 h-4" /> Export PDF List
          </Button>
          {user?.role === "admin" && (
            <div className="flex items-center gap-1 bg-secondary p-1 rounded-lg">
              <Button variant={!filterMyTasks ? "default" : "ghost"} size="sm" onClick={() => setFilterMyTasks(false)} className="rounded-md">All Tasks</Button>
              <Button variant={filterMyTasks ? "default" : "ghost"} size="sm" onClick={() => setFilterMyTasks(true)} className="rounded-md">My Tasks</Button>
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
                <CardDescription className="text-xs">Create an assignment with optional downloadable PDF material.</CardDescription>
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
                        <SelectGroup>
                          <SelectLabel>Global Groups</SelectLabel>
                          <SelectItem value="all_staff">All Staff</SelectItem>
                          <SelectItem value="all_students">All Students</SelectItem>
                        </SelectGroup>
                        {batches.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Batches</SelectLabel>
                            {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                          </SelectGroup>
                        )}
                        {users.filter(u => u.role !== 'student').length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Staff Members</SelectLabel>
                            {users.filter(u => u.role !== 'student').map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
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
          {/* Pending Tasks */}
          <div>
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              Pending Tasks & Homework
              <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-mono">{pendingTasks.length}</span>
            </h3>
            <div className="space-y-3">
              {pendingTasks.map(task => (
                <div key={task.id} className="p-4 rounded-xl border bg-card hover:border-primary/50 transition-colors flex gap-4 group">
                  <div className="pt-1">
                    <div 
                      onClick={() => toggleStatus(task)}
                      title="Click to mark completed"
                      className="w-5 h-5 rounded border-2 border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary group-hover:bg-primary/5 transition-colors"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-foreground text-base">{task.title}</h4>
                      {isAdminOrStaff && (
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

                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{task.description}</p>
                    )}

                    {/* PDF Attachment Card */}
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
                              <span>{task.pdf_type === "link" ? "External Link" : "Direct Attachment"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleViewPdf(task, e)}
                            className="h-7 text-xs gap-1.5 bg-background hover:bg-secondary"
                          >
                            {task.pdf_type === "link" ? <ExternalLink className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {task.pdf_type === "link" ? "Open Link" : "View"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={(e) => handleDownloadPdf(task, e)}
                            className="h-7 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground font-medium flex-wrap">
                      {isAdminOrStaff && (
                        <div className="flex items-center gap-1.5 bg-secondary px-2 py-1 rounded">
                          <UserIcon className="w-3.5 h-3.5" />
                          {getAssigneeLabel(task.assignee)}
                        </div>
                      )}
                      {task.due_date && (
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${new Date(task.due_date) < new Date() ? 'bg-rose-100 text-rose-700' : 'bg-secondary'}`}>
                          <Calendar className="w-3.5 h-3.5" />
                          Due: {format(new Date(task.due_date), "MMM d, yyyy")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {pendingTasks.length === 0 && (
                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/60" />
                  <p className="font-medium">You're all caught up!</p>
                  <p className="text-xs">No pending tasks or homework assignments.</p>
                </div>
              )}
            </div>
          </div>

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-4 text-muted-foreground flex items-center gap-2">
                Completed
                <span className="bg-secondary text-muted-foreground text-xs px-2 py-0.5 rounded-full font-mono">{completedTasks.length}</span>
              </h3>
              <div className="space-y-3 opacity-75 hover:opacity-100 transition-opacity">
                {completedTasks.map(task => (
                  <div key={task.id} className="p-4 rounded-xl border bg-secondary/50 flex gap-4 group">
                    <div className="pt-1">
                      <div 
                        onClick={() => toggleStatus(task)}
                        title="Click to mark pending"
                        className="w-5 h-5 rounded border-2 border-primary bg-primary flex items-center justify-center cursor-pointer"
                      >
                        <CheckSquare className="w-3 h-3 text-primary-foreground" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium line-through text-muted-foreground">{task.title}</h4>
                        {isAdminOrStaff && (
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
                            <span className="text-xs text-muted-foreground truncate">{task.pdf_name || "PDF Material"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={(e) => handleViewPdf(task, e)}
                              className="h-6 text-[11px] px-2 gap-1"
                            >
                              <Eye className="w-3 h-3" /> View
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleDownloadPdf(task, e)}
                              className="h-6 text-[11px] px-2 gap-1"
                            >
                              <Download className="w-3 h-3" /> Download
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

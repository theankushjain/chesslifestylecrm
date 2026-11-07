import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Landmark, Upload, X, Sparkles, Building2, Globe, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

export function InstitutePaymentDetailsDialog({ open, onOpenChange, institute, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState("default"); // "default" | "custom"

  const [form, setForm] = useState({
    account_name: "",
    upi_id: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    qr_code_url: "",
    notes: "",
  });

  const defaultPay = institute?.default_payment_details || {
    account_name: "The Chess Lifestyle",
    upi_id: "ankushjainr2@ybl",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    qr_code_url: "/tcl_upi_qr.png",
    notes: "Please scan the QR code to complete your payment instantly.",
  };

  useEffect(() => {
    if (institute && open) {
      const isCustom = Boolean(institute.has_custom_payment_details && institute.payment_details);
      setMode(isCustom ? "custom" : "default");

      const existing = institute.payment_details || {};
      setForm({
        account_name: existing.account_name || institute.name || "",
        upi_id: existing.upi_id || "",
        bank_name: existing.bank_name || "",
        account_number: existing.account_number || "",
        ifsc_code: existing.ifsc_code || "",
        qr_code_url: existing.qr_code_url || "",
        notes: existing.notes || "Please scan the QR code to complete your payment instantly.",
      });
    }
  }, [institute, open]);

  const handleQrUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 400;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        setForm((prev) => ({ ...prev, qr_code_url: canvas.toDataURL("image/png") }));
        toast.success("Custom QR code uploaded!");
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!institute) return;

    if (mode === "custom") {
      if (!form.account_name.trim()) {
        toast.error("Please provide an Account / Beneficiary Name");
        return;
      }
      if (!form.upi_id.trim()) {
        toast.error("Please provide a UPI ID for this institution");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        has_custom_payment_details: mode === "custom",
        payment_details: mode === "custom" ? form : null,
      };

      await api.patch(`/institutes/${institute.id}`, payload);
      toast.success(
        mode === "custom"
          ? `Custom payment details configured for ${institute.name}`
          : `${institute.name} reverted to global default payment details`
      );
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const previewQrSrc =
    mode === "custom"
      ? form.qr_code_url ||
        (form.upi_id
          ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
              `upi://pay?pa=${encodeURIComponent(form.upi_id)}&pn=${encodeURIComponent(form.account_name)}`
            )}`
          : "/tcl_upi_qr.png")
      : defaultPay.qr_code_url || "/tcl_upi_qr.png";

  const effectiveAccount = mode === "custom" ? form.account_name : defaultPay.account_name;
  const effectiveUpi = mode === "custom" ? form.upi_id : defaultPay.upi_id;
  const effectiveBank = mode === "custom" ? form.bank_name : defaultPay.bank_name;
  const effectiveAccNum = mode === "custom" ? form.account_number : defaultPay.account_number;
  const effectiveIfsc = mode === "custom" ? form.ifsc_code : defaultPay.ifsc_code;
  const effectiveNotes = mode === "custom" ? form.notes : defaultPay.notes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-widest">
            <Building2 className="w-4 h-4" />
            <span>Institution Payment Configuration</span>
          </div>
          <DialogTitle className="font-serif text-2xl">
            Payment Details – {institute?.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Choose whether student invoices for <strong>{institute?.name}</strong> should use the global TCL payment
            details or institution-specific custom payment details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Mode Selection */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
              Invoice Payment Configuration
            </Label>
            <RadioGroup
              value={mode}
              onValueChange={setMode}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <label
                htmlFor="mode-default"
                className={`p-3.5 rounded-xl border cursor-pointer text-xs transition-all space-y-1.5 ${
                  mode === "default"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border/60 hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <RadioGroupItem value="default" id="mode-default" />
                    <span>Use Global Default</span>
                  </div>
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed pl-6">
                  Inherits academy default ({defaultPay.account_name} / {defaultPay.upi_id}). Updates automatically
                  when default changes.
                </p>
              </label>

              <label
                htmlFor="mode-custom"
                className={`p-3.5 rounded-xl border cursor-pointer text-xs transition-all space-y-1.5 ${
                  mode === "custom"
                    ? "border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600"
                    : "border-border/60 hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <RadioGroupItem value="custom" id="mode-custom" />
                    <span>Customize for this Institution</span>
                  </div>
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed pl-6">
                  Overrides default with specific UPI ID, bank details, or QR code for this institution.
                </p>
              </label>
            </RadioGroup>
          </div>

          {/* Mode = Default Info Card */}
          {mode === "default" && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Currently using Global Default Payment Details</span>
              </div>
              <div className="text-slate-600 text-[11px] space-y-1 pl-6">
                <div>Beneficiary: <strong>{defaultPay.account_name}</strong></div>
                <div>UPI / VPA: <strong className="font-mono">{defaultPay.upi_id}</strong></div>
                {defaultPay.bank_name && <div>Bank: <strong>{defaultPay.bank_name}</strong></div>}
                <div className="text-slate-500 pt-1">
                  When you update the Global Default Payment Details in Settings/Institutes, this institution will
                  reflect the updated details automatically.
                </div>
              </div>
            </div>
          )}

          {/* Mode = Custom Input Form */}
          {mode === "custom" && (
            <div className="space-y-4 border border-emerald-200 rounded-xl p-4 bg-emerald-50/20">
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Custom Payment Details for {institute?.name}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                    Beneficiary / Account Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.account_name}
                    onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                    placeholder="e.g. DPS Chess Club or TCL Account"
                    className="rounded-xl mt-1 bg-white"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                    Custom UPI ID / VPA <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.upi_id}
                    onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
                    placeholder="e.g. schoolname@upi"
                    className="rounded-xl mt-1 font-mono bg-white"
                    required
                  />
                </div>
              </div>

              {/* QR Upload */}
              <div>
                <Label className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-1 block">
                  Institution QR Code
                </Label>
                <div className="flex items-center gap-4 p-3 bg-white border border-border/60 rounded-xl">
                  <div className="relative group shrink-0">
                    <img
                      src={previewQrSrc}
                      alt="Institution QR Code"
                      className="w-16 h-16 object-contain rounded-lg border border-border/60 bg-white p-1 shadow-sm"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          {form.qr_code_url ? "Change QR Code" : "Upload Custom QR"}
                        </span>
                      </label>
                      {form.qr_code_url && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setForm({ ...form, qr_code_url: "" })}
                          className="h-7 text-xs text-muted-foreground hover:text-destructive rounded-lg"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      If no custom QR image is uploaded, a QR code will be automatically generated from the UPI ID.
                    </p>
                  </div>
                </div>
              </div>

              {/* Optional Bank Details */}
              <div className="border border-border/50 rounded-xl p-3 bg-white space-y-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-primary" />
                  <span>Optional Bank Transfer Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Bank Name</Label>
                    <Input
                      value={form.bank_name}
                      onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                      placeholder="e.g. ICICI Bank"
                      className="rounded-xl mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Account Number</Label>
                    <Input
                      value={form.account_number}
                      onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                      placeholder="e.g. 000123456789"
                      className="rounded-xl mt-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">IFSC Code</Label>
                    <Input
                      value={form.ifsc_code}
                      onChange={(e) => setForm({ ...form, ifsc_code: e.target.value.toUpperCase() })}
                      placeholder="e.g. ICIC0000001"
                      className="rounded-xl mt-1 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                  Payment Instructions / Note
                </Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Please scan the QR code to complete your payment instantly."
                  className="rounded-xl mt-1 text-xs bg-white"
                />
              </div>
            </div>
          )}

          {/* Live Preview Box */}
          <div className="pt-1">
            <Label className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-1.5 block">
              Resulting Invoice Box Preview for {institute?.name}
            </Label>
            <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50/80 flex items-center gap-3.5 text-xs">
              <div className="w-14 h-14 bg-white border border-slate-200 rounded-lg p-1 shrink-0 flex items-center justify-center">
                <img src={previewQrSrc} alt="QR Preview" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">Payment Details</span>
                  <span
                    className={`text-[10px] px-2 py-0.2 rounded-full font-medium ${
                      mode === "custom"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-blue-100 text-blue-800 border border-blue-200"
                    }`}
                  >
                    {mode === "custom" ? "Custom" : "Global Default"}
                  </span>
                </div>
                <div className="text-slate-600 truncate text-[11px]">
                  Beneficiary: <strong>{effectiveAccount || "The Chess Lifestyle"}</strong>
                </div>
                <div className="inline-block font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-800">
                  UPI: {effectiveUpi || "ankushjainr2@ybl"}
                </div>
                {(effectiveBank || effectiveAccNum || effectiveIfsc) && (
                  <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-3 pt-0.5 font-mono">
                    {effectiveBank && <span>Bank: <strong>{effectiveBank}</strong></span>}
                    {effectiveAccNum && <span>A/C: <strong>{effectiveAccNum}</strong></span>}
                    {effectiveIfsc && <span>IFSC: <strong>{effectiveIfsc}</strong></span>}
                  </div>
                )}
                {effectiveNotes && <div className="text-[10px] text-slate-500 pt-0.5">{effectiveNotes}</div>}
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="rounded-xl shadow-sm">
              {saving ? "Saving..." : "Save Payment Details"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
import { Textarea } from "@/components/ui/textarea";
import { Landmark, Upload, X, QrCode, Sparkles, Check, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

const TCL_DEFAULT_PAYMENT = {
  account_name: "The Chess Lifestyle",
  upi_id: "ankushjainr2@ybl",
  bank_name: "",
  account_number: "",
  ifsc_code: "",
  qr_code_url: "/tcl_upi_qr.png",
  notes: "Please scan the QR code to complete your payment instantly.",
};

export function DefaultPaymentDetailsDialog({ open, onOpenChange, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(TCL_DEFAULT_PAYMENT);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/settings/payment-details");
      setForm({
        account_name: data.account_name || TCL_DEFAULT_PAYMENT.account_name,
        upi_id: data.upi_id || TCL_DEFAULT_PAYMENT.upi_id,
        bank_name: data.bank_name || "",
        account_number: data.account_number || "",
        ifsc_code: data.ifsc_code || "",
        qr_code_url: data.qr_code_url !== undefined ? data.qr_code_url : TCL_DEFAULT_PAYMENT.qr_code_url,
        notes: data.notes || TCL_DEFAULT_PAYMENT.notes,
      });
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

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
        toast.success("QR code uploaded!");
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleResetToTclDefaults = () => {
    setForm(TCL_DEFAULT_PAYMENT);
    toast.info("Reset form to original TCL defaults");
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!form.account_name?.trim()) {
      toast.error("Please provide an Account / Beneficiary Name");
      return;
    }
    if (!form.upi_id?.trim()) {
      toast.error("Please provide a default UPI ID");
      return;
    }

    setSaving(true);
    try {
      await api.put("/settings/payment-details", form);
      toast.success("Default payment details updated for all standard institutions!");
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const previewQrSrc =
    form.qr_code_url ||
    (form.upi_id === "ankushjainr2@ybl"
      ? "/tcl_upi_qr.png"
      : `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
          `upi://pay?pa=${encodeURIComponent(form.upi_id)}&pn=${encodeURIComponent(form.account_name)}`
        )}`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-widest">
            <Landmark className="w-4 h-4" />
            <span>Invoice Settings</span>
          </div>
          <DialogTitle className="font-serif text-2xl">Default Payment Details</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure the default payment & UPI details shown on student invoices. Changes made here apply to
            all institutions in one go, except those you specifically customize.
          </DialogDescription>
        </DialogHeader>

        {/* Global Propagation Alert */}
        <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-start gap-3 text-xs text-blue-900">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-blue-950">One-Go Global Update</p>
            <p className="text-blue-800 leading-relaxed">
              When you save, every institution that has not been specifically customized will automatically reflect
              these new payment details on their invoices. Institutions with custom payment details remain untouched.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Account / Beneficiary Name & UPI ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                Beneficiary / Account Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.account_name}
                onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                placeholder="The Chess Lifestyle"
                className="rounded-xl mt-1"
                required
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                Default UPI ID / VPA <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.upi_id}
                onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
                placeholder="ankushjainr2@ybl"
                className="rounded-xl mt-1 font-mono"
                required
              />
            </div>
          </div>

          {/* QR Code upload & preview */}
          <div>
            <Label className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-1 block">
              Default QR Code
            </Label>
            <div className="flex items-center gap-4 p-3.5 bg-muted/20 border border-border/60 rounded-xl">
              <div className="relative group shrink-0">
                <img
                  src={previewQrSrc}
                  alt="Default QR Code"
                  className="w-20 h-20 object-contain rounded-lg border border-border/60 bg-white p-1 shadow-sm"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      Upload Custom QR
                    </span>
                  </label>
                  {form.qr_code_url && form.qr_code_url !== "/tcl_upi_qr.png" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setForm({ ...form, qr_code_url: "/tcl_upi_qr.png" })}
                      className="h-7 text-xs rounded-lg text-muted-foreground hover:text-destructive"
                    >
                      Reset to TCL QR
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Upload a custom UPI QR code image (PNG, JPG), or keep default to auto-generate from the UPI ID.
                </p>
              </div>
            </div>
          </div>

          {/* Optional Bank Details */}
          <div className="border border-border/50 rounded-xl p-3.5 bg-muted/10 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-primary" />
              <span>Optional Bank Details (for NEFT / IMPS / Bank Transfer)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px] text-muted-foreground">Bank Name</Label>
                <Input
                  value={form.bank_name}
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                  placeholder="e.g. HDFC Bank"
                  className="rounded-xl mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Account Number</Label>
                <Input
                  value={form.account_number}
                  onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                  placeholder="e.g. 50100234567890"
                  className="rounded-xl mt-1 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">IFSC Code</Label>
                <Input
                  value={form.ifsc_code}
                  onChange={(e) => setForm({ ...form, ifsc_code: e.target.value.toUpperCase() })}
                  placeholder="e.g. HDFC0001234"
                  className="rounded-xl mt-1 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Payment Notes */}
          <div>
            <Label className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
              Payment Instructions / Note
            </Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Please scan the QR code to complete your payment instantly."
              className="rounded-xl mt-1 text-xs"
            />
          </div>

          {/* Live Preview of Invoice Box */}
          <div className="pt-2">
            <Label className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-1.5 block">
              Live Invoice Box Preview
            </Label>
            <div className="p-4 rounded-xl border border-slate-300 bg-slate-50/80 flex items-center gap-4 text-xs shadow-inner">
              <div className="w-16 h-16 bg-white border border-slate-200 rounded-lg p-1 shrink-0 flex items-center justify-center">
                <img src={previewQrSrc} alt="QR Preview" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                <div className="font-bold text-slate-900 text-sm">Payment Details</div>
                <div className="text-slate-600 truncate">
                  Beneficiary: <strong>{form.account_name || "The Chess Lifestyle"}</strong>
                </div>
                <div className="inline-block font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-800">
                  UPI: {form.upi_id || "ankushjainr2@ybl"}
                </div>
                {(form.bank_name || form.account_number || form.ifsc_code) && (
                  <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-3 pt-0.5 font-mono">
                    {form.bank_name && <span>Bank: <strong>{form.bank_name}</strong></span>}
                    {form.account_number && <span>A/C: <strong>{form.account_number}</strong></span>}
                    {form.ifsc_code && <span>IFSC: <strong>{form.ifsc_code}</strong></span>}
                  </div>
                )}
                {form.notes && <div className="text-[11px] text-slate-500 pt-0.5">{form.notes}</div>}
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetToTclDefaults}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset to Original Defaults
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || loading} className="rounded-xl shadow-sm">
                {saving ? "Saving..." : "Save Default Details"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

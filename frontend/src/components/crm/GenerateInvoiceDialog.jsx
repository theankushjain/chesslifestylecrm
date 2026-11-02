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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText, Pencil, BadgeIndianRupee } from "lucide-react";
import { WhatsappIcon } from "@/components/crm/WhatsappIcon";
import { openWhatsapp, studentInvoiceMessage } from "@/lib/whatsapp";
import { toast } from "sonner";
import { generateInvoice, buildInvoiceNumber } from "@/lib/invoiceGenerator";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

/**
 * Dialog to generate a branded invoice for a student.
 *
 * Props:
 *   open            – boolean
 *   onOpenChange    – setter
 *   student         – student object from API (must have fee_amount / monthly_fee)
 *   payment         – optional payment record from ledger (with amount, month, year, status)
 */
export function GenerateInvoiceDialog({ open, onOpenChange, student, payment = null }) {
  const now = new Date();
  const defaultFee = payment?.amount !== undefined ? payment.amount : (student?.fee_amount || student?.monthly_fee || 0);

  /* ── form state ── */
  const [amountMode, setAmountMode] = useState("default"); // "default" | "custom"
  const [customAmt, setCustomAmt] = useState("");
  const [description, setDescription] = useState(
    payment?.status === "paid" ? "Monthly Chess Classes (Fee Receipt)" : "Monthly Chess Classes"
  );

  const [qty, setQty] = useState(8);
  const [invoiceDate, setInvoiceDate] = useState(
    payment?.paid_date ? payment.paid_date.slice(0, 10) : now.toISOString().slice(0, 10)
  );
  const [previewNum, setPreviewNum] = useState("");

  /* Auto-derive sub-description from qty + invoiceDate or payment */
  const derivedDescNotes = (() => {
    if (payment?.month && payment?.year) {
      const mLabel = MONTHS[payment.month - 1];
      return `${qty} regular classes in ${mLabel} ${payment.year}`;
    }
    const d = invoiceDate ? new Date(invoiceDate + "T12:00:00") : now;
    const mLabel = MONTHS[d.getMonth()];
    return `${qty} regular classes in ${mLabel} ${d.getFullYear()}`;
  })();

  const [descNotesOverride, setDescNotesOverride] = useState(null); // null = use derived
  const descNotes = descNotesOverride !== null ? descNotesOverride : derivedDescNotes;

  /* re-compute preview invoice number whenever date changes */
  useEffect(() => {
    if (invoiceDate) {
      const d = new Date(invoiceDate + "T" + now.toTimeString().slice(0, 8));
      setPreviewNum(buildInvoiceNumber(d));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceDate]);

  /* reset on open */
  useEffect(() => {
    if (open) {
      setAmountMode("default");
      setCustomAmt("");
      setDescription(payment?.status === "paid" ? "Monthly Chess Classes (Fee Receipt)" : "Monthly Chess Classes");
      setQty(8);
      setDescNotesOverride(null);
      setInvoiceDate(payment?.paid_date ? payment.paid_date.slice(0, 10) : now.toISOString().slice(0, 10));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, payment]);

  const effectiveAmount = amountMode === "default" ? defaultFee : Number(customAmt) || 0;

  const handleGenerate = (sendWhatsApp = false) => {
    if (!student) return;
    if (effectiveAmount <= 0) {
      toast.error("Invoice amount must be greater than 0");
      return;
    }

    const date = invoiceDate
      ? new Date(invoiceDate + "T" + new Date().toTimeString().slice(0, 8))
      : new Date();

    const invNum = generateInvoice({
      student,
      amount: effectiveAmount,
      description,
      descNotes,
      qty: Number(qty) || 1,
      invoiceDate: date,
    });

    if (invNum) {
      if (sendWhatsApp) {
        const phone = student.parent_phone || student.phone;
        if (phone) {
          openWhatsapp(phone, studentInvoiceMessage(student, payment, invNum, effectiveAmount));
          toast.success(`Invoice ${invNum} generated & WhatsApp message prepared!`);
        } else {
          toast.warning(`Invoice ${invNum} generated, but no phone number found for student`);
        }
      } else {
        toast.success(`Invoice ${invNum} opened in new tab`);
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md shadow-2xl" data-testid="generate-invoice-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <FileText className="w-5 h-5" />
            </span>
            {payment?.status === "paid" ? "Generate Paid Receipt / Invoice" : "Generate Fee Invoice"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Create and send a branded invoice for{" "}
            <span className="font-semibold text-foreground">{student?.name}</span>
            {payment?.month && payment?.year ? ` for ${MONTHS[payment.month - 1]} ${payment.year}` : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Invoice number preview */}
          <div className="flex items-center gap-2 bg-muted/50 border border-border/40 rounded-xl px-4 py-2.5">
            <BadgeIndianRupee className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Invoice Number</div>
              <div className="font-mono text-sm font-semibold text-foreground">{previewNum}</div>
            </div>
          </div>

          {/* Amount selector */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Amount</Label>
            <RadioGroup
              value={amountMode}
              onValueChange={setAmountMode}
              className="grid grid-cols-2 gap-2"
            >
              <label
                htmlFor="r-default"
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  amountMode === "default"
                    ? "border-primary bg-primary/5 text-primary font-medium"
                    : "border-border/60 hover:bg-muted/50 text-foreground"
                }`}
              >
                <RadioGroupItem value="default" id="r-default" />
                <div className="text-xs">
                  <div className="font-semibold">
                    {payment?.amount !== undefined ? "Fee Amount" : "Monthly Fee"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    ₹{defaultFee.toLocaleString("en-IN")}
                  </div>
                </div>
              </label>

              <label
                htmlFor="r-custom"
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  amountMode === "custom"
                    ? "border-primary bg-primary/5 text-primary font-medium"
                    : "border-border/60 hover:bg-muted/50 text-foreground"
                }`}
              >
                <RadioGroupItem value="custom" id="r-custom" />
                <div className="text-xs">
                  <div className="font-semibold">Custom Amount</div>
                  <div className="text-[11px] text-muted-foreground">Enter custom INR</div>
                </div>
              </label>
            </RadioGroup>

            {amountMode === "custom" && (
              <div className="mt-2 animate-in fade-in-50">
                <Input
                  type="number"
                  placeholder="e.g. 3500"
                  value={customAmt}
                  onChange={(e) => setCustomAmt(e.target.value)}
                  className="rounded-xl"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl"
              placeholder="e.g. Monthly Chess Classes"
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Invoice Date</Label>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="rounded-xl"
            />
          </div>

          {/* Qty + Notes row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-1 block">Quantity</Label>
              <Input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => {
                  setQty(e.target.value);
                  setDescNotesOverride(null); // re-derive from new qty
                }}
                className="rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-1 block">Sub-description</Label>
              <Input
                value={descNotes}
                onChange={(e) => setDescNotesOverride(e.target.value)}
                className="rounded-xl"
                placeholder="e.g. 8 regular classes in Oct 2026"
              />
            </div>
          </div>

          {/* Total preview */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {payment?.status === "paid" ? "Paid Total" : "Total Due"}
            </span>
            <span className="text-xl font-serif font-bold text-primary">
              ₹{effectiveAmount.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2">
          <Button variant="ghost" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {(student?.parent_phone || student?.phone) && (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-[#25D366]/50 text-[#128C7E] hover:bg-[#25D366]/10 font-medium text-xs h-9"
                onClick={() => handleGenerate(true)}
                disabled={effectiveAmount <= 0}
              >
                <WhatsappIcon className="w-3.5 h-3.5 mr-1.5" />
                Send via WhatsApp
              </Button>
            )}
            <Button
              className="rounded-xl text-xs h-9"
              onClick={() => handleGenerate(false)}
              disabled={effectiveAmount <= 0}
              data-testid="generate-invoice-btn"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Print / PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

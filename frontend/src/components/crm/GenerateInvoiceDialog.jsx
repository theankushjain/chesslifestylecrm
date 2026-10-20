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
 */
export function GenerateInvoiceDialog({ open, onOpenChange, student }) {
  const now          = new Date();
  const defaultFee   = student?.fee_amount || student?.monthly_fee || 0;

  /* ── form state ── */
  const [amountMode, setAmountMode]   = useState("default"); // "default" | "custom"
  const [customAmt,  setCustomAmt]    = useState("");
  const [description, setDescription] = useState("Monthly Chess Classes");
  const [descNotes,   setDescNotes]   = useState("");
  const [qty,         setQty]         = useState(1);
  const [invoiceDate, setInvoiceDate] = useState(now.toISOString().slice(0,10));
  const [previewNum,  setPreviewNum]  = useState("");

  /* re-compute preview invoice number whenever date changes */
  useEffect(() => {
    if (invoiceDate) {
      const d = new Date(invoiceDate + "T" + now.toTimeString().slice(0,8));
      setPreviewNum(buildInvoiceNumber(d));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceDate]);

  /* reset on open */
  useEffect(() => {
    if (open) {
      setAmountMode("default");
      setCustomAmt("");
      setDescription("Monthly Chess Classes");
      const mLabel = MONTHS[now.getMonth()];
      setDescNotes(`${qty} classes in ${mLabel} ${now.getFullYear()}`);
      setQty(1);
      setInvoiceDate(now.toISOString().slice(0,10));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const effectiveAmount =
    amountMode === "default" ? defaultFee : Number(customAmt) || 0;

  const handleGenerate = () => {
    if (!student) return;
    if (effectiveAmount <= 0) {
      toast.error("Invoice amount must be greater than 0");
      return;
    }

    const date    = invoiceDate
      ? new Date(invoiceDate + "T" + new Date().toTimeString().slice(0, 8))
      : new Date();

    const invNum = generateInvoice({
      student,
      amount:      effectiveAmount,
      description,
      descNotes,
      qty:         Number(qty) || 1,
      invoiceDate: date,
    });

    if (invNum) {
      toast.success(`Invoice ${invNum} opened in new tab`);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-xl max-w-md"
        data-testid="generate-invoice-dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <FileText className="w-5 h-5" />
            </span>
            Generate Invoice
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Create a printable invoice for{" "}
            <span className="font-semibold text-foreground">
              {student?.name}
            </span>
            . The invoice number is based on today's date &amp; time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Invoice number preview */}
          <div className="flex items-center gap-2 bg-muted/50 border border-border/40 rounded-xl px-4 py-2.5">
            <BadgeIndianRupee className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Invoice Number
              </div>
              <div className="font-mono text-sm font-semibold text-foreground">
                {previewNum}
              </div>
            </div>
          </div>

          {/* Invoice date */}
          <div>
            <Label className="text-xs uppercase tracking-widest font-semibold mb-1.5 block">
              Invoice Date
            </Label>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="rounded-xl"
            />
          </div>

          {/* Amount selector */}
          <div>
            <Label className="text-xs uppercase tracking-widest font-semibold mb-2 block">
              Fee Amount
            </Label>
            <RadioGroup
              value={amountMode}
              onValueChange={setAmountMode}
              className="space-y-2"
            >
              {/* Default fee */}
              <label
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  amountMode === "default"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <RadioGroupItem value="default" id="inv-amt-default" />
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    Default fee
                    <span className="ml-2 font-mono text-primary font-semibold">
                      ₹{defaultFee.toLocaleString("en-IN")}
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      /{student?.fee_type === "per_class" ? "class" : "month"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Use the student's registered fee amount
                  </div>
                </div>
              </label>

              {/* Custom amount */}
              <label
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  amountMode === "custom"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <RadioGroupItem value="custom" id="inv-amt-custom" />
                <div className="flex-1">
                  <div className="text-sm font-medium flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> Custom amount
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Enter a specific amount for this invoice
                  </div>
                </div>
              </label>
            </RadioGroup>

            {amountMode === "custom" && (
              <div className="mt-2">
                <Label className="text-xs uppercase tracking-widest font-semibold mb-1 block">
                  Amount (₹)
                </Label>
                <Input
                  type="number"
                  min={0}
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
          <div>
            <Label className="text-xs uppercase tracking-widest font-semibold mb-1.5 block">
              Description
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl"
              placeholder="Monthly Chess Classes"
            />
          </div>

          {/* Qty + Notes row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest font-semibold mb-1.5 block">
                Quantity
              </Label>
              <Input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-semibold mb-1.5 block">
                Sub-description
              </Label>
              <Input
                value={descNotes}
                onChange={(e) => setDescNotes(e.target.value)}
                className="rounded-xl"
                placeholder="e.g. 6 classes in Oct 2026"
              />
            </div>
          </div>

          {/* Total preview */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Due</span>
            <span className="text-xl font-serif font-bold text-primary">
              ₹{effectiveAmount.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="rounded-xl"
            onClick={handleGenerate}
            disabled={effectiveAmount <= 0}
            data-testid="generate-invoice-btn"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            Generate Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

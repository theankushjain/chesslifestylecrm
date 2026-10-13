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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IndianRupee, AlertCircle, RotateCcw } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function MarkPaidDialog({
  open,
  onOpenChange,
  payment,
  studentName = "Student",
  onSuccess,
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("UPI");
  const [saving, setSaving] = useState(false);

  // When payment changes or dialog opens, prefill values
  useEffect(() => {
    if (payment) {
      setAmount(
        payment.amount !== undefined && payment.amount !== null
          ? String(payment.amount)
          : ""
      );
      setMethod(payment.method || "UPI");
    }
  }, [payment, open]);

  const scheduledAmount = Number(payment?.amount ?? 0);
  const currentNumAmount = parseFloat(amount);
  const isChanged = !isNaN(currentNumAmount) && currentNumAmount !== scheduledAmount;
  const isPartial = !isNaN(currentNumAmount) && currentNumAmount < scheduledAmount;

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!payment) return;

    if (amount === "" || isNaN(currentNumAmount)) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (currentNumAmount < 0) {
      toast.error("Amount cannot be negative");
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/payments/${payment.id}`, {
        status: "paid",
        amount: currentNumAmount,
        method: method || "UPI",
      });

      toast.success(
        `Marked as paid: ₹${currentNumAmount.toLocaleString("en-IN")}`
      );
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const monthLabel = payment?.month
    ? MONTH_NAMES[payment.month - 1] || `Month ${payment.month}`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl max-w-md" data-testid="mark-paid-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <IndianRupee className="w-5 h-5" />
            </span>
            Mark Fee as Paid
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Confirm fee payment. You can adjust the amount if the parent did not pay the complete amount.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Fee & Student Summary Banner */}
          <div className="bg-muted/40 border border-border/60 rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <div className="label-over text-[9px]">Student</div>
                <div className="font-medium text-base text-foreground">{studentName}</div>
              </div>
              <div className="text-right">
                <div className="label-over text-[9px]">Fee Period</div>
                <div className="font-mono text-sm text-foreground">
                  {monthLabel} {payment?.year}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border/40 text-xs">
              <span className="text-muted-foreground">Scheduled Fee Due:</span>
              <span className="font-mono font-medium text-foreground">
                ₹{scheduledAmount.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Amount Paid input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="mark-paid-amount-input" className="text-xs uppercase tracking-widest font-semibold">
                Amount Paid (₹) <span className="text-destructive">*</span>
              </Label>
              {isChanged && (
                <button
                  type="button"
                  onClick={() => setAmount(String(scheduledAmount))}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset to ₹{scheduledAmount}
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                ₹
              </span>
              <Input
                id="mark-paid-amount-input"
                data-testid="mark-paid-amount-input"
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7 rounded-xl font-mono text-base"
                placeholder="Enter paid amount"
                autoFocus
              />
            </div>

            {/* Note when amount differs */}
            {isPartial ? (
              <div className="flex items-start gap-1.5 mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  Partial payment of ₹{currentNumAmount} recorded. No balance record will be maintained.
                </span>
              </div>
            ) : isChanged && currentNumAmount > scheduledAmount ? (
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Amount is ₹{currentNumAmount - scheduledAmount} higher than scheduled fee.
              </p>
            ) : null}
          </div>

          {/* Payment Method selector */}
          <div>
            <Label className="text-xs uppercase tracking-widest font-semibold mb-1.5 block">
              Payment Method
            </Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger data-testid="mark-paid-method-select" className="rounded-xl">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="UPI">UPI (Google Pay / PhonePe / Paytm)</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer (NEFT / IMPS / RTGS)</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="Card">Credit / Debit Card</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              data-testid="mark-paid-confirm-btn"
              className="rounded-xl"
            >
              {saving ? "Saving..." : "Confirm & Mark Paid"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default MarkPaidDialog;

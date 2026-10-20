/**
 * Invoice Generator for The Chess Lifestyle CRM
 * Generates a printable invoice matching the brand PDF template.
 *
 * Invoice number format: INV-{YY}-{DDMM}{HHmmss}
 *   e.g.  INV-26-20101935  → generated 20 Oct 2026 at 19:35
 */

/**
 * Build invoice number from a Date object.
 * Format: INV-YY-DDMMHHmmss
 */
export function buildInvoiceNumber(date = new Date()) {
  const yy   = String(date.getFullYear()).slice(2);
  const dd   = String(date.getDate()).padStart(2, "0");
  const mm   = String(date.getMonth() + 1).padStart(2, "0");
  const HH   = String(date.getHours()).padStart(2, "0");
  const min  = String(date.getMinutes()).padStart(2, "0");
  const ss   = String(date.getSeconds()).padStart(2, "0");
  return `INV-${yy}-${dd}${mm}${HH}${min}${ss}`;
}

/** Format a date as "20 Oct 2026" */
function formatDate(date) {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Format a number as Indian currency string */
function fmtAmt(n) {
  return Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Generate and open a printable invoice in a new browser window.
 *
 * @param {Object} opts
 * @param {Object} opts.student         – student document from API
 * @param {number} opts.amount          – invoice amount (INR)
 * @param {string} opts.description     – line-item description
 * @param {string} [opts.descNotes]     – sub-description (e.g. "6 classes in October 2026")
 * @param {number} opts.qty             – quantity (set to 1 for flat fee)
 * @param {number} opts.rate            – rate per unit (= amount / qty)
 * @param {Date}   [opts.invoiceDate]   – defaults to now
 */
export function generateInvoice({
  student,
  amount,
  description = "Monthly Chess Classes",
  descNotes = "",
  qty = 1,
  rate,
  invoiceDate,
}) {
  const now        = invoiceDate || new Date();
  const invoiceNum = buildInvoiceNumber(now);
  const dateStr    = formatDate(now);
  const effectiveRate = rate !== undefined ? rate : amount / qty;

  const qrSrc   = `${window.location.origin}/tcl_upi_qr.png`;
  const logoSrc  = `${window.location.origin}/tcl_logo.png`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${invoiceNum} – ${student.name}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Roboto', sans-serif;
      font-size: 10pt;
      background: #fff;
      color: #1e293b;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 14mm 14mm 22mm 14mm;
      background: #fff;
      position: relative;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10mm;
    }
    .logo-wrap img { height: 24mm; width: auto; object-fit: contain; }
    .invoice-meta { text-align: right; }
    .invoice-meta h1 {
      font-size: 26pt;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 3mm;
    }
    .invoice-meta table { margin-left: auto; border-collapse: collapse; }
    .invoice-meta td { padding: 0.5mm 0; font-size: 9pt; }
    .invoice-meta td:first-child { font-weight: 700; padding-right: 4mm; color: #475569; }
    .divider { height: 0.4mm; background: #e2e8f0; margin-bottom: 7mm; }
    .billing { display: flex; gap: 0; margin-bottom: 8mm; }
    .billing-col { flex: 1; }
    .billing-label {
      font-size: 7.5pt; font-weight: 700; letter-spacing: 0.08em;
      text-transform: uppercase; color: #94a3b8; margin-bottom: 2mm;
    }
    .billing-name { font-size: 11pt; font-weight: 700; color: #1e293b; }
    .billing-sub { font-size: 9.5pt; color: #475569; margin-top: 1mm; }
    .billing-divider-v { width: 0.3mm; background: #e2e8f0; margin: 0 8mm; }
    table.items { width: 100%; border-collapse: collapse; margin-bottom: 6mm; }
    table.items thead tr { background: #f1f5f9; }
    table.items thead th {
      font-size: 7.5pt; font-weight: 700; letter-spacing: 0.08em;
      text-transform: uppercase; color: #64748b; padding: 3mm 4mm; text-align: left;
    }
    table.items thead th.right { text-align: right; }
    table.items thead th.center { text-align: center; }
    table.items tbody tr { border-bottom: 0.3mm solid #e2e8f0; }
    table.items tbody td { padding: 4mm 4mm; vertical-align: top; }
    table.items tbody td.right { text-align: right; }
    table.items tbody td.center { text-align: center; }
    .item-desc-main { font-weight: 700; font-size: 9.5pt; }
    .item-desc-sub { font-size: 8.5pt; color: #64748b; margin-top: 0.5mm; }
    .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 10mm; }
    table.totals { width: 72mm; border-collapse: collapse; }
    table.totals td { padding: 2mm 4mm; font-size: 9.5pt; }
    table.totals td:last-child { text-align: right; }
    table.totals .subtotal-row td { border-top: 0.3mm solid #e2e8f0; color: #475569; }
    table.totals .total-row { background: #f8fafc; }
    table.totals .total-row td {
      font-size: 12pt; font-weight: 700;
      border-top: 0.4mm solid #cbd5e1;
      border-bottom: 0.4mm solid #cbd5e1;
      padding: 3mm 4mm;
    }
    .payment-box {
      border: 0.3mm solid #e2e8f0; border-radius: 3mm;
      padding: 5mm 6mm; display: flex; align-items: center; gap: 6mm; margin-bottom: 10mm;
    }
    .qr-wrap img { height: 24mm; width: 24mm; object-fit: contain; }
    .payment-info .payment-title { font-size: 10pt; font-weight: 700; margin-bottom: 2mm; }
    .upi-badge {
      display: inline-block; font-family: 'Courier New', monospace; font-size: 9pt;
      background: #f1f5f9; border: 0.3mm solid #cbd5e1; border-radius: 1.5mm;
      padding: 1mm 3mm; color: #0f172a; margin-bottom: 2mm;
    }
    .payment-info .payment-note { font-size: 8.5pt; color: #64748b; }
    .footer {
      position: absolute; bottom: 8mm; left: 14mm; right: 14mm;
      display: flex; justify-content: space-between; font-size: 7.5pt;
      color: #94a3b8; border-top: 0.2mm solid #e2e8f0; padding-top: 2mm;
    }
    @media print {
      body { margin: 0; padding-top: 0; }
      .page { width: 100%; padding: 10mm 12mm 18mm 12mm; }
      .no-print { display: none !important; }
    }
    .print-btn-bar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
      background: #0f172a; display: flex; align-items: center;
      justify-content: center; gap: 12px; padding: 10px 16px;
    }
    .print-btn {
      background: #f97316; color: #fff; border: none; border-radius: 8px;
      padding: 8px 24px; font-size: 14px; font-weight: 600; cursor: pointer;
      font-family: 'Roboto', sans-serif; letter-spacing: 0.02em;
    }
    .print-btn:hover { background: #ea6e0b; }
    .print-btn.secondary {
      background: transparent; border: 1px solid #475569; color: #e2e8f0;
    }
    .print-btn.secondary:hover { background: #1e293b; }
    .invoice-id-badge { color: #94a3b8; font-size: 12px; font-family: 'Courier New', monospace; }
    body { padding-top: 52px; }
  </style>
</head>
<body>
<div class="print-btn-bar no-print">
  <span class="invoice-id-badge">${invoiceNum}</span>
  <button class="print-btn" onclick="window.print()">⬇ Save / Print PDF</button>
  <button class="print-btn secondary" onclick="window.close()">Close</button>
</div>
<div class="page">
  <div class="header">
    <div class="logo-wrap">
      <img src="${logoSrc}" alt="The Chess Lifestyle" onerror="this.style.display='none'" />
    </div>
    <div class="invoice-meta">
      <h1>INVOICE</h1>
      <table>
        <tr><td>Invoice #:</td><td>${invoiceNum}</td></tr>
        <tr><td>Date:</td><td>${dateStr}</td></tr>
      </table>
    </div>
  </div>
  <div class="divider"></div>
  <div class="billing">
    <div class="billing-col">
      <div class="billing-label">Billed From</div>
      <div class="billing-name">thechesslifestyle.com</div>
      <div class="billing-sub">Chess Classes</div>
    </div>
    <div class="billing-divider-v"></div>
    <div class="billing-col">
      <div class="billing-label">Billed To</div>
      <div class="billing-name">${student.name}</div>
      ${student.parent_name ? `<div class="billing-sub">Parent: ${student.parent_name}</div>` : ""}
      ${student.institute_name ? `<div class="billing-sub">${student.institute_name}</div>` : ""}
    </div>
  </div>
  <div class="divider"></div>
  <table class="items">
    <thead>
      <tr>
        <th>Description</th>
        <th class="center">Qty</th>
        <th class="right">Rate (Rs.)</th>
        <th class="right">Amount (Rs.)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <div class="item-desc-main">${description}</div>
          ${descNotes ? `<div class="item-desc-sub">${descNotes}</div>` : ""}
        </td>
        <td class="center">${qty}</td>
        <td class="right">${fmtAmt(effectiveRate)}</td>
        <td class="right">${fmtAmt(amount)}</td>
      </tr>
    </tbody>
  </table>
  <div class="totals-wrap">
    <table class="totals">
      <tbody>
        <tr class="subtotal-row"><td>Subtotal</td><td>${fmtAmt(amount)}</td></tr>
        <tr class="total-row"><td>Total Due</td><td>Rs. ${fmtAmt(amount)}</td></tr>
      </tbody>
    </table>
  </div>
  <div class="payment-box">
    <div class="qr-wrap">
      <img src="${qrSrc}" alt="UPI QR Code" onerror="this.style.display='none'" />
    </div>
    <div class="payment-info">
      <div class="payment-title">Payment Details</div>
      <div class="upi-badge">UPI/VPA: ankushjainr2@ybl</div>
      <div class="payment-note">Please scan the QR code to complete your payment instantly.</div>
    </div>
  </div>
  <div class="footer">
    <span>Thank you for choosing thechesslifestyle.com!</span>
    <span>Page 1</span>
  </div>
</div>
<script>window.focus();<\/script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=720");
  if (!win) {
    alert("Pop-up blocked! Please allow pop-ups for this site to generate invoices.");
    return null;
  }
  win.document.write(html);
  win.document.close();
  return invoiceNum;
}

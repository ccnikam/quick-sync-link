import { jsPDF } from "jspdf";
import { HOTEL, type Bill, type Kot, type PaymentMode } from "./types";

export const MODE_LABEL: Record<PaymentMode, string> = {
  cash: "CASH",
  upi: "UPI",
  card: "CARD",
  borrow: "BORROW",
};

const PAPER_W = 80; // mm (thermal roll)
const PAD = 4; // mm side padding
const CONTENT_W = PAPER_W - PAD * 2;

type Row =
  | { kind: "hr" }
  | { kind: "gap"; h?: number }
  | {
      kind: "text";
      left: string;
      right?: string;
      align?: "left" | "center";
      bold?: boolean;
      size?: number;
    };

const lineHeight = (r: Row) => {
  if (r.kind === "hr") return 2.6;
  if (r.kind === "gap") return r.h ?? 2;
  const size = r.size ?? 9;
  return size * 0.42 + 1.4;
};

function render(rows: Row[], filenameTitle: string) {
  const total = rows.reduce((s, r) => s + lineHeight(r), 0);
  const height = Math.max(60, total + PAD * 2);

  const doc = new jsPDF({
    unit: "mm",
    format: [PAPER_W, height],
    compress: true,
  });
  doc.setProperties({ title: filenameTitle });

  let y = PAD + 2;
  for (const r of rows) {
    if (r.kind === "gap") {
      y += lineHeight(r);
      continue;
    }
    if (r.kind === "hr") {
      doc.setLineDashPattern([0.6, 0.6], 0);
      doc.setLineWidth(0.2);
      doc.line(PAD, y - 1, PAPER_W - PAD, y - 1);
      doc.setLineDashPattern([], 0);
      y += lineHeight(r);
      continue;
    }
    const size = r.size ?? 9;
    doc.setFont("courier", r.bold ? "bold" : "normal");
    doc.setFontSize(size);

    if (r.align === "center") {
      doc.text(r.left, PAPER_W / 2, y, { align: "center" });
      y += lineHeight(r);
      continue;
    }

    const rightW = r.right ? doc.getTextWidth(r.right) + 2 : 0;
    const wrapped = doc.splitTextToSize(r.left, CONTENT_W - rightW) as string[];
    doc.text(wrapped[0] ?? "", PAD, y);
    if (r.right) doc.text(r.right, PAPER_W - PAD, y, { align: "right" });
    y += lineHeight(r);
    for (const extra of wrapped.slice(1)) {
      doc.text(extra, PAD, y);
      y += lineHeight(r);
    }
  }
  return doc;
}

/** Opens the generated PDF so the user can view / print / save it. */
function deliver(doc: jsPDF, filename: string) {
  if (typeof window === "undefined") return;
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    // Pop-up blocked (common on tablets) -> download the file instead.
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function headerRows(): Row[] {
  return [
    { kind: "text", left: HOTEL.name, align: "center", bold: true, size: 13 },
    { kind: "text", left: HOTEL.sub, align: "center", bold: true, size: 9 },
    { kind: "text", left: HOTEL.tagline, align: "center", size: 8 },
    { kind: "text", left: `Contact: ${HOTEL.phone}`, align: "center", size: 8 },
  ];
}

export function buildBillPdf(bill: Bill) {
  const d = new Date(bill.createdAt);
  const rows: Row[] = [
    ...headerRows(),
    { kind: "hr" },
    { kind: "text", left: `Bill No: ${bill.no}`, right: `Table ${bill.tableId}`, bold: true },
    ...(bill.customer
      ? [{ kind: "text", left: `Customer: ${bill.customer}`, size: 8 } as Row]
      : []),
    {
      kind: "text",
      left: `${d.toLocaleDateString("en-IN")} ${d.toLocaleTimeString("en-IN")}`,
      size: 8,
    },
    { kind: "hr" },
    { kind: "text", left: "Item", right: "Qty   Amt", bold: true, size: 8 },
    { kind: "hr" },
    ...bill.items.map(
      (l): Row => ({
        kind: "text",
        left: l.name,
        right: `${l.qty}  ${l.price * l.qty}`,
      }),
    ),
    { kind: "hr" },
    { kind: "text", left: "Subtotal", right: String(bill.subtotal) },
    ...(bill.discountAmt
      ? [
          {
            kind: "text",
            left: `Discount (${bill.discountPct}%)`,
            right: `-${bill.discountAmt}`,
          } as Row,
        ]
      : []),
    { kind: "text", left: "TOTAL", right: `Rs ${bill.total}`, bold: true, size: 12 },
    { kind: "gap" },
    ...(bill.payments?.length ? bill.payments : [{ mode: bill.mode, amount: bill.total }]).map(
      (p): Row => ({
        kind: "text",
        left: `Paid ${MODE_LABEL[p.mode]}`,
        right: `Rs ${p.amount}`,
      }),
    ),
    { kind: "hr" },
    { kind: "text", left: "Thank you! Visit again", align: "center", size: 9 },
  ];
  return render(rows, `Bill-${bill.no}`);
}

export function buildKotPdf(kot: Kot) {
  const d = new Date(kot.createdAt);
  const rows: Row[] = [
    { kind: "text", left: `KOT #${kot.no}`, align: "center", bold: true, size: 14 },
    { kind: "text", left: HOTEL.name, align: "center", size: 8 },
    { kind: "hr" },
    { kind: "text", left: `TABLE ${kot.tableId}`, bold: true, size: 12 },
    {
      kind: "text",
      left: `${d.toLocaleDateString("en-IN")} ${d.toLocaleTimeString("en-IN")}`,
      size: 8,
    },
    { kind: "hr" },
    ...kot.items.flatMap((i): Row[] => [
      { kind: "text", left: `${i.qty} x ${i.name}`, bold: true, size: 10 },
      ...(i.note ? [{ kind: "text", left: `   ${i.note}`, size: 8 } as Row] : []),
    ]),
    { kind: "hr" },
  ];
  return render(rows, `KOT-${kot.no}`);
}

export function billPdf(bill: Bill) {
  deliver(buildBillPdf(bill), `Bill-${bill.no}.pdf`);
}

export function kotPdf(kot: Kot) {
  deliver(buildKotPdf(kot), `KOT-${kot.no}.pdf`);
}

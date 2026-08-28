import { HOTEL, type Bill, type Kot, type PaymentMode } from "./types";

export const MODE_LABEL: Record<PaymentMode, string> = {
  cash: "CASH",
  upi: "UPI",
  card: "CARD",
  borrow: "BORROW",
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const PRINT_ROOT_ID = "pos-print-root";
const STYLE_ID = "pos-print-style";

const CSS = `
  @page { size: 80mm auto; margin: 3mm; }
  #${PRINT_ROOT_ID} { display: none; }
  @media print {
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    body > *:not(#${PRINT_ROOT_ID}) { display: none !important; }
    #${PRINT_ROOT_ID} {
      display: block !important;
      position: static !important;
      width: 72mm;
      margin: 0;
      padding: 0;
      color: #000;
      background: #fff;
      font-family: "Courier New", ui-monospace, monospace;
      font-size: 12px;
      line-height: 1.35;
    }
    #${PRINT_ROOT_ID} * { box-sizing: border-box; color: #000 !important; }
    #${PRINT_ROOT_ID} .c { text-align: center; }
    #${PRINT_ROOT_ID} .r { text-align: right; }
    #${PRINT_ROOT_ID} .b { font-weight: 700; }
    #${PRINT_ROOT_ID} .big { font-size: 15px; }
    #${PRINT_ROOT_ID} .xl { font-size: 19px; }
    #${PRINT_ROOT_ID} hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
    #${PRINT_ROOT_ID} table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    #${PRINT_ROOT_ID} td { padding: 1px 0; vertical-align: top; word-break: break-word; }
    #${PRINT_ROOT_ID} .qty { width: 22%; text-align: center; }
    #${PRINT_ROOT_ID} .amt { width: 26%; text-align: right; }
  }
`;

/**
 * Prints receipt markup by mounting it into the *current* document and calling
 * window.print(). This is the most reliable path across mobile browsers,
 * kiosks, embedded webviews and preview iframes (hidden iframes and pop-ups
 * are frequently blocked or silently print blank).
 */
function openPrint(inner: string) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.media = "all";
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  let root = document.getElementById(PRINT_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = PRINT_ROOT_ID;
    document.body.appendChild(root);
  }
  // keep it as a direct child of body so the print rules apply
  if (root.parentElement !== document.body) document.body.appendChild(root);
  root.innerHTML = inner;

  const cleanup = () => {
    window.removeEventListener("afterprint", cleanup);
    window.setTimeout(() => {
      const el = document.getElementById(PRINT_ROOT_ID);
      if (el) el.innerHTML = "";
    }, 300);
  };
  window.addEventListener("afterprint", cleanup);

  window.setTimeout(() => {
    try {
      window.focus();
      window.print();
    } catch {
      fallbackWindow(inner);
    }
    // safety net if afterprint never fires
    window.setTimeout(cleanup, 60000);
  }, 120);
}

/** Last-resort: open a plain window with the receipt so it can be printed. */
function fallbackWindow(inner: string) {
  const w = window.open("", "_blank", "width=380,height=640");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>${HOTEL.name}</title><style>${CSS}
#${PRINT_ROOT_ID}{display:block;width:302px;margin:10px auto;font-family:"Courier New",monospace;font-size:12px}
#${PRINT_ROOT_ID} .c{text-align:center}#${PRINT_ROOT_ID} .b{font-weight:700}
#${PRINT_ROOT_ID} .big{font-size:15px}#${PRINT_ROOT_ID} .xl{font-size:19px}
#${PRINT_ROOT_ID} hr{border:none;border-top:1px dashed #000;margin:4px 0}
#${PRINT_ROOT_ID} table{width:100%;border-collapse:collapse;table-layout:fixed}
#${PRINT_ROOT_ID} .qty{width:22%;text-align:center}#${PRINT_ROOT_ID} .amt{width:26%;text-align:right}
</style></head><body><div id="${PRINT_ROOT_ID}">${inner}</div>
<script>window.onload=function(){window.print()}<\/script></body></html>`);
  w.document.close();
}

const header = () => `
  <div class="c b xl">${HOTEL.name}</div>
  <div class="c b">${HOTEL.sub}</div>
  <div class="c">${HOTEL.tagline}</div>
  <div class="c">Contact: ${HOTEL.phone}</div>`;

export function printBill(bill: Bill) {
  const d = new Date(bill.createdAt);
  const rows = bill.items
    .map(
      (l) => `<tr><td>${esc(l.name)}</td><td class="qty">${l.qty}</td>
      <td class="amt">${l.price * l.qty}</td></tr>`,
    )
    .join("");
  openPrint(`
    ${header()}
    <hr/>
    <div>Bill No: <span class="b">${bill.no}</span></div>
    <div>Table: ${bill.tableId}</div>
    ${bill.customer ? `<div>Customer: ${esc(bill.customer)}</div>` : ""}
    <div>${d.toLocaleDateString("en-IN")} ${d.toLocaleTimeString("en-IN")}</div>
    <hr/>
    <table>
      <tr class="b"><td>Item</td><td class="qty">Qty</td><td class="amt">Amt</td></tr>
      ${rows}
    </table>
    <hr/>
    <table>
      <tr><td>Subtotal</td><td class="amt">${bill.subtotal}</td></tr>
      ${bill.discountAmt ? `<tr><td>Discount (${bill.discountPct}%)</td><td class="amt">-${bill.discountAmt}</td></tr>` : ""}
      <tr class="b big"><td>TOTAL</td><td class="amt">Rs ${bill.total}</td></tr>
      ${(bill.payments?.length ? bill.payments : [{ mode: bill.mode, amount: bill.total }])
        .map(
          (p) =>
            `<tr><td>Paid ${MODE_LABEL[p.mode]}</td><td class="amt">Rs ${p.amount}</td></tr>`,
        )
        .join("")}
    </table>
    <hr/>
    <div class="c">Thank you! Visit again</div>
  `);
}

export function printKot(kot: Kot) {
  const d = new Date(kot.createdAt);
  const rows = kot.items
    .map(
      (i) =>
        `<tr><td class="b" style="width:18%">${i.qty} x</td><td>${esc(i.name)}${i.note ? `<br/><i>${esc(i.note)}</i>` : ""}</td></tr>`,
    )
    .join("");
  openPrint(`
    <div class="c b xl">KOT #${kot.no}</div>
    <div class="c">${HOTEL.name}</div>
    <hr/>
    <div class="b big">TABLE ${kot.tableId}</div>
    <div>${d.toLocaleDateString("en-IN")} ${d.toLocaleTimeString("en-IN")}</div>
    <hr/>
    <table>${rows}</table>
    <hr/>
  `);
}

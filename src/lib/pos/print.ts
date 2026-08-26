import { HOTEL, type Bill, type Kot, type PaymentMode } from "./types";

export const MODE_LABEL: Record<PaymentMode, string> = {
  cash: "CASH",
  upi: "UPI",
  card: "CARD",
  borrow: "BORROW",
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const CSS = `
  @page { size: 80mm auto; margin: 3mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: "Courier New", ui-monospace, monospace; font-size: 12px; line-height: 1.35;
         color: #000; background: #fff; width: 72mm; }
  .c { text-align: center; }
  .r { text-align: right; }
  .b { font-weight: 700; }
  .big { font-size: 15px; }
  .xl { font-size: 19px; }
  hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  td { padding: 1px 0; vertical-align: top; word-break: break-word; }
  .qty { width: 22%; text-align: center; }
  .amt { width: 26%; text-align: right; }
  @media screen {
    body { width: 302px; margin: 12px auto; padding: 10px; border: 1px solid #ccc; }
  }
`;

/**
 * Prints receipt markup. Uses a hidden same-page iframe so it works when
 * pop-ups are blocked (common on tablets / kiosk browsers); falls back to a
 * new window if the iframe route is unavailable.
 */
function openPrint(inner: string) {
  if (typeof window === "undefined") return;
  const html = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${HOTEL.name}</title><style>${CSS}</style></head><body>${inner}</body></html>`;

  const writeInto = (frame: HTMLIFrameElement) => {
    const doc = frame.contentDocument;
    if (!doc) return false;
    doc.open();
    doc.write(html);
    doc.close();
    return true;
  };

  try {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    // Must be non-zero sized & visible-ish for some mobile browsers to print it.
    frame.style.cssText =
      "position:fixed;left:-10000px;top:0;width:302px;height:600px;border:0;opacity:0.01;";

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      window.setTimeout(() => frame.remove(), 500);
    };

    const trigger = () => {
      const win = frame.contentWindow;
      if (!win) return cleanup();
      // Some browsers (older Android WebView) ignore srcdoc — if the frame is
      // empty, write the markup directly instead of printing a blank page.
      if (!win.document.body || !win.document.body.innerHTML.trim()) {
        if (!writeInto(frame)) return cleanup();
      }
      win.onafterprint = cleanup;
      window.setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch {
          /* ignore */
        }
        // Safety net if afterprint never fires (mobile/kiosk browsers).
        window.setTimeout(cleanup, 60000);
      }, 250);
    };

    // Assign handlers BEFORE setting content so no load event is missed.
    frame.onload = trigger;
    document.body.appendChild(frame);

    if ("srcdoc" in frame) {
      frame.srcdoc = html;
    } else if (writeInto(frame)) {
      // document.write path fires no load event — trigger manually.
      window.setTimeout(trigger, 50);
    } else {
      cleanup();
    }
    return;
  } catch {
    const w = window.open("", "_blank", "width=380,height=640");
    if (!w) return;
    w.document.write(
      html.replace(
        "</body>",
        `<script>window.onload=function(){window.print();setTimeout(function(){window.close()},400)}</script></body>`,
      ),
    );
    w.document.close();
  }
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

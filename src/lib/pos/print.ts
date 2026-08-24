import { HOTEL, type Bill, type Kot } from "./types";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function openPrint(inner: string) {
  if (typeof window === "undefined") return;
  const w = window.open("", "_blank", "width=380,height=640");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Print</title>
<style>
  @page { size: 80mm auto; margin: 3mm; }
  body { font-family: "Courier New", monospace; font-size: 12px; color: #000; width: 72mm; margin: 0; }
  .c { text-align: center; }
  .r { text-align: right; }
  .b { font-weight: 700; }
  .big { font-size: 15px; }
  hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; }
</style></head><body>${inner}
<script>window.onload=function(){window.print();setTimeout(function(){window.close()},400)}</script>
</body></html>`);
  w.document.close();
}

const header = () => `
  <div class="c b big">${HOTEL.name}</div>
  <div class="c b">${HOTEL.sub}</div>
  <div class="c">${HOTEL.tagline}</div>
  <div class="c">Contact: ${HOTEL.phone}</div>`;

export function printBill(bill: Bill) {
  const d = new Date(bill.createdAt);
  const rows = bill.items
    .map(
      (l) => `<tr><td>${esc(l.name)}</td><td class="c">${l.qty}</td>
      <td class="r">${l.price * l.qty}</td></tr>`,
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
      <tr class="b"><td>Item</td><td class="c">Qty</td><td class="r">Amt</td></tr>
      ${rows}
    </table>
    <hr/>
    <table>
      <tr><td>Subtotal</td><td class="r">${bill.subtotal}</td></tr>
      ${bill.discountAmt ? `<tr><td>Discount (${bill.discountPct}%)</td><td class="r">-${bill.discountAmt}</td></tr>` : ""}
      <tr class="b big"><td>TOTAL</td><td class="r">Rs ${bill.total}</td></tr>
      <tr><td>Payment</td><td class="r">${bill.mode.toUpperCase()}</td></tr>
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
        `<tr><td class="b">${i.qty} x</td><td>${esc(i.name)}${i.note ? `<br/><i>${esc(i.note)}</i>` : ""}</td></tr>`,
    )
    .join("");
  openPrint(`
    <div class="c b big">KOT #${kot.no}</div>
    <div class="c">${HOTEL.name}</div>
    <hr/>
    <div class="b">TABLE ${kot.tableId}</div>
    <div>${d.toLocaleTimeString("en-IN")}</div>
    <hr/>
    <table>${rows}</table>
    <hr/>
  `);
}

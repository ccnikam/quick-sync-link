import type { Bill, Kot } from "./types";
import { billPdf, kotPdf, buildBillPdf, buildKotPdf } from "./pdf";

export { MODE_LABEL } from "./pdf";
export { buildBillPdf, buildKotPdf };

/**
 * Generates the 80mm receipt as a PDF and opens it, so the user can send it to
 * any printer (thermal or normal) or save/share it. PDF output is far more
 * reliable than browser print dialogs on tablets, phones and kiosk browsers.
 */
export function printBill(bill: Bill) {
  billPdf(bill);
}

/** Generates the kitchen ticket as an 80mm PDF and opens it for printing. */
export function printKot(kot: Kot) {
  kotPdf(kot);
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ChefHat,
  Minus,
  Plus,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { PosShell } from "@/components/pos/PosShell";
import { CATEGORIES, MENU, rupees } from "@/lib/pos/menu";
import {
  addLine,
  clearTable,
  removeLine,
  selTable,
  selTables,
  sendKot,
  setCustomer,
  setDiscount,
  setQty,
  settleTable,
  stockFor,
  totals,
  usePos,
} from "@/lib/pos/store";
import { printBill, printKot } from "@/lib/pos/print";
import { useSession } from "@/lib/pos/session";
import type { PaymentMode, TableDoc } from "@/lib/pos/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pos")({
  head: () => ({
    meta: [
      { title: "Billing & Tables — Hotel Kusum Palace POS" },
      {
        name: "description",
        content:
          "Take orders on any of the 21 tables, send kitchen tickets, apply discounts and settle bills offline.",
      },
      { property: "og:title", content: "Billing & Tables — Hotel Kusum Palace POS" },
      { property: "og:description", content: "Offline table billing and KOT for Hotel Kusum Palace." },
    ],
  }),
  component: () => (
    <PosShell allow={["owner", "cashier"]}>
      <PosPage />
    </PosShell>
  ),
});

const STATUS_STYLE: Record<TableDoc["status"], string> = {
  available: "border-border bg-card text-foreground",
  occupied: "border-primary/40 bg-primary/10 text-foreground",
  borrow: "border-warning/50 bg-warning/20 text-foreground",
  paid: "border-success/40 bg-success/10 text-foreground",
};

function TableCard({
  table,
  active,
  onClick,
}: {
  table: TableDoc;
  active: boolean;
  onClick: () => void;
}) {
  const amount = table.items.reduce((s, l) => s + l.price * l.qty, 0);
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-3 text-left shadow-[var(--shadow-card)] transition active:scale-[.98]",
        STATUS_STYLE[table.status],
        active && "ring-2 ring-primary",
      )}
    >
      <div className="flex items-baseline justify-between">
        <span className="font-display text-xl">T{table.id}</span>
        <span className="tabular text-xs font-semibold">{amount ? rupees(amount) : ""}</span>
      </div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {table.status === "available" ? "Available" : `${table.items.length} items`}
      </div>
      {table.customer && (
        <div className="truncate text-[10px] text-muted-foreground">{table.customer}</div>
      )}
    </button>
  );
}

function PosPage() {
  const tables = usePos(selTables);
  const [selected, setSelected] = useState<number | null>(null);
  const table = usePos(selTable(selected ?? -1));
  const { session } = useSession();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>(CATEGORIES[0]!);
  const [mobileTab, setMobileTab] = useState<"menu" | "bill">("menu");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return MENU.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 60);
    return MENU.filter((m) => m.category === cat);
  }, [query, cat]);

  const t = table;
  const { subtotal, discountAmt, total } = totals(t);

  const add = (id: string, name: string, price: number) => {
    if (selected == null) return;
    const stock = stockFor(id);
    if (stock && stock.qty <= 0) {
      toast.error(`Out of stock: ${name}`);
      return;
    }
    addLine(selected, { id, name, price });
    if (stock && stock.qty <= stock.min) toast.warning(`Low stock — ${name}: ${stock.qty} left`);
  };

  const doKot = () => {
    if (selected == null) return;
    const kot = sendKot(selected);
    if (!kot) {
      toast.info("Nothing new to send to the kitchen.");
      return;
    }
    printKot(kot);
    toast.success(`KOT #${kot.no} sent to kitchen`);
  };

  const doSettle = (mode: PaymentMode) => {
    if (selected == null) return;
    const bill = settleTable(selected, mode, session?.name);
    if (!bill) {
      toast.error("Add items before settling the bill.");
      return;
    }
    printBill(bill);
    toast.success(`Bill #${bill.no} · ${rupees(bill.total)} — ${mode.toUpperCase()}`);
    setSelected(null);
  };

  return (
    <div className="mx-auto grid max-w-[1500px] gap-3 p-3 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,360px)] lg:p-5">
      {/* Tables */}
      <section className={cn("space-y-2", selected != null && "hidden lg:block")}>
        <h2 className="px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Tables · {tables.filter((x) => x.status !== "available").length}/{tables.length} busy
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-2">
          {tables.map((tb) => (
            <TableCard
              key={tb.id}
              table={tb}
              active={tb.id === selected}
              onClick={() => {
                setSelected(tb.id);
                setMobileTab("menu");
              }}
            />
          ))}
        </div>
      </section>

      {selected == null ? (
        <section className="hidden place-items-center rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground lg:col-span-2 lg:grid">
          Select a table to start billing
        </section>
      ) : (
        <>
          {/* Menu */}
          <section className={cn("space-y-3", mobileTab === "bill" && "hidden lg:block")}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelected(null)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card lg:hidden"
                aria-label="Back to tables"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search dishes…"
                  className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {!query && (
              <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={cn(
                      "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      c === cat
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {results.map((m) => {
                const st = stockFor(m.id);
                const out = st ? st.qty <= 0 : false;
                return (
                  <button
                    key={m.id}
                    disabled={out}
                    onClick={() => add(m.id, m.name, m.price)}
                    className={cn(
                      "rounded-xl border border-border bg-card p-3 text-left shadow-[var(--shadow-card)] transition active:scale-[.98] hover:border-primary/50",
                      out && "opacity-40",
                    )}
                  >
                    <div className="text-sm font-semibold leading-tight">{m.name}</div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="tabular text-sm font-bold text-primary">
                        {rupees(m.price)}
                      </span>
                      {st && (
                        <span
                          className={cn(
                            "tabular text-[10px] font-bold",
                            st.qty <= 0
                              ? "text-destructive"
                              : st.qty <= st.min
                                ? "text-warning-foreground"
                                : "text-muted-foreground",
                          )}
                        >
                          {st.qty <= 0 ? "OUT" : `${st.qty} left`}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Bill */}
          <section
            className={cn(
              "flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-panel)]",
              mobileTab === "menu" && "hidden lg:flex",
            )}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">Table {selected}</h2>
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to clear this table?")) {
                    clearTable(selected);
                    toast.success(`Table ${selected} cleared`);
                    setSelected(null);
                  }
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            </div>

            <input
              value={t?.customer ?? ""}
              onChange={(e) => setCustomer(selected, e.target.value)}
              placeholder="Customer name (optional)"
              className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />

            <div className="max-h-[38vh] space-y-1.5 overflow-y-auto lg:max-h-[46vh]">
              {(t?.items ?? []).length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">No items yet</p>
              )}
              {(t?.items ?? []).map((l) => (
                <div
                  key={l.lineId}
                  className="flex items-center gap-2 rounded-xl bg-muted/60 px-2.5 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{l.name}</div>
                    <div className="tabular text-[11px] text-muted-foreground">
                      {rupees(l.price)} {l.kotSent && "· sent"}
                    </div>
                  </div>
                  <button
                    onClick={() => setQty(selected, l.lineId, l.qty - 1)}
                    className="grid h-7 w-7 place-items-center rounded-lg bg-card"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="tabular w-6 text-center text-sm font-bold">{l.qty}</span>
                  <button
                    onClick={() => setQty(selected, l.lineId, l.qty + 1)}
                    className="grid h-7 w-7 place-items-center rounded-lg bg-card"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <span className="tabular w-14 text-right text-sm font-bold">
                    {rupees(l.price * l.qty)}
                  </span>
                  <button
                    onClick={() => removeLine(selected, l.lineId)}
                    className="grid h-7 w-7 place-items-center rounded-lg text-destructive"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular font-semibold">{rupees(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Discount %</span>
                <div className="flex items-center gap-1.5">
                  {[0, 5, 10, 20].map((p) => (
                    <button
                      key={p}
                      onClick={() => setDiscount(selected, p)}
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-bold",
                        (t?.discountPct ?? 0) === p
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground",
                      )}
                    >
                      {p}
                    </button>
                  ))}
                  <span className="tabular w-16 text-right font-semibold">-{rupees(discountAmt)}</span>
                </div>
              </div>
              <div className="flex items-baseline justify-between border-t border-border pt-2">
                <span className="font-display text-lg">Total</span>
                <span className="tabular font-display text-2xl text-primary">{rupees(total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={doKot}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-bold text-secondary-foreground transition active:scale-[.98]"
              >
                <ChefHat className="h-4 w-4" /> Send KOT
              </button>
              <button
                onClick={() => doSettle("cash")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition active:scale-[.98]"
              >
                <Wallet className="h-4 w-4" /> Cash
              </button>
              <button
                onClick={() => doSettle("upi")}
                className="rounded-xl bg-success/15 py-2.5 text-sm font-bold text-success transition active:scale-[.98]"
              >
                UPI
              </button>
              <button
                onClick={() => doSettle("borrow")}
                className="rounded-xl bg-warning/25 py-2.5 text-sm font-bold text-warning-foreground transition active:scale-[.98]"
              >
                Borrow
              </button>
            </div>
          </section>

          {/* Mobile switcher */}
          <div className="sticky bottom-3 z-20 flex gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-[var(--shadow-panel)] lg:hidden">
            <button
              onClick={() => setMobileTab("menu")}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-sm font-bold",
                mobileTab === "menu" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              Menu
            </button>
            <button
              onClick={() => setMobileTab("bill")}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-sm font-bold",
                mobileTab === "bill" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              Bill · {rupees(total)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

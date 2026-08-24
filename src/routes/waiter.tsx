import { createFileRoute } from "@tanstack/react-router";
import { Check, HandPlatter } from "lucide-react";
import { toast } from "sonner";
import { PosShell } from "@/components/pos/PosShell";
import { rupees } from "@/lib/pos/menu";
import { selKots, selTables, setKotStatus, usePos } from "@/lib/pos/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/waiter")({
  head: () => ({
    meta: [
      { title: "Service Floor — Hotel Kusum Palace POS" },
      {
        name: "description",
        content:
          "Waiter view of every table at Hotel Kusum Palace: live table status, running amounts and dishes ready to serve.",
      },
      { property: "og:title", content: "Service Floor — Hotel Kusum Palace POS" },
      { property: "og:description", content: "Table status and ready-to-serve dishes for waiters." },
    ],
  }),
  component: () => (
    <PosShell allow={["owner", "cashier", "waiter", "helper"]}>
      <WaiterPage />
    </PosShell>
  ),
});

function WaiterPage() {
  const tables = usePos(selTables);
  const kots = usePos(selKots);
  const ready = kots.filter((k) => k.status === "ready");

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 p-3 lg:p-5">
      <section className="space-y-2">
        <h1 className="font-display text-2xl">Ready to serve</h1>
        {ready.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nothing waiting at the pass right now.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ready.map((k) => (
              <div
                key={k.id}
                className="rounded-2xl border border-success/50 bg-success/12 p-3 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-xl">Table {k.tableId}</span>
                  <span className="tabular text-[11px] font-bold">KOT #{k.no}</span>
                </div>
                <ul className="my-2 space-y-1 text-sm">
                  {k.items.map((i, idx) => (
                    <li key={idx}>
                      <span className="tabular font-bold text-primary">{i.qty}×</span> {i.name}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    setKotStatus(k.id, "served");
                    toast.success(`Table ${k.tableId} served`);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground active:scale-[.98]"
                >
                  <Check className="h-4 w-4" /> Mark served
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <HandPlatter className="h-3.5 w-3.5" /> Floor status
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
          {tables.map((t) => {
            const amount = t.items.reduce((s, l) => s + l.price * l.qty, 0);
            return (
              <div
                key={t.id}
                className={cn(
                  "rounded-2xl border p-3 shadow-[var(--shadow-card)]",
                  t.status === "available"
                    ? "border-border bg-card"
                    : "border-primary/40 bg-primary/10",
                )}
              >
                <div className="font-display text-lg">T{t.id}</div>
                <div className="tabular text-xs font-semibold">
                  {t.status === "available" ? "Free" : rupees(amount)}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

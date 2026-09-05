import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Flame, Printer, Timer } from "lucide-react";
import { PosShell } from "@/components/pos/PosShell";
import { selKots, setKotStatus, usePos } from "@/lib/pos/store";
import { printKot } from "@/lib/pos/print";
import type { Kot, KotStatus } from "@/lib/pos/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/kitchen")({
  head: () => ({
    meta: [
      { title: "Kitchen KOT Queue — Hotel Kusum Palace POS" },
      {
        name: "description",
        content:
          "Live kitchen ticket queue for Hotel Kusum Palace: see new orders, mark them preparing, ready and served.",
      },
      { property: "og:title", content: "Kitchen KOT Queue — Hotel Kusum Palace POS" },
      { property: "og:description", content: "Live kitchen order tickets, works offline." },
    ],
  }),
  component: () => (
    <PosShell allow={["owner", "manager", "cook"]}>
      <KitchenPage />
    </PosShell>
  ),
});

const NEXT: Record<KotStatus, KotStatus | null> = {
  new: "preparing",
  preparing: "ready",
  ready: "served",
  served: null,
};

const STYLE: Record<KotStatus, string> = {
  new: "border-primary/50 bg-primary/8",
  preparing: "border-warning/60 bg-warning/15",
  ready: "border-success/50 bg-success/12",
  served: "border-border bg-muted/60",
};

function Ticket({ kot }: { kot: Kot }) {
  const next = NEXT[kot.status];
  const mins = Math.floor((Date.now() - kot.createdAt) / 60000);
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-2xl border p-3 shadow-[var(--shadow-card)]",
        STYLE[kot.status],
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-xl">Table {kot.tableId}</span>
        <span className="tabular rounded-full bg-card px-2 py-0.5 text-[11px] font-bold">
          KOT #{kot.no}
        </span>
      </div>
      <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Timer className="h-3 w-3" /> {mins} min · {kot.status}
      </div>
      <ul className="space-y-1 border-t border-border/60 pt-2">
        {kot.items.map((i, idx) => (
          <li key={idx} className="flex gap-2 text-sm">
            <span className="tabular font-bold text-primary">{i.qty}×</span>
            <span className="font-medium">{i.name}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex gap-2 pt-1">
        <button
          onClick={() => printKot(kot)}
          className="grid h-9 w-9 place-items-center rounded-xl bg-card text-muted-foreground"
          aria-label="Print ticket"
        >
          <Printer className="h-4 w-4" />
        </button>
        {next && (
          <button
            onClick={() => setKotStatus(kot.id, next)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground active:scale-[.98]"
          >
            {next === "preparing" ? <Flame className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            Mark {next}
          </button>
        )}
      </div>
    </div>
  );
}

function KitchenPage() {
  const kots = usePos(selKots);
  // keep the "x min ago" labels ticking
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);
  const active = kots.filter((k) => k.status !== "served");
  const done = kots.filter((k) => k.status === "served").slice(-8).reverse();

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-3 lg:p-5">
      <h1 className="font-display text-2xl">Kitchen Queue</h1>
      {active.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No pending tickets. All caught up.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {active.map((k) => (
            <Ticket key={k.id} kot={k} />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Recently served
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {done.map((k) => (
              <Ticket key={k.id} kot={k} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

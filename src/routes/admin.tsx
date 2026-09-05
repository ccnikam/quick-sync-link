import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PosShell } from "@/components/pos/PosShell";
import { DevicePairing } from "@/components/pos/DevicePairing";
import { rupees } from "@/lib/pos/menu";
import {
  adjustStock,
  createStock,
  deleteStock,

  removeStaff,
  resetPos,
  saveStaff,
  selBills,
  selStaff,
  selStock,
  usePos,
  voidBill,
} from "@/lib/pos/store";
import { MODE_LABEL, printBill } from "@/lib/pos/print";
import type { Role, Staff } from "@/lib/pos/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Manage — Hotel Kusum Palace POS" },
      {
        name: "description",
        content:
          "Owner dashboard for Hotel Kusum Palace: today's sales, stock levels, bill history, staff PINs and device pairing.",
      },
      { property: "og:title", content: "Manage — Hotel Kusum Palace POS" },
      {
        property: "og:description",
        content: "Sales dashboard, stock, bills and staff for Hotel Kusum Palace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PosShell allow={["owner"]}>
      <AdminPage />
    </PosShell>
  ),
});

const TABS = ["Dashboard", "Stock", "Bills", "Staff", "Devices"] as const;
type Tab = (typeof TABS)[number];

const ROLES: Role[] = ["owner", "manager", "cook", "waiter", "helper"];

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={cn("tabular font-display text-xl sm:text-2xl", tone)}>{value}</div>
    </div>
  );
}

function AdminPage() {
  const [tab, setTab] = useState<Tab>("Dashboard");
  const bills = usePos(selBills);
  const stock = usePos(selStock);
  const staff = usePos(selStaff);
  

  const today = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const list = bills.filter((b) => !b.voided && b.createdAt >= start.getTime());
    const sum = (mode: string) =>
      list.reduce((s, b) => {
        if (b.payments?.length)
          return s + b.payments.filter((p) => p.mode === mode).reduce((x, p) => x + p.amount, 0);
        return s + (b.mode === mode ? b.total : 0);
      }, 0);
    return {
      count: list.length,
      total: list.reduce((s, b) => s + b.total, 0),
      cash: sum("cash"),
      upi: sum("upi"),
      borrow: sum("borrow"),
    };
  }, [bills]);

  const low = stock.filter((s) => s.qty <= s.min);
  const recent = [...bills].sort((a, b) => b.createdAt - a.createdAt).slice(0, 40);

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 p-3 lg:p-5">
      <h1 className="font-display text-2xl">Manage</h1>

      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition",
              t === tab
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Dashboard" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="Today sales" value={rupees(today.total)} tone="text-primary" />
            <Stat label="Bills" value={String(today.count)} />
            <Stat label="Cash" value={rupees(today.cash)} />
            <Stat label="UPI" value={rupees(today.upi)} />
            <Stat label="Borrow" value={rupees(today.borrow)} tone="text-warning-foreground" />
          </div>
          <div className="rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" /> Low / out of stock ({low.length})
            </h2>
            {low.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Everything is well stocked.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {low.map((s) => (
                  <span
                    key={s.id}
                    className={cn(
                      "tabular rounded-full px-2.5 py-1 text-xs font-semibold",
                      s.qty <= 0
                        ? "bg-destructive/10 text-destructive"
                        : "bg-warning/25 text-warning-foreground",
                    )}
                  >
                    {s.name} · {s.qty}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "Stock" && <Inventory />}


      {tab === "Bills" && (
        <div className="space-y-2">
          {recent.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No bills yet today.
            </p>
          )}
          {recent.map((b) => (
            <div
              key={b.id}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]",
                b.voided && "opacity-50",
              )}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  #{b.no} · Table {b.tableId} ·{" "}
                  {b.payments?.length
                    ? b.payments.map((p) => `${MODE_LABEL[p.mode]} ${p.amount}`).join(" + ")
                    : b.mode.toUpperCase()}
                  {b.voided && " · VOID"}
                </div>
                <div className="tabular truncate text-[11px] text-muted-foreground">
                  {new Date(b.createdAt).toLocaleString("en-IN")}
                  {b.customer ? ` · ${b.customer}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="tabular font-display text-lg text-primary">{rupees(b.total)}</span>
                <button
                  onClick={() => printBill(b)}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground"
                  aria-label="Reprint bill"
                >
                  <Printer className="h-4 w-4" />
                </button>
                {!b.voided && (
                  <button
                    onClick={() => {
                      if (confirm(`Void bill #${b.no}?`)) {
                        voidBill(b.id);
                        toast.success(`Bill #${b.no} voided`);
                      }
                    }}
                    className="grid h-9 w-9 place-items-center rounded-xl bg-destructive/10 text-destructive"
                    aria-label="Void bill"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Staff" && <StaffTab staff={staff} />}

      {tab === "Devices" && (
        <div className="space-y-3">
          <DevicePairing />


          <div className="space-y-2 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
            <h2 className="font-display text-lg text-destructive">Danger zone</h2>
            <p className="text-sm text-muted-foreground">
              Clears tables, bills, kitchen tickets and stock on this device.
            </p>
            <button
              onClick={() => {
                if (confirm("Reset all POS data on this device?")) {
                  resetPos();
                  toast.success("POS data reset");
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-bold text-destructive-foreground active:scale-[.98]"
            >
              <RotateCcw className="h-4 w-4" /> Reset POS data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StaffTab({ staff }: { staff: Staff[] }) {
  const [form, setForm] = useState<{ name: string; role: Role; pin: string }>({
    name: "",
    role: "waiter",
    pin: "",
  });

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((s) => (
          <div
            key={s.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{s.name}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {s.role} · PIN {s.pin}
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm(`Remove ${s.name}?`)) removeStaff(s.id);
              }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive"
              aria-label={`Remove ${s.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <h2 className="flex items-center gap-2 font-display text-lg">
          <Users className="h-4 w-4" /> Add staff
        </h2>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Name"
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <input
            value={form.pin}
            inputMode="numeric"
            maxLength={4}
            onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })}
            placeholder="4-digit PIN"
            className="tabular h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => {
              if (!form.name.trim() || form.pin.length !== 4) {
                toast.error("Enter a name and a 4-digit PIN.");
                return;
              }
              if (staff.some((s) => s.pin === form.pin)) {
                toast.error("That PIN is already in use.");
                return;
              }
              saveStaff({
                id: `staff_${Date.now()}`,
                name: form.name.trim(),
                role: form.role,
                pin: form.pin,
              });
              setForm({ name: "", role: "waiter", pin: "" });
              toast.success("Staff added");
            }}
            className="h-10 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground active:scale-[.98]"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function Inventory() {
  const stock = usePos(selStock);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", qty: "0", min: "5" });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? stock.filter((s) => s.name.toLowerCase().includes(needle)) : stock;
  }, [stock, q]);

  const selected = stock.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
      {/* list pane */}
      <div className="space-y-2 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search inventory…"
            className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => {
              setSelectedId(null);
              setDraft({ name: q.trim(), qty: "0", min: "5" });
            }}
            className="h-10 shrink-0 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground active:scale-[.98]"
          >
            <span className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> New
            </span>
          </button>
        </div>

        <div className="max-h-[58vh] space-y-1.5 overflow-y-auto pr-0.5">
          {filtered.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">No items found.</p>
          )}
          {filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSelectedId(s.id);
                setDraft({ name: s.name, qty: String(s.qty), min: String(s.min) });
              }}
              className={cn(
                "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-2.5 text-left transition",
                s.id === selectedId
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background hover:bg-muted/60",
              )}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{s.name}</div>
                <div className="text-[11px] text-muted-foreground">min {s.min}</div>
              </div>
              <span
                className={cn(
                  "tabular rounded-full px-2.5 py-1 text-xs font-bold",
                  s.qty <= 0
                    ? "bg-destructive/10 text-destructive"
                    : s.qty <= s.min
                      ? "bg-warning/25 text-warning-foreground"
                      : "bg-muted text-foreground",
                )}
              >
                {s.qty}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* editor pane */}
      <div className="space-y-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)] lg:sticky lg:top-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {selected ? `Edit · ${selected.name}` : "Add new item"}
        </h2>

        <label className="block space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground">Item name</span>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="e.g. Paneer (kg)"
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Quantity</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  setDraft((d) => ({ ...d, qty: String(Math.max(0, (Number(d.qty) || 0) - 1)) }))
                }
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted"
                aria-label="Reduce quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                inputMode="numeric"
                value={draft.qty}
                onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
                className="tabular h-10 w-full min-w-0 rounded-xl border border-border bg-background text-center text-sm font-bold outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={() => setDraft((d) => ({ ...d, qty: String((Number(d.qty) || 0) + 1) }))}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted"
                aria-label="Add quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Low-stock alert at</span>
            <input
              type="number"
              inputMode="numeric"
              value={draft.min}
              onChange={(e) => setDraft({ ...draft, min: e.target.value })}
              className="tabular h-10 w-full rounded-xl border border-border bg-background px-3 text-center text-sm font-bold outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              const name = draft.name.trim();
              const qty = Math.max(0, Number(draft.qty) || 0);
              const min = Math.max(0, Number(draft.min) || 0);
              if (!name) {
                toast.error("Enter an item name.");
                return;
              }
              if (selected) {
                adjustStock(selected.id, { name, qty, min });
                toast.success("Item updated");
              } else {
                const created = createStock(name, qty, min);
                if (!created) return;
                adjustStock(created.id, { qty, min });
                setSelectedId(created.id);
                toast.success("Item added");
              }
            }}
            className="h-10 flex-1 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground active:scale-[.98]"
          >
            {selected ? "Save changes" : "Add item"}
          </button>
          {selected && (
            <>
              <button
                onClick={() => {
                  setSelectedId(null);
                  setDraft({ name: "", qty: "0", min: "5" });
                }}
                className="h-10 rounded-xl bg-secondary px-4 text-sm font-bold text-secondary-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteStock(selected.id);
                  setSelectedId(null);
                  setDraft({ name: "", qty: "0", min: "5" });
                  toast.success("Item removed");
                }}
                className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/10 text-destructive"
                aria-label="Delete item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

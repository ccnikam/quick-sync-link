import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Delete, LogIn, Utensils } from "lucide-react";
import { hydrate, selStaff, usePos } from "@/lib/pos/store";
import { homeFor, loadSession, signIn, useSession } from "@/lib/pos/session";
import { HOTEL, type Role } from "@/lib/pos/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hotel Kusum Palace POS — Offline Billing & KOT" },
      {
        name: "description",
        content:
          "Offline-first billing, table management, KOT and stock control for Hotel Kusum Palace – Pure Veg. Works without internet and syncs across devices.",
      },
      { property: "og:title", content: "Hotel Kusum Palace POS" },
      {
        property: "og:description",
        content: "Offline-first restaurant billing, tables, kitchen tickets and stock.",
      },
    ],
  }),
  component: LoginPage,
});

const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  cashier: "Cashier",
  cook: "Kitchen",
  waiter: "Waiter",
  helper: "Helper",
};

function LoginPage() {
  const navigate = useNavigate();
  const staff = usePos(selStaff);
  const { session, ready } = useSession();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    hydrate();
    loadSession();
  }, []);

  useEffect(() => {
    if (ready && session) void navigate({ to: homeFor(session.role) });
  }, [ready, session, navigate]);

  const submit = (value: string) => {
    const match = staff.find((s) => s.pin === value);
    if (!match) {
      setError("Wrong PIN. Please try again.");
      setPin("");
      return;
    }
    signIn({ id: match.id, name: match.name, role: match.role });
    void navigate({ to: homeFor(match.role) });
  };

  const press = (d: string) => {
    setError("");
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) setTimeout(() => submit(next), 120);
  };

  return (
    <div className="flex min-h-[100dvh] bg-background">
      <aside className="hidden w-[42%] flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Utensils className="h-5 w-5" />
          </div>
          <span className="font-display text-2xl">Kusum Palace POS</span>
        </div>
        <div className="max-w-md">
          <div className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-sidebar-primary">
            <span className="h-px w-7 bg-sidebar-primary" />
            Pure Veg Family Restaurant
          </div>
          <h1 className="font-display text-6xl leading-[.96] tracking-[-.03em]">
            {HOTEL.name.split(" ").slice(0, 2).join(" ")}
            <br />
            <span className="text-sidebar-primary">Palace</span>
          </h1>
          <p className="mt-6 max-w-sm text-sm leading-6 text-sidebar-foreground/65">
            {HOTEL.tagline} Billing, tables, kitchen tickets and stock — all working offline and
            syncing across every device in the hotel.
          </p>
        </div>
        <div className="flex items-end justify-between text-[11px] text-sidebar-foreground/45">
          <span>Contact {HOTEL.phone}</span>
          <span>{HOTEL.tables} Tables</span>
        </div>
      </aside>

      <div className="flex flex-1 flex-col items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 text-center lg:text-left">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-primary">
              <LogIn className="h-3 w-3" /> Staff sign in
            </div>
            <h2 className="font-display text-[38px] leading-none">Enter your PIN</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Owner 1111 · Cashier 2222 · Kitchen 3333 · Waiter 4444 · Helper 5555
            </p>
          </div>

          <div className="mb-6 flex justify-center gap-3 lg:justify-start">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-3.5 w-3.5 rounded-full border-2 transition",
                  pin.length > i ? "border-primary bg-primary" : "border-border bg-card",
                )}
              />
            ))}
          </div>

          {error && (
            <p className="mb-4 rounded-xl bg-destructive/10 px-3 py-2 text-center text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button
                key={d}
                onClick={() => press(d)}
                className="rounded-2xl border border-border bg-card py-5 text-2xl font-semibold shadow-[var(--shadow-card)] transition active:scale-95 hover:bg-accent"
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => {
                setPin("");
                setError("");
              }}
              className="rounded-2xl border border-border bg-muted py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition active:scale-95"
            >
              Clear
            </button>
            <button
              onClick={() => press("0")}
              className="rounded-2xl border border-border bg-card py-5 text-2xl font-semibold shadow-[var(--shadow-card)] transition active:scale-95 hover:bg-accent"
            >
              0
            </button>
            <button
              onClick={() => setPin((p) => p.slice(0, -1))}
              className="grid place-items-center rounded-2xl border border-border bg-muted transition active:scale-95"
              aria-label="Delete"
            >
              <Delete className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          <div className="mt-6 grid grid-cols-5 gap-1.5">
            {staff.map((s) => (
              <div
                key={s.id}
                className="rounded-lg bg-secondary px-1 py-1.5 text-center text-[10px] font-semibold text-secondary-foreground"
              >
                {ROLE_LABEL[s.role]}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

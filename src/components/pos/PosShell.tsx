import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import {
  ChefHat,
  ClipboardList,
  CloudOff,
  Cloud,
  LayoutGrid,
  LogOut,
  RefreshCw,
  Settings2,
  Smartphone,
  Utensils,
} from "lucide-react";
import { hydrate, selSync, usePos } from "@/lib/pos/store";
import { startSync } from "@/lib/pos/sync";
import { homeFor, loadSession, signOut, useSession } from "@/lib/pos/session";
import { HOTEL, type Role } from "@/lib/pos/types";
import { cn } from "@/lib/utils";

export function usePosBoot() {
  useEffect(() => {
    hydrate();
    loadSession();
    startSync();
  }, []);
}

const ALL_ROLES: Role[] = ["owner", "manager", "cook", "waiter", "helper"];

const NAV: { to: string; label: string; icon: typeof LayoutGrid; roles: Role[] }[] = [
  { to: "/pos", label: "Billing", icon: LayoutGrid, roles: ["owner", "manager"] },
  { to: "/kitchen", label: "Kitchen", icon: ChefHat, roles: ["owner", "manager", "cook"] },
  { to: "/waiter", label: "Service", icon: Utensils, roles: ["owner", "manager", "waiter"] },
  { to: "/tasks", label: "Tasks", icon: ClipboardList, roles: ALL_ROLES },
  { to: "/devices", label: "Device sync", icon: Smartphone, roles: ALL_ROLES },
  { to: "/admin", label: "Manage", icon: Settings2, roles: ["owner"] },
];

function SyncBadge() {
  const sync = usePos(selSync);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
        sync.online
          ? "bg-success/15 text-success"
          : "bg-warning/20 text-warning-foreground",
      )}
      title={sync.pending ? `${sync.pending} changes waiting to sync` : "All changes saved"}
    >
      {sync.syncing ? (
        <RefreshCw className="h-3 w-3 animate-spin" />
      ) : sync.online ? (
        <Cloud className="h-3 w-3" />
      ) : (
        <CloudOff className="h-3 w-3" />
      )}
      {sync.online ? "Online" : "Offline"}
      {sync.pending > 0 && <span className="tabular">· {sync.pending}</span>}
    </span>
  );
}

export function PosShell({ children, allow }: { children: ReactNode; allow: Role[] }) {
  usePosBoot();
  const { session, ready } = useSession();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!ready) return;
    if (!session) void navigate({ to: "/" });
    else if (!allow.includes(session.role)) void navigate({ to: homeFor(session.role) });
  }, [ready, session, allow, navigate]);

  if (!ready || !session) {
    return <div className="min-h-[100dvh] bg-background" />;
  }

  const nav = NAV.filter((n) => n.roles.includes(session.role));

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Utensils className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="font-display truncate text-sm leading-tight sm:text-lg">
              {HOTEL.name}
            </div>
            <div className="truncate text-[10px] uppercase tracking-[.2em] text-sidebar-primary">
              {HOTEL.sub} · {HOTEL.tagline}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
          <SyncBadge />
          <button
            onClick={() => {
              signOut();
              void navigate({ to: "/" });
            }}
            className="grid h-9 w-9 place-items-center rounded-xl bg-sidebar-accent text-sidebar-accent-foreground transition hover:opacity-80"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
          </div>
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2 sm:px-5">
          {nav.map((n) => {
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent",
                )}
              >
                <n.icon className="h-3.5 w-3.5" />
                {n.label}
              </Link>
            );
          })}
          <span className="ml-auto hidden items-center pr-1 text-[11px] text-sidebar-foreground/50 sm:inline-flex">
            {session.name} · {session.role}
          </span>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

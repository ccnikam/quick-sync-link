import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ClipboardList, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PosShell } from "@/components/pos/PosShell";
import {
  createTask,
  deleteTask,
  selStaff,
  selTasks,
  setTaskStatus,
  usePos,
} from "@/lib/pos/store";
import { useSession } from "@/lib/pos/session";
import { ROLE_LABEL } from "@/lib/pos/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Task Manager — Hotel Kusum Palace POS" },
      {
        name: "description",
        content:
          "Daily work list for Hotel Kusum Palace staff: owners and managers assign tasks, helpers and dishwashers tick them off from any device.",
      },
      { property: "og:title", content: "Task Manager — Hotel Kusum Palace POS" },
      {
        property: "og:description",
        content: "Assign and complete restaurant tasks on every staff device, even offline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PosShell allow={["owner", "manager", "cook", "waiter", "helper"]}>
      <TasksPage />
    </PosShell>
  ),
});

function TasksPage() {
  const { session } = useSession();
  const staff = usePos(selStaff);
  const tasks = usePos(selTasks);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [assignedTo, setAssignedTo] = useState("all");

  const canAssign = session?.role === "owner" || session?.role === "manager";
  const mine = canAssign
    ? tasks
    : tasks.filter((t) => t.assignedTo === "all" || t.assignedTo === session?.id);
  const open = mine.filter((t) => t.status === "open");
  const done = mine.filter((t) => t.status === "done");

  const add = () => {
    if (!title.trim()) {
      toast.error("Write what has to be done.");
      return;
    }
    const person = staff.find((s) => s.id === assignedTo);
    createTask({
      title,
      note,
      assignedTo,
      assignedName: person ? person.name : "Everyone",
      createdBy: session?.name ?? "Manager",
    });
    setTitle("");
    setNote("");
    toast.success("Task assigned");
  };

  return (
    <div className="mx-auto max-w-[900px] space-y-4 p-3 lg:p-5">
      <h1 className="flex items-center gap-2 font-display text-2xl">
        <ClipboardList className="h-5 w-5 text-primary" /> Task manager
      </h1>

      {canAssign && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <h2 className="font-display text-lg">Assign a task</h2>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Wash all steel plates before 11 am"
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Extra detail (optional)"
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">Everyone</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {ROLE_LABEL[s.role]}
                </option>
              ))}
            </select>
            <button
              onClick={add}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground active:scale-[.98]"
            >
              <Plus className="h-4 w-4" /> Assign
            </button>
          </div>
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          To do ({open.length})
        </h2>
        {open.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No pending work right now.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {open.map((t) => (
              <div
                key={t.id}
                className="space-y-2 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]"
              >
                <div className="text-sm font-semibold">{t.title}</div>
                {t.note && <div className="text-xs text-muted-foreground">{t.note}</div>}
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  For {t.assignedName} · by {t.createdBy}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setTaskStatus(t.id, "done");
                      toast.success("Task done");
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground active:scale-[.98]"
                  >
                    <Check className="h-4 w-4" /> Mark done
                  </button>
                  {canAssign && (
                    <button
                      onClick={() => deleteTask(t.id)}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive"
                      aria-label="Delete task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Finished ({done.length})
          </h2>
          <div className="space-y-1.5">
            {done.slice(0, 30).map((t) => (
              <div
                key={t.id}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-muted/50 p-2.5",
                )}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium line-through">{t.title}</div>
                  <div className="text-[11px] text-muted-foreground">{t.assignedName}</div>
                </div>
                <button
                  onClick={() => setTaskStatus(t.id, "open")}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-secondary-foreground"
                  aria-label="Reopen task"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

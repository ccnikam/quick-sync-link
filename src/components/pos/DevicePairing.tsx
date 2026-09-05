import { useState } from "react";
import { Copy, KeyRound, Link2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { selSettings, selSync, updateSettings, usePos } from "@/lib/pos/store";
import { isValidShopKey, newShopKey, syncNow } from "@/lib/pos/sync";
import { cn } from "@/lib/utils";

export function DevicePairing() {
  const settings = usePos(selSettings);
  const sync = usePos(selSync);
  const [draft, setDraft] = useState(settings.shopKey ?? "");
  const valid = isValidShopKey(draft);
  const linked = isValidShopKey(settings.shopKey) && settings.shopKey === draft.trim();

  const save = () => {
    const key = draft.trim();
    if (!isValidShopKey(key)) {
      toast.error("That shop key is not valid. Generate one, then copy it to the other devices.");
      return;
    }
    updateSettings({ shopKey: key, syncEnabled: true });
    toast.success("Device linked — syncing when online");
    void syncNow();
  };

  const copy = async () => {
    const key = settings.shopKey ?? draft.trim();
    try {
      await navigator.clipboard.writeText(key);
      toast.success("Shop key copied");
    } catch {
      toast.info(key);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg">Connect devices</h2>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
              settings.syncEnabled && isValidShopKey(settings.shopKey)
                ? sync.online
                  ? "bg-success/15 text-success"
                  : "bg-warning/20 text-warning-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {!settings.syncEnabled || !isValidShopKey(settings.shopKey)
              ? "Not linked"
              : sync.online
                ? "Linked · online"
                : "Linked · offline"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Generate a shop key on the main counter device, then paste the same key on every other
          phone, tablet or PC. They share tables, bills, stock and kitchen tickets whenever there is
          internet — and keep billing on their own when there isn&apos;t.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.trim())}
            placeholder="paste shop key here"
            spellCheck={false}
            className={cn(
              "h-11 min-w-0 flex-1 rounded-xl border bg-background px-3 font-mono text-xs outline-none focus:ring-2 focus:ring-ring",
              draft && !valid ? "border-destructive" : "border-border",
            )}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setDraft(newShopKey())}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary px-3 py-2.5 text-xs font-bold text-secondary-foreground active:scale-[.98] sm:flex-none"
            >
              <KeyRound className="h-3.5 w-3.5" /> Generate
            </button>
            <button
              onClick={copy}
              disabled={!valid}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary px-3 py-2.5 text-xs font-bold text-secondary-foreground active:scale-[.98] disabled:opacity-40 sm:flex-none"
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
        </div>
        {draft && !valid && (
          <p className="text-xs font-semibold text-destructive">
            Shop keys look like 8-4-4-4-12 characters. Tap Generate, then copy it to the other
            devices.
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={save}
            disabled={!valid || linked}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground active:scale-[.98] disabled:opacity-40"
          >
            <Link2 className="h-4 w-4" /> {linked ? "Device linked" : "Link this device"}
          </button>
          <button
            onClick={() => {
              void syncNow();
              toast.info("Syncing…");
            }}
            disabled={!settings.syncEnabled || !isValidShopKey(settings.shopKey)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-secondary-foreground active:scale-[.98] disabled:opacity-40"
          >
            <RefreshCw className={cn("h-4 w-4", sync.syncing && "animate-spin")} /> Sync now
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-muted/60 px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Waiting to upload
            </div>
            <div className="tabular font-bold">{sync.pending}</div>
          </div>
          <div className="rounded-xl bg-muted/60 px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Last synced
            </div>
            <div className="font-bold">
              {sync.lastSync ? new Date(sync.lastSync).toLocaleTimeString() : "never"}
            </div>
          </div>
        </div>

        {isValidShopKey(settings.shopKey) && (
          <button
            onClick={() => {
              updateSettings({ syncEnabled: false, shopKey: null });
              setDraft("");
              toast.success("Device unlinked — still fully usable offline");
            }}
            className="text-xs font-semibold text-muted-foreground underline"
          >
            Unlink this device
          </button>
        )}
      </div>
    </div>
  );
}

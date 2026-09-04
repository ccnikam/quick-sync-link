import {
  clearDirty,
  docKey,
  getState,
  mergeRemote,
  selSettings,
  setSyncFlags,
  takeDirty,
} from "./store";
import type { Doc, DocKind } from "./types";
import { pullDocs, pushDocs } from "./sync.functions";

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The sync service only accepts UUID shop keys. */
export const isValidShopKey = (key: string | null | undefined): key is string =>
  !!key && UUID_RE.test(key.trim());

export function newShopKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function syncNow() {
  const state = getState();
  const settings = selSettings(state);
  if (!settings.syncEnabled || !isValidShopKey(settings.shopKey)) return;
  if (running || typeof navigator === "undefined" || !navigator.onLine) return;
  running = true;
  setSyncFlags({ syncing: true });

  try {
    const dirty = takeDirty();
    if (dirty.length) {
      await pushDocs({
        data: {
          shopKey: settings.shopKey,
          docs: dirty.map((d) => ({
            kind: d.kind,
            id: d.id,
            json: JSON.stringify(d.data ?? null),
            updatedAt: d.updatedAt,
            deleted: d.deleted ?? false,
          })),
        },
      });
      clearDirty(dirty.map((d) => docKey(d.kind, d.id)));
    }
    const res = await pullDocs({
      data: { shopKey: settings.shopKey, since: getState().cursor },
    });
    const remote: Doc[] = res.docs.map((d) => ({
      kind: d.kind as DocKind,
      id: d.id,
      data: JSON.parse(d.json) as unknown,
      updatedAt: d.updatedAt,
      deleted: d.deleted,
    }));
    mergeRemote(remote, res.cursor);
    setSyncFlags({ online: true });
  } catch {
    setSyncFlags({ online: navigator.onLine });
  } finally {
    running = false;
    setSyncFlags({ syncing: false });
  }
}

export function startSync() {
  if (typeof window === "undefined" || timer) return;
  const online = () => {
    setSyncFlags({ online: navigator.onLine });
    // Push everything queued while offline as soon as the link is back.
    if (navigator.onLine) void syncNow();
  };
  window.addEventListener("online", online);
  window.addEventListener("offline", online);
  window.addEventListener("focus", online);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") online();
  });
  online();
  timer = setInterval(() => void syncNow(), 4000);
  void syncNow();
}


export function stopSync() {
  if (timer) clearInterval(timer);
  timer = null;
}

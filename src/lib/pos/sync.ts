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

export async function syncNow() {
  const state = getState();
  const settings = selSettings(state);
  if (!settings.syncEnabled || !settings.shopKey) return;
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
  const online = () => setSyncFlags({ online: navigator.onLine });
  window.addEventListener("online", online);
  window.addEventListener("offline", online);
  online();
  timer = setInterval(() => void syncNow(), 4000);
  void syncNow();
}

export function stopSync() {
  if (timer) clearInterval(timer);
  timer = null;
}

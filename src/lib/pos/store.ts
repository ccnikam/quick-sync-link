import { useRef, useSyncExternalStore } from "react";
import { MENU } from "./menu";
import {
  HOTEL,
  type Bill,
  type Doc,
  type DocKind,
  type Kot,
  type OrderLine,
  type PaymentMode,
  type Settings,
  type Staff,
  type StockItem,
  type TableDoc,
} from "./types";

const KEY = "kusum-pos-v1";

type PosState = {
  docs: Record<string, Doc>;
  dirty: string[];
  cursor: string | null;
  hydrated: boolean;
  online: boolean;
  syncing: boolean;
  lastSync: number | null;
};

const docKey = (kind: DocKind, id: string) => `${kind}:${id}`;

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function defaultDocs(): Record<string, Doc> {
  const now = Date.now();
  const docs: Record<string, Doc> = {};
  const put = (kind: DocKind, id: string, data: unknown) => {
    docs[docKey(kind, id)] = { kind, id, data, updatedAt: now };
  };

  for (let i = 1; i <= HOTEL.tables; i++) {
    const t: TableDoc = { id: i, status: "available", items: [], discountPct: 0 };
    put("table", String(i), t);
  }
  for (const m of MENU) {
    if (!m.tracked) continue;
    const s: StockItem = { id: m.id, name: m.name, qty: 50, min: 5 };
    put("stock", m.id, s);
  }
  const staff: Staff[] = [
    { id: "owner", name: "Owner", role: "owner", pin: "1111" },
    { id: "cashier", name: "Cashier", role: "cashier", pin: "2222" },
    { id: "cook", name: "Cook", role: "cook", pin: "3333" },
    { id: "waiter", name: "Waiter", role: "waiter", pin: "4444" },
    { id: "helper", name: "Helper", role: "helper", pin: "5555" },
  ];
  for (const s of staff) put("staff", s.id, s);

  const settings: Settings = {
    shopKey: null,
    syncEnabled: false,
    billCounter: 1,
    kotCounter: 1,
    allowNegativeStock: false,
  };
  put("settings", "app", settings);
  return docs;
}

let state: PosState = {
  docs: defaultDocs(),
  dirty: [],
  cursor: null,
  hydrated: false,
  online: true,
  syncing: false,
  lastSync: null,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ docs: state.docs, dirty: state.dirty, cursor: state.cursor }),
    );
  } catch {
    /* storage full / private mode */
  }
}

function set(next: Partial<PosState>, save = true) {
  state = { ...state, ...next };
  if (save) persist();
  emit();
}

export function hydrate() {
  if (typeof window === "undefined" || state.hydrated) return;
  let loaded: Partial<PosState> = {};
  try {
    const rawStr = window.localStorage.getItem(KEY);
    if (rawStr) {
      const parsed = JSON.parse(rawStr) as { docs?: Record<string, Doc>; dirty?: string[]; cursor?: string | null };
      if (parsed.docs) {
        loaded = {
          docs: { ...defaultDocs(), ...parsed.docs },
          dirty: parsed.dirty ?? [],
          cursor: parsed.cursor ?? null,
        };
      }
    }
  } catch {
    /* ignore corrupt state */
  }
  set({ ...loaded, hydrated: true, online: navigator.onLine }, false);
}

export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export const getState = () => state;

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  return ka.every((k) =>
    Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  );
}

export function usePos<T>(selector: (s: PosState) => T): T {

  // Selectors build fresh arrays/objects, so cache per state identity —
  // otherwise getSnapshot returns a new value every call and React loops.
  // The selector itself is also cached: parameterised selectors (e.g.
  // selTable(id)) change identity when their argument changes.
  const cache = useRef<{ state: PosState; selector: (s: PosState) => T; value: T } | null>(null);
  const getSnapshot = () => {
    if (!cache.current || cache.current.state !== state || cache.current.selector !== selector) {
      const next = selector(state);
      const prev = cache.current;
      // Keep the previous reference when the value is shallow-equal so
      // parameterised selectors (new identity each render) can't loop React.
      const value = prev && shallowEqual(prev.value, next) ? prev.value : next;
      cache.current = { state, selector, value };
    }
    return cache.current.value;
  };

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}



/* ---------- doc helpers ---------- */

function writeDoc(kind: DocKind, id: string, data: unknown, deleted = false) {
  const k = docKey(kind, id);
  const docs = { ...state.docs, [k]: { kind, id, data, updatedAt: Date.now(), deleted } };
  const dirty = state.dirty.includes(k) ? state.dirty : [...state.dirty, k];
  set({ docs, dirty });
}

function readDoc<T>(kind: DocKind, id: string): T | undefined {
  const d = state.docs[docKey(kind, id)];
  return d && !d.deleted ? (d.data as T) : undefined;
}

function list<T>(kind: DocKind): T[] {
  return Object.values(state.docs)
    .filter((d) => d.kind === kind && !d.deleted)
    .map((d) => d.data as T);
}

/* ---------- selectors ---------- */

export const selTables = (s: PosState): TableDoc[] =>
  Object.values(s.docs)
    .filter((d) => d.kind === "table" && !d.deleted)
    .map((d) => d.data as TableDoc)
    .sort((a, b) => a.id - b.id);

export const selTable = (id: number) => (s: PosState) =>
  (s.docs[docKey("table", String(id))]?.data as TableDoc) ?? null;

export const selBills = (s: PosState): Bill[] =>
  Object.values(s.docs)
    .filter((d) => d.kind === "bill" && !d.deleted)
    .map((d) => d.data as Bill)
    .sort((a, b) => b.createdAt - a.createdAt);

export const selKots = (s: PosState): Kot[] =>
  Object.values(s.docs)
    .filter((d) => d.kind === "kot" && !d.deleted)
    .map((d) => d.data as Kot)
    .sort((a, b) => a.createdAt - b.createdAt);

export const selStock = (s: PosState): StockItem[] =>
  Object.values(s.docs)
    .filter((d) => d.kind === "stock" && !d.deleted)
    .map((d) => d.data as StockItem)
    .sort((a, b) => a.name.localeCompare(b.name));

export const selStaff = (s: PosState): Staff[] =>
  Object.values(s.docs)
    .filter((d) => d.kind === "staff" && !d.deleted)
    .map((d) => d.data as Staff);

export const selSettings = (s: PosState): Settings =>
  (s.docs[docKey("settings", "app")]?.data as Settings) ?? {
    shopKey: null,
    syncEnabled: false,
    billCounter: 1,
    kotCounter: 1,
    allowNegativeStock: false,
  };

export const selSync = (s: PosState) => ({
  online: s.online,
  syncing: s.syncing,
  lastSync: s.lastSync,
  pending: s.dirty.length,
  hydrated: s.hydrated,
});

/* ---------- totals ---------- */

export function totals(t: TableDoc | null) {
  const subtotal = (t?.items ?? []).reduce((sum, l) => sum + l.price * l.qty, 0);
  const discountAmt = Math.round((subtotal * (t?.discountPct ?? 0)) / 100);
  return { subtotal, discountAmt, total: subtotal - discountAmt };
}

/* ---------- actions ---------- */

function saveTable(t: TableDoc) {
  writeDoc("table", String(t.id), t);
}

export function addLine(tableId: number, item: { id: string; name: string; price: number }) {
  const t = readDoc<TableDoc>("table", String(tableId));
  if (!t) return;
  const items = [...t.items];
  const existing = items.find((l) => l.itemId === item.id && !l.kotSent);
  if (existing) existing.qty += 1;
  else
    items.push({
      lineId: uid(),
      itemId: item.id,
      name: item.name,
      price: item.price,
      qty: 1,
    });
  saveTable({
    ...t,
    items,
    status: t.status === "available" ? "occupied" : t.status,
    openedAt: t.openedAt ?? Date.now(),
  });
}

export function setQty(tableId: number, lineId: string, qty: number) {
  const t = readDoc<TableDoc>("table", String(tableId));
  if (!t) return;
  const items = t.items
    .map((l) => (l.lineId === lineId ? { ...l, qty: Math.max(0, qty) } : l))
    .filter((l) => l.qty > 0);
  saveTable({ ...t, items });
}

export function removeLine(tableId: number, lineId: string) {
  const t = readDoc<TableDoc>("table", String(tableId));
  if (!t) return;
  const line = t.items.find((l) => l.lineId === lineId);
  if (line?.deducted) restoreStock([line]);
  saveTable({ ...t, items: t.items.filter((l) => l.lineId !== lineId) });
}

export function setDiscount(tableId: number, pct: number) {
  const t = readDoc<TableDoc>("table", String(tableId));
  if (!t) return;
  saveTable({ ...t, discountPct: Math.min(100, Math.max(0, pct)) });
}

export function setCustomer(tableId: number, customer: string) {
  const t = readDoc<TableDoc>("table", String(tableId));
  if (!t) return;
  saveTable({ ...t, customer });
}

export function stockFor(itemId: string) {
  return readDoc<StockItem>("stock", itemId);
}

function deductStock(lines: OrderLine[]) {
  for (const l of lines) {
    const s = readDoc<StockItem>("stock", l.itemId);
    if (!s) continue;
    const settings = selSettings(state);
    const qty = settings.allowNegativeStock ? s.qty - l.qty : Math.max(0, s.qty - l.qty);
    writeDoc("stock", s.id, { ...s, qty });
  }
}

function restoreStock(lines: OrderLine[]) {
  for (const l of lines) {
    const s = readDoc<StockItem>("stock", l.itemId);
    if (!s) continue;
    writeDoc("stock", s.id, { ...s, qty: s.qty + l.qty });
  }
}

export function sendKot(tableId: number) {
  const t = readDoc<TableDoc>("table", String(tableId));
  if (!t) return null;
  const fresh = t.items.filter((l) => !l.kotSent);
  if (!fresh.length) return null;
  const settings = selSettings(state);
  const kot: Kot = {
    id: uid(),
    no: settings.kotCounter,
    tableId,
    items: fresh.map((l) => ({ name: l.name, qty: l.qty, note: l.note })),
    status: "new",
    createdAt: Date.now(),
  };
  writeDoc("kot", kot.id, kot);
  writeDoc("settings", "app", { ...settings, kotCounter: settings.kotCounter + 1 });
  deductStock(fresh);
  saveTable({
    ...t,
    items: t.items.map((l) => (l.kotSent ? l : { ...l, kotSent: true, deducted: true })),
    status: t.status === "available" ? "occupied" : t.status,
    openedAt: t.openedAt ?? Date.now(),
  });
  return kot;
}

export function setKotStatus(id: string, status: Kot["status"]) {
  const k = readDoc<Kot>("kot", id);
  if (!k) return;
  writeDoc("kot", id, { ...k, status });
}

export function settleTable(tableId: number, mode: PaymentMode, settledBy?: string) {
  const t = readDoc<TableDoc>("table", String(tableId));
  if (!t || !t.items.length) return null;
  const settings = selSettings(state);
  const { subtotal, discountAmt, total } = totals(t);
  const bill: Bill = {
    id: uid(),
    no: settings.billCounter,
    tableId,
    items: t.items,
    subtotal,
    discountPct: t.discountPct,
    discountAmt,
    total,
    mode,
    customer: t.customer,
    createdAt: Date.now(),
    settledBy,
  };
  writeDoc("bill", bill.id, bill);
  writeDoc("settings", "app", { ...settings, billCounter: settings.billCounter + 1 });
  // any not-yet-sent lines still consume stock at settlement
  const undeducted = t.items.filter((l) => !l.deducted);
  if (undeducted.length) deductStock(undeducted);
  saveTable({ id: tableId, status: "available", items: [], discountPct: 0 });
  return bill;
}

export function voidBill(id: string) {
  const b = readDoc<Bill>("bill", id);
  if (!b) return;
  writeDoc("bill", id, { ...b, voided: !b.voided });
}

export function clearTable(tableId: number) {
  const t = readDoc<TableDoc>("table", String(tableId));
  if (!t) return;
  const deducted = t.items.filter((l) => l.deducted);
  if (deducted.length) restoreStock(deducted);
  saveTable({ id: tableId, status: "available", items: [], discountPct: 0 });
}

export function adjustStock(id: string, patch: Partial<StockItem>) {
  const s = readDoc<StockItem>("stock", id);
  if (!s) return;
  writeDoc("stock", id, { ...s, ...patch });
}

export function saveStaff(staff: Staff) {
  writeDoc("staff", staff.id, staff);
}

export function removeStaff(id: string) {
  writeDoc("staff", id, readDoc<Staff>("staff", id), true);
}

export function updateSettings(patch: Partial<Settings>) {
  writeDoc("settings", "app", { ...selSettings(state), ...patch });
}

export function resetPos(includeStaff = false) {
  const fresh = defaultDocs();
  const settings = selSettings(state);
  const docs: Record<string, Doc> = { ...state.docs };
  const now = Date.now();
  // clear tables, bills, kots; reset stock
  for (const [k, d] of Object.entries(docs)) {
    if (d.kind === "bill" || d.kind === "kot") docs[k] = { ...d, deleted: true, updatedAt: now };
    if (d.kind === "staff" && includeStaff) docs[k] = { ...d, deleted: true, updatedAt: now };
  }
  for (const [k, d] of Object.entries(fresh)) {
    if (d.kind === "table" || d.kind === "stock" || (includeStaff && d.kind === "staff")) {
      docs[k] = { ...d, updatedAt: now };
    }
  }
  docs[docKey("settings", "app")] = {
    kind: "settings",
    id: "app",
    updatedAt: now,
    data: { ...settings, billCounter: 1, kotCounter: 1 },
  };
  set({ docs, dirty: Object.keys(docs) });
}

/* ---------- sync plumbing ---------- */

export function takeDirty(): Doc[] {
  return state.dirty.map((k) => state.docs[k]).filter(Boolean) as Doc[];
}

export function clearDirty(keys: string[]) {
  set({ dirty: state.dirty.filter((k) => !keys.includes(k)) });
}

export function mergeRemote(remote: Doc[], cursor: string | null) {
  const docs = { ...state.docs };
  for (const r of remote) {
    const k = docKey(r.kind, r.id);
    const local = docs[k];
    if (!local || local.updatedAt <= r.updatedAt) docs[k] = r;
  }
  set({ docs, cursor, lastSync: Date.now() });
}

export function setSyncFlags(flags: { online?: boolean; syncing?: boolean }) {
  set(flags, false);
}

export { docKey, uid, list, readDoc };

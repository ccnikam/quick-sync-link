import { useSyncExternalStore } from "react";
import type { Role } from "./types";

export type Session = { id: string; name: string; role: Role } | null;

const KEY = "kusum-session-v1";
let session: Session = null;
let ready = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function loadSession() {
  if (typeof window === "undefined" || ready) return;
  try {
    const raw = window.localStorage.getItem(KEY);
    session = raw ? (JSON.parse(raw) as Session) : null;
    // "Cashier" is now "Manager".
    if (session && (session.role as string) === "cashier") session = { ...session, role: "manager" };
  } catch {
    session = null;
  }
  ready = true;
  emit();
}

export function signIn(s: NonNullable<Session>) {
  session = s;
  window.localStorage.setItem(KEY, JSON.stringify(s));
  emit();
}

export function signOut() {
  session = null;
  window.localStorage.removeItem(KEY);
  emit();
}

let snapshot: { session: Session; ready: boolean } = { session: null, ready: false };
const serverSnapshot = { session: null as Session, ready: false };

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  if (snapshot.session !== session || snapshot.ready !== ready) {
    snapshot = { session, ready };
  }
  return snapshot;
}

export function useSession() {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}


export const homeFor = (role: Role) =>
  role === "cook" ? "/kitchen" : role === "helper" ? "/tasks" : role === "waiter" ? "/waiter" : "/pos";

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

export function useSession() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => ({ session, ready }),
    () => ({ session: null as Session, ready: false }),
  );
}

export const homeFor = (role: Role) =>
  role === "cook" ? "/kitchen" : role === "waiter" || role === "helper" ? "/waiter" : "/pos";

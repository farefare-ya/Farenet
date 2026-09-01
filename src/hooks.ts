import { useEffect, useState, type RefObject } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import type { UserProfile } from "./types";

/** Closes an open dropdown/menu when the user clicks anywhere outside `ref`. */
export function useClickOutside(ref: RefObject<HTMLElement | null>, active: boolean, onOutside: () => void) {
  useEffect(() => {
    if (!active) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

/**
 * Live map of ALL users, keyed by uid. Used so avatars, display names,
 * and blocked-lists everywhere in the app stay in sync in real time
 * without every component running its own Firestore query.
 */
export function useUsersMap(): Record<string, UserProfile> {
  const [map, setMap] = useState<Record<string, UserProfile>>({});

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const next: Record<string, UserProfile> = {};
      snap.docs.forEach((d) => {
        next[d.id] = d.data() as UserProfile;
      });
      setMap(next);
    });
    return unsub;
  }, []);

  return map;
}

/** Live single-user profile subscription (used for the current user). */
export function useUserProfile(uid: string | null | undefined): UserProfile | null {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!db || !uid) {
      setProfile(null);
      return;
    }
    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
    });
    return unsub;
  }, [uid]);

  return profile;
}

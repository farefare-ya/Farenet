import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

const HEARTBEAT_MS = 3 * 60 * 1000; // refresh lastSeen every 3 minutes while the app is open

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Keep `lastSeen` fresh while the user is actively using the app, and mark
  // them online/offline. This is what the inactive-account cleanup script
  // reads to decide who's been gone for 30+ days.
  useEffect(() => {
    if (!currentUser) return;

    const touch = () => {
      updateDoc(doc(db, "users", currentUser.uid), {
        lastSeen: serverTimestamp(),
        online: true,
      }).catch(() => {});
    };

    touch();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") touch();
    }, HEARTBEAT_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") touch();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const markOffline = () => {
      updateDoc(doc(db, "users", currentUser.uid), { online: false }).catch(() => {});
    };
    window.addEventListener("beforeunload", markOffline);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", markOffline);
    };
  }, [currentUser]);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function register(email: string, password: string, displayName: string) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName });
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      displayName,
      email,
      photoURL: null,
      bio: "",
      blockedUsers: [],
      contacts: [],
      online: true,
      lastSeen: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  }

  async function logout() {
    if (currentUser) {
      await updateDoc(doc(db, "users", currentUser.uid), { online: false }).catch(() => {});
    }
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

import { useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { updateProfile, type User as AuthUser } from "firebase/auth";
import { db } from "../firebase";
import { compressImage } from "../imageUtils";
import Avatar from "./Avatar";
import type { UserProfile } from "../types";

interface ProfileModalProps {
  authUser: AuthUser;
  profile: UserProfile | null;
  onClose: () => void;
}

export default function ProfileModal({ authUser, profile, onClose }: ProfileModalProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(profile?.displayName || authUser.displayName || "");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.type === "image/gif") {
      setError("Please choose an image file (JPG/PNG/WEBP), not a GIF or video.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const compressed = await compressImage(file, 100 * 1024);
      await updateDoc(doc(db, "users", authUser.uid), { photoURL: compressed });
    } catch {
      setError("Failed to upload profile photo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSaveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === profile?.displayName || savingName) return;
    setSavingName(true);
    setError("");
    try {
      await updateProfile(authUser, { displayName: trimmed });
      await updateDoc(doc(db, "users", authUser.uid), { displayName: trimmed });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } catch {
      setError("Failed to save name.");
    } finally {
      setSavingName(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-[#1c2733] rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-[#242f3d] flex items-center justify-between">
          <h2 className="text-white font-semibold">My Profile</h2>
          <button onClick={onClose} className="text-[#7d90a0] hover:text-white text-sm">
            Close
          </button>
        </div>

        <div className="px-6 py-6 flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar name={profile?.displayName || "?"} photoURL={profile?.photoURL} size={96} />
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <span className="text-white text-xs">...</span>
              </div>
            )}
          </div>

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 rounded-xl bg-[#5288c1] text-white text-sm font-medium hover:bg-[#4577ad] transition-colors disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Change Profile Photo"}
          </button>
          <p className="text-[#4a6278] text-[11px] text-center">
            Photos are automatically compressed to under 100KB before saving.
          </p>

          <div className="w-full pt-4 border-t border-[#242f3d] space-y-2">
            <label className="text-[#7d90a0] text-xs">Display Name</label>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-[#242f3d] rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
              />
              <button
                onClick={handleSaveName}
                disabled={savingName || !name.trim() || name.trim() === profile?.displayName}
                className="px-3 py-2 rounded-xl bg-[#5288c1] text-white text-xs font-medium disabled:opacity-40 hover:bg-[#4577ad] transition-colors flex-shrink-0"
              >
                {savingName ? "..." : nameSaved ? "Saved" : "Save"}
              </button>
            </div>
            <p className="text-[#7d90a0] text-xs text-center pt-1">{profile?.email}</p>
          </div>

          {error && <p className="text-[#e17076] text-xs text-center">{error}</p>}
        </div>
      </div>
    </div>
  );
}

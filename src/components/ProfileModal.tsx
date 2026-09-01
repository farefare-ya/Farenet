import { useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import {
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  type User as AuthUser,
} from "firebase/auth";
import { db } from "../firebase";
import Avatar from "./Avatar";
import ImageCropModal from "./ImageCropModal";
import type { UserProfile } from "../types";

interface ProfileModalProps {
  authUser: AuthUser;
  profile: UserProfile | null;
  onClose: () => void;
}

export default function ProfileModal({ authUser, profile, onClose }: ProfileModalProps) {
  const [uploading, setUploading] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(profile?.displayName || authUser.displayName || "");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.type === "image/gif") {
      setError("Please choose an image file (JPG/PNG/WEBP), not a GIF or video.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setError("");
    setCropFile(file);
  }

  async function handleCropped(dataUrl: string) {
    setCropFile(null);
    setUploading(true);
    try {
      await updateDoc(doc(db, "users", authUser.uid), { photoURL: dataUrl });
      setPhotoSaved(true);
      setTimeout(() => setPhotoSaved(false), 2500);
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

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!authUser.email) return;
    setPasswordError("");
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    setSavingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(authUser.email, currentPassword);
      await reauthenticateWithCredential(authUser, credential);
      await updatePassword(authUser, newPassword);
      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => { setPasswordSaved(false); setShowPasswordForm(false); }, 2000);
    } catch (err: any) {
      if (err?.code === "auth/wrong-password" || err?.code === "auth/invalid-credential") {
        setPasswordError("Current password is incorrect.");
      } else if (err?.code === "auth/too-many-requests") {
        setPasswordError("Too many attempts. Try again later.");
      } else {
        setPasswordError("Failed to change password.");
      }
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-[#1c2733] rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-[#242f3d] flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-semibold">My Profile</h2>
          <button onClick={onClose} className="text-[#7d90a0] hover:text-white text-sm">
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6 flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar name={profile?.displayName || "?"} photoURL={profile?.photoURL} size={96} />
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <span className="text-white text-xs">...</span>
              </div>
            )}
            {photoSaved && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#4dcc4d] flex items-center justify-center border-2 border-[#1c2733]">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
            )}
          </div>

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePickFile} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 rounded-xl bg-[#5288c1] text-white text-sm font-medium hover:bg-[#4577ad] transition-colors disabled:opacity-50"
          >
            {uploading ? "Saving..." : photoSaved ? "Photo Updated" : "Change Profile Photo"}
          </button>
          <p className="text-[#4a6278] text-[11px] text-center">
            Crop it however you like — photos are compressed to under 100KB before saving.
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

          <div className="w-full pt-4 border-t border-[#242f3d]">
            {!showPasswordForm ? (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="w-full py-2.5 rounded-xl bg-[#242f3d] text-white text-sm font-medium hover:bg-[#2d3e50] transition-colors"
              >
                Change Password
              </button>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-2">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  autoComplete="current-password"
                  className="w-full bg-[#242f3d] rounded-xl px-3 py-2 text-white text-sm placeholder-[#4a6278] focus:outline-none"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min. 6 characters)"
                  autoComplete="new-password"
                  className="w-full bg-[#242f3d] rounded-xl px-3 py-2 text-white text-sm placeholder-[#4a6278] focus:outline-none"
                />
                {passwordError && <p className="text-[#e17076] text-xs">{passwordError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowPasswordForm(false); setPasswordError(""); setCurrentPassword(""); setNewPassword(""); }}
                    className="flex-1 py-2 rounded-xl bg-[#242f3d] text-white text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPassword || !currentPassword || !newPassword}
                    className="flex-1 py-2 rounded-xl bg-[#5288c1] text-white text-xs font-medium disabled:opacity-40"
                  >
                    {savingPassword ? "..." : passwordSaved ? "Saved" : "Update Password"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {error && <p className="text-[#e17076] text-xs text-center">{error}</p>}
        </div>
      </div>

      {cropFile && (
        <ImageCropModal
          file={cropFile}
          title="Crop Profile Photo"
          onCancel={() => { setCropFile(null); if (fileRef.current) fileRef.current.value = ""; }}
          onDone={handleCropped}
        />
      )}
    </div>
  );
}

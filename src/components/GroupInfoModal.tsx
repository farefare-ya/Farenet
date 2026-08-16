import { useRef, useState } from "react";
import { doc, updateDoc, arrayRemove, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";
import { compressImage } from "../imageUtils";
import { hashPassword } from "../passwordUtils";
import Avatar from "./Avatar";
import ImageCropModal from "./ImageCropModal";
import type { Chat, UserProfile } from "../types";

interface GroupInfoModalProps {
  chat: Chat;
  currentUid: string;
  usersMap: Record<string, UserProfile>;
  onClose: () => void;
  onLeft: () => void;
}

export default function GroupInfoModal({ chat, currentUid, usersMap, onClose, onLeft }: GroupInfoModalProps) {
  const isAdmin = !!chat.admins?.includes(currentUid);
  const [name, setName] = useState(chat.name);
  const [announcement, setAnnouncement] = useState(chat.announcement || "");
  const [password, setPassword] = useState("");
  const [addingMembers, setAddingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");
  const [cropFile, setCropFile] = useState<File | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const wallpaperRef = useRef<HTMLInputElement>(null);

  const chatRef = doc(db, "chats", chat.id);
  const members = chat.members.map((uid) => usersMap[uid]).filter(Boolean);
  const nonMembers = Object.values(usersMap).filter(
    (u) => !chat.members.includes(u.uid) && u.displayName?.toLowerCase().includes(memberSearch.toLowerCase())
  );
  const adminCount = chat.admins?.length || 0;

  function handlePickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/") || file.type === "image/gif") {
      setError("Please choose a JPG/PNG/WEBP image.");
      if (photoRef.current) photoRef.current.value = "";
      return;
    }
    setError("");
    setCropFile(file);
  }

  async function handleCroppedPhoto(dataUrl: string) {
    setCropFile(null);
    setBusy("photo");
    try {
      await updateDoc(chatRef, { photoURL: dataUrl });
    } catch {
      setError("Failed to upload group photo.");
    } finally {
      setBusy("");
      if (photoRef.current) photoRef.current.value = "";
    }
  }

  async function handleWallpaper(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/") || file.type === "image/gif") {
      setError("Please choose a JPG/PNG/WEBP image.");
      return;
    }
    setBusy("wallpaper");
    try {
      const compressed = await compressImage(file, 150 * 1024);
      await updateDoc(chatRef, { wallpaper: compressed });
    } catch {
      setError("Failed to upload wallpaper.");
    } finally {
      setBusy("");
      if (wallpaperRef.current) wallpaperRef.current.value = "";
    }
  }

  async function clearWallpaper() {
    await updateDoc(chatRef, { wallpaper: null });
  }

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === chat.name) return;
    setBusy("name");
    await updateDoc(chatRef, { name: trimmed }).finally(() => setBusy(""));
  }

  async function saveAnnouncement() {
    setBusy("announcement");
    await updateDoc(chatRef, { announcement: announcement.trim() || null }).finally(() => setBusy(""));
  }

  async function togglePublic() {
    setBusy("public");
    await updateDoc(chatRef, { isPublic: !chat.isPublic }).finally(() => setBusy(""));
  }

  async function savePassword() {
    setBusy("password");
    try {
      const hash = password.trim() ? await hashPassword(password.trim()) : null;
      await updateDoc(chatRef, { passwordHash: hash });
      setPassword("");
    } finally {
      setBusy("");
    }
  }

  async function kickMember(uid: string) {
    if (uid === currentUid) return;
    setBusy(`kick-${uid}`);
    await updateDoc(chatRef, { members: arrayRemove(uid), admins: arrayRemove(uid) }).finally(() => setBusy(""));
  }

  async function toggleAdmin(uid: string) {
    const isTargetAdmin = !!chat.admins?.includes(uid);
    if (isTargetAdmin && adminCount <= 1) {
      setError("A group needs at least one admin — promote someone else first.");
      return;
    }
    setError("");
    setBusy(`admin-${uid}`);
    await updateDoc(chatRef, { admins: isTargetAdmin ? arrayRemove(uid) : arrayUnion(uid) }).finally(() => setBusy(""));
  }

  async function addMember(uid: string) {
    setBusy(`add-${uid}`);
    await updateDoc(chatRef, { members: arrayUnion(uid) }).finally(() => setBusy(""));
  }

  async function leaveGroup() {
    if (isAdmin && adminCount <= 1 && members.length > 1) {
      setError("You're the only admin — promote someone else before leaving.");
      return;
    }
    await updateDoc(chatRef, { members: arrayRemove(currentUid), admins: arrayRemove(currentUid) });
    onLeft();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-[#1c2733] rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-[#242f3d] flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-semibold">Group Info</h2>
          <button onClick={onClose} className="text-[#7d90a0] hover:text-white text-sm">
            Close
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Photo + name */}
          <div className="flex flex-col items-center gap-3 px-6 py-6 border-b border-[#242f3d]">
            <div className="relative">
              <Avatar name={chat.name} photoURL={chat.photoURL} size={88} />
              {busy === "photo" && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center text-white text-xs">...</div>
              )}
            </div>
            {isAdmin && (
              <>
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePickPhoto} />
                <button onClick={() => photoRef.current?.click()} className="text-[#5288c1] text-xs font-medium">
                  Change Group Photo
                </button>
              </>
            )}

            {isAdmin ? (
              <div className="flex gap-2 w-full mt-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 bg-[#242f3d] rounded-xl px-3 py-2 text-white text-sm text-center focus:outline-none"
                />
                <button
                  onClick={saveName}
                  disabled={busy === "name" || !name.trim() || name.trim() === chat.name}
                  className="px-3 py-2 rounded-xl bg-[#5288c1] text-white text-xs font-medium disabled:opacity-40"
                >
                  Save
                </button>
              </div>
            ) : (
              <p className="text-white font-semibold text-lg">{chat.name}</p>
            )}
            <p className="text-[#7d90a0] text-xs">{chat.members.length} members</p>
          </div>

          {/* Announcement */}
          <div className="px-6 py-4 border-b border-[#242f3d]">
            <p className="text-[#5288c1] text-xs font-semibold uppercase tracking-wider mb-2">Announcement</p>
            {isAdmin ? (
              <div className="space-y-2">
                <textarea
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  placeholder="Pin an announcement for the group (leave empty to remove)"
                  rows={2}
                  className="w-full bg-[#242f3d] rounded-xl px-3 py-2 text-white text-sm placeholder-[#4a6278] focus:outline-none resize-none"
                />
                <button
                  onClick={saveAnnouncement}
                  disabled={busy === "announcement"}
                  className="text-[#5288c1] text-xs font-medium"
                >
                  Save Announcement
                </button>
              </div>
            ) : (
              <p className="text-[#a8b8c5] text-sm">{chat.announcement || "No announcement"}</p>
            )}
          </div>

          {/* Wallpaper */}
          {isAdmin && (
            <div className="px-6 py-4 border-b border-[#242f3d]">
              <p className="text-[#5288c1] text-xs font-semibold uppercase tracking-wider mb-2">Chat Wallpaper</p>
              <div className="flex items-center gap-2">
                <input ref={wallpaperRef} type="file" accept="image/*" className="hidden" onChange={handleWallpaper} />
                <button
                  onClick={() => wallpaperRef.current?.click()}
                  disabled={busy === "wallpaper"}
                  className="px-3 py-1.5 rounded-lg bg-[#242f3d] text-white text-xs"
                >
                  {busy === "wallpaper" ? "Uploading..." : "Upload Wallpaper"}
                </button>
                {chat.wallpaper && (
                  <button onClick={clearWallpaper} className="px-3 py-1.5 rounded-lg bg-[#242f3d] text-[#e17076] text-xs">
                    Remove
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Privacy: public + password */}
          {isAdmin && (
            <div className="px-6 py-4 border-b border-[#242f3d] space-y-3">
              <p className="text-[#5288c1] text-xs font-semibold uppercase tracking-wider">Discovery</p>
              <label className="flex items-center justify-between">
                <span className="text-white text-sm">Public (shows up in Explore)</span>
                <button
                  onClick={togglePublic}
                  disabled={busy === "public"}
                  className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${chat.isPublic ? "bg-[#5288c1]" : "bg-[#242f3d]"}`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${chat.isPublic ? "translate-x-4" : "translate-x-0"}`}
                  />
                </button>
              </label>
              <div className="space-y-1.5">
                <p className="text-white text-sm">{chat.passwordHash ? "Password set" : "No password"}</p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={chat.passwordHash ? "New password (blank = remove)" : "Set a join password"}
                    className="flex-1 bg-[#242f3d] rounded-xl px-3 py-1.5 text-white text-xs placeholder-[#4a6278] focus:outline-none"
                  />
                  <button
                    onClick={savePassword}
                    disabled={busy === "password"}
                    className="px-3 py-1.5 rounded-lg bg-[#5288c1] text-white text-xs font-medium"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Members */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[#5288c1] text-xs font-semibold uppercase tracking-wider">Members</p>
              {isAdmin && (
                <button onClick={() => setAddingMembers((v) => !v)} className="text-[#5288c1] text-xs font-medium">
                  {addingMembers ? "Done" : "+ Add"}
                </button>
              )}
            </div>

            {addingMembers && (
              <div className="mb-3 space-y-2">
                <input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search people to add..."
                  className="w-full bg-[#242f3d] rounded-xl px-3 py-1.5 text-white text-xs placeholder-[#4a6278] focus:outline-none"
                />
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {nonMembers.slice(0, 20).map((u) => (
                    <button
                      key={u.uid}
                      onClick={() => addMember(u.uid)}
                      disabled={busy === `add-${u.uid}`}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#242f3d]"
                    >
                      <Avatar name={u.displayName} photoURL={u.photoURL} size={26} />
                      <span className="text-white text-xs flex-1 text-left truncate">{u.displayName}</span>
                      <span className="text-[#5288c1] text-xs">Add</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1">
              {members.map((u) => {
                const targetIsAdmin = !!chat.admins?.includes(u.uid);
                return (
                  <div key={u.uid} className="flex items-center gap-2 px-1 py-1.5">
                    <Avatar name={u.displayName} photoURL={u.photoURL} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">
                        {u.displayName} {u.uid === currentUid && <span className="text-[#7d90a0]">(you)</span>}
                      </p>
                      {targetIsAdmin && <p className="text-[#5288c1] text-[10px]">Admin</p>}
                    </div>
                    {isAdmin && u.uid !== currentUid && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => toggleAdmin(u.uid)}
                          disabled={busy === `admin-${u.uid}`}
                          className="text-[#5288c1] text-xs"
                        >
                          {targetIsAdmin ? "Remove Admin" : "Make Admin"}
                        </button>
                        <button
                          onClick={() => kickMember(u.uid)}
                          disabled={busy === `kick-${u.uid}`}
                          className="text-[#e17076] text-xs"
                        >
                          Kick
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {error && <p className="px-6 pb-2 text-[#e17076] text-xs">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-[#242f3d] flex-shrink-0">
          <button onClick={leaveGroup} className="w-full py-2.5 rounded-xl bg-[#2d1a1c] text-[#e17076] text-sm font-medium">
            Leave Group
          </button>
        </div>
      </div>

      {cropFile && (
        <ImageCropModal
          file={cropFile}
          title="Crop Group Photo"
          onCancel={() => { setCropFile(null); if (photoRef.current) photoRef.current.value = ""; }}
          onDone={handleCroppedPhoto}
        />
      )}
    </div>
  );
}

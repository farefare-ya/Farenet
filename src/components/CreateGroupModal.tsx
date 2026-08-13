import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { hashPassword } from "../passwordUtils";
import Avatar from "./Avatar";
import type { Chat, UserProfile } from "../types";

interface CreateGroupModalProps {
  currentUid: string;
  usersMap: Record<string, UserProfile>;
  blockedUsers: string[];
  onClose: () => void;
  onCreated: (chat: Chat) => void;
}

export default function CreateGroupModal({
  currentUid,
  usersMap,
  blockedUsers,
  onClose,
  onCreated,
}: CreateGroupModalProps) {
  const [step, setStep] = useState<"members" | "name">("members");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const others = Object.values(usersMap).filter(
    (u) => u.uid !== currentUid && !blockedUsers.includes(u.uid)
  );
  const filtered = others.filter((u) =>
    u.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(uid: string) {
    setSelected((s) => (s.includes(uid) ? s.filter((x) => x !== uid) : [...s, uid]));
  }

  async function handleCreate() {
    if (!name.trim() || selected.length === 0 || creating) return;
    setCreating(true);
    try {
      const members = [currentUid, ...selected];
      const passwordHash = isPublic && password.trim() ? await hashPassword(password.trim()) : null;
      const ref = await addDoc(collection(db, "chats"), {
        name: name.trim(),
        members,
        isGroup: true,
        admins: [currentUid],
        isPublic,
        passwordHash,
        lastMessage: "",
        lastMessageTime: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      onCreated({ id: ref.id, name: name.trim(), members, isGroup: true, isPublic, passwordHash } as Chat);
      onClose();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-[#1c2733] rounded-2xl overflow-hidden shadow-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-[#242f3d] flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-semibold">
            {step === "members" ? "Create New Group" : "Group Settings"}
          </h2>
          <button onClick={onClose} className="text-[#7d90a0] hover:text-white text-sm">
            Cancel
          </button>
        </div>

        {step === "members" && (
          <>
            <div className="px-4 py-3 flex-shrink-0">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people..."
                className="w-full bg-[#242f3d] rounded-xl px-4 py-2 text-white text-sm placeholder-[#4a6278] focus:outline-none"
              />
              {selected.length > 0 && (
                <p className="text-[#5288c1] text-xs mt-2">{selected.length} selected</p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {filtered.length === 0 && (
                <p className="text-[#7d90a0] text-xs text-center py-6">No users found</p>
              )}
              {filtered.map((u) => {
                const isSelected = selected.includes(u.uid);
                return (
                  <button
                    key={u.uid}
                    onClick={() => toggle(u.uid)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#242f3d] transition-colors"
                  >
                    <Avatar name={u.displayName} photoURL={u.photoURL} size={38} />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-white text-sm font-medium truncate">{u.displayName}</p>
                      <p className="text-[#7d90a0] text-xs truncate">{u.email}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${
                        isSelected ? "bg-[#5288c1] border-[#5288c1]" : "border-[#4a6278]"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-[#242f3d] flex-shrink-0">
              <button
                onClick={() => setStep("name")}
                disabled={selected.length === 0}
                className="w-full py-2.5 rounded-xl bg-[#5288c1] text-white text-sm font-medium disabled:opacity-40 hover:bg-[#4577ad] transition-colors"
              >
                Next ({selected.length})
              </button>
            </div>
          </>
        )}

        {step === "name" && (
          <div className="px-6 py-5 space-y-4 overflow-y-auto">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              autoFocus
              className="w-full bg-[#242f3d] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#4a6278] focus:outline-none"
            />

            <label className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">Public group</p>
                <p className="text-[#7d90a0] text-xs">Shows up in Explore so anyone can find and join</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic((v) => !v)}
                className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${isPublic ? "bg-[#5288c1]" : "bg-[#242f3d]"}`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isPublic ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </button>
            </label>

            {isPublic && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Optional join password"
                className="w-full bg-[#242f3d] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#4a6278] focus:outline-none"
              />
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep("members")}
                className="flex-1 py-2.5 rounded-xl bg-[#242f3d] text-white text-sm font-medium hover:bg-[#2d3e50] transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim() || creating}
                className="flex-1 py-2.5 rounded-xl bg-[#5288c1] text-white text-sm font-medium disabled:opacity-40 hover:bg-[#4577ad] transition-colors"
              >
                {creating ? "Creating..." : "Create Group"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

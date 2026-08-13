import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../firebase";
import Avatar from "./Avatar";
import type { UserProfile } from "../types";

interface UserInfoModalProps {
  currentUid: string;
  profile: UserProfile;
  isContact: boolean;
  isBlocked: boolean;
  onClose: () => void;
}

export default function UserInfoModal({ currentUid, profile, isContact, isBlocked, onClose }: UserInfoModalProps) {
  async function toggleContact() {
    const ref = doc(db, "users", currentUid);
    if (isContact) await updateDoc(ref, { contacts: arrayRemove(profile.uid) });
    else await updateDoc(ref, { contacts: arrayUnion(profile.uid) });
  }

  async function toggleBlock() {
    const ref = doc(db, "users", currentUid);
    if (isBlocked) await updateDoc(ref, { blockedUsers: arrayRemove(profile.uid) });
    else await updateDoc(ref, { blockedUsers: arrayUnion(profile.uid) });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-[#1c2733] rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-[#242f3d] flex items-center justify-between">
          <h2 className="text-white font-semibold">Profile</h2>
          <button onClick={onClose} className="text-[#7d90a0] hover:text-white text-sm">
            Close
          </button>
        </div>

        <div className="px-6 py-6 flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar name={profile.displayName} photoURL={profile.photoURL} size={96} />
            {profile.online && (
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#4dcc4d] border-2 border-[#1c2733]" />
            )}
          </div>
          <p className="text-white text-lg font-semibold">{profile.displayName}</p>
          <p className="text-[#7d90a0] text-sm">{profile.online ? "online" : "offline"}</p>

          {profile.bio && (
            <p className="text-[#a8b8c5] text-sm text-center px-2 pt-2 border-t border-[#242f3d] w-full">{profile.bio}</p>
          )}
          <p className="text-[#7d90a0] text-xs">{profile.email}</p>

          <div className="w-full pt-4 border-t border-[#242f3d] flex flex-col gap-2">
            <button
              onClick={toggleContact}
              className="w-full py-2.5 rounded-xl bg-[#242f3d] text-white text-sm font-medium hover:bg-[#2d3e50] transition-colors"
            >
              {isContact ? "Remove from Contacts" : "Add to Contacts"}
            </button>
            <button
              onClick={toggleBlock}
              className="w-full py-2.5 rounded-xl bg-[#2d1a1c] text-[#e17076] text-sm font-medium"
            >
              {isBlocked ? `Unblock ${profile.displayName}` : `Block ${profile.displayName}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

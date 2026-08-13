import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { useClickOutside } from "../hooks";
import { hashPassword } from "../passwordUtils";
import Avatar from "./Avatar";
import ProfileModal from "./ProfileModal";
import CreateGroupModal from "./CreateGroupModal";
import PasswordPromptModal from "./PasswordPromptModal";
import type { Chat, UserProfile } from "../types";
import { formatTime } from "../utils";

interface SidebarProps {
  selectedChat: Chat | null;
  onSelectChat: (chat: Chat) => void;
  usersMap: Record<string, UserProfile>;
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Sidebar({ selectedChat, onSelectChat, usersMap }: SidebarProps) {
  const { currentUser, logout } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [publicGroups, setPublicGroups] = useState<Chat[]>([]);
  const [tab, setTab] = useState<"chats" | "contacts" | "explore">("chats");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [explorePeople, setExplorePeople] = useState<UserProfile[]>([]);
  const [exploreGroups, setExploreGroups] = useState<Chat[]>([]);
  const [joiningGroup, setJoiningGroup] = useState<Chat | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, menuOpen, () => setMenuOpen(false));

  const myProfile = currentUser ? usersMap[currentUser.uid] : null;
  const blockedUsers = myProfile?.blockedUsers || [];
  const contactIds = myProfile?.contacts || [];

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "chats"),
      where("members", "array-contains", currentUser.uid),
      orderBy("lastMessageTime", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setChats(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Chat)));
    });
    return unsub;
  }, [currentUser]);

  useEffect(() => {
    const q = query(collection(db, "chats"), where("isPublic", "==", true));
    const unsub = onSnapshot(q, (snap) => {
      setPublicGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Chat)));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (tab !== "explore" || !currentUser) return;
    const peoplePool = Object.values(usersMap).filter(
      (u) => u.uid !== currentUser.uid && !blockedUsers.includes(u.uid)
    );
    setExplorePeople(shuffled(peoplePool).slice(0, 10));
    const groupsPool = publicGroups.filter((g) => !g.members.includes(currentUser.uid));
    setExploreGroups(shuffled(groupsPool).slice(0, 10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const searchResults = search.trim()
    ? Object.values(usersMap).filter(
        (u) =>
          u.uid !== currentUser?.uid &&
          !blockedUsers.includes(u.uid) &&
          u.displayName?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const contacts = useMemo(
    () => contactIds.map((id) => usersMap[id]).filter(Boolean),
    [contactIds, usersMap]
  );

  async function toggleContact(uid: string) {
    if (!currentUser) return;
    const ref = doc(db, "users", currentUser.uid);
    if (contactIds.includes(uid)) await updateDoc(ref, { contacts: arrayRemove(uid) });
    else await updateDoc(ref, { contacts: arrayUnion(uid) });
  }

  async function startChat(user: UserProfile) {
    if (!currentUser) return;
    const existing = chats.find(
      (c) => !c.isGroup && c.members.includes(user.uid) && c.members.includes(currentUser.uid)
    );
    if (existing) {
      onSelectChat(existing);
      setSearch("");
      setShowSearch(false);
      return;
    }
    const ref = await addDoc(collection(db, "chats"), {
      name: user.displayName,
      members: [currentUser.uid, user.uid],
      isGroup: false,
      lastMessage: "",
      lastMessageTime: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
    const newChat: Chat = {
      id: ref.id,
      name: user.displayName,
      members: [currentUser.uid, user.uid],
      isGroup: false,
    };
    onSelectChat(newChat);
    setSearch("");
    setShowSearch(false);
  }

  async function joinGroup(group: Chat) {
    if (!currentUser) return;
    if (group.passwordHash) {
      setJoiningGroup(group);
      return;
    }
    await updateDoc(doc(db, "chats", group.id), { members: arrayUnion(currentUser.uid) });
    onSelectChat({ ...group, members: [...group.members, currentUser.uid] });
  }

  async function submitJoinPassword(pw: string): Promise<boolean> {
    if (!joiningGroup || !currentUser) return false;
    const hash = await hashPassword(pw);
    if (hash !== joiningGroup.passwordHash) return false;
    await updateDoc(doc(db, "chats", joiningGroup.id), { members: arrayUnion(currentUser.uid) });
    onSelectChat({ ...joiningGroup, members: [...joiningGroup.members, currentUser.uid] });
    setJoiningGroup(null);
    return true;
  }

  function otherMemberOf(chat: Chat): UserProfile | undefined {
    if (chat.isGroup || !currentUser) return undefined;
    const otherUid = chat.members.find((m) => m !== currentUser.uid);
    return otherUid ? usersMap[otherUid] : undefined;
  }

  const filteredChats = chats.filter((c) => {
    const displayName = c.isGroup ? c.name : otherMemberOf(c)?.displayName || c.name;
    return displayName?.toLowerCase().includes(search.toLowerCase());
  });

  function PersonRow({ user, showAdd }: { user: UserProfile; showAdd?: boolean }) {
    const isContact = contactIds.includes(user.uid);
    return (
      <div className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#242f3d] transition-colors group">
        <button onClick={() => startChat(user)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className="relative flex-shrink-0">
            <Avatar name={user.displayName} photoURL={user.photoURL} size={40} />
            {user.online && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#4dcc4d] border-2 border-[#17212b]" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{user.displayName}</p>
            <p className="text-[#7d90a0] text-xs truncate">{user.online ? "online" : user.email}</p>
          </div>
        </button>
        {showAdd && (
          <button
            onClick={() => toggleContact(user.uid)}
            title={isContact ? "Remove from contacts" : "Add to contacts"}
            className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-[#2d3e50]"
          >
            <svg viewBox="0 0 24 24" className={`w-4 h-4 ${isContact ? "fill-[#5288c1]" : "fill-[#7d90a0]"}`}>
              {isContact ? (
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              ) : (
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
              )}
            </svg>
          </button>
        )}
      </div>
    );
  }

  function GroupRow({ group }: { group: Chat }) {
    return (
      <div className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#242f3d] transition-colors">
        <Avatar name={group.name} photoURL={group.photoURL} size={40} />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{group.name}</p>
          <p className="text-[#7d90a0] text-xs truncate">
            {group.members.length} members{group.passwordHash ? " \u00b7 \ud83d\udd12 locked" : ""}
          </p>
        </div>
        <button
          onClick={() => joinGroup(group)}
          className="px-3 py-1.5 rounded-lg bg-[#5288c1] text-white text-xs font-medium flex-shrink-0"
        >
          Join
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "#17212b" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#0d1821]">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#242f3d] transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#7d90a0]">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute top-10 left-0 bg-[#242f3d] rounded-xl shadow-xl overflow-hidden z-50 w-48">
              <button
                onClick={() => { setShowProfile(true); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-[#2d3e50] hover:bg-[#2d3e50] transition-colors"
              >
                <Avatar name={myProfile?.displayName || currentUser?.displayName || "?"} photoURL={myProfile?.photoURL} size={32} />
                <div className="text-left min-w-0">
                  <p className="text-white text-sm font-medium truncate">{currentUser?.displayName}</p>
                  <p className="text-[#7d90a0] text-xs truncate">Edit profile</p>
                </div>
              </button>
              <button
                onClick={() => { logout(); setMenuOpen(false); }}
                className="w-full text-left px-4 py-3 text-[#e17076] text-sm hover:bg-[#2d3e50] transition-colors flex items-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                </svg>
                Log Out
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 relative">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#4a6278] absolute left-3 top-1/2 -translate-y-1/2">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowSearch(true); }}
            onFocus={() => setShowSearch(true)}
            placeholder="Search"
            className="w-full bg-[#242f3d] rounded-xl pl-9 pr-4 py-2 text-white text-sm placeholder-[#4a6278] focus:outline-none focus:ring-1 focus:ring-[#5288c1]"
          />
        </div>

        <button
          onClick={() => setShowCreateGroup(true)}
          title="Create new group"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#242f3d] transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#5288c1]">
            <path d="M19 3H4.99C3.89 3 3 3.89 3 4.99V19c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.19-1.21.54-1.71C7.02 15.28 9.36 14 12 14s4.98 1.28 6.46 3.06c.35.5.54 1.09.54 1.71V19z" />
          </svg>
        </button>
      </div>

      {/* Search results (exact matches only) */}
      {showSearch && search.trim() && (
        <div className="border-b border-[#0d1821] max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-2">
            <p className="text-[#5288c1] text-xs font-semibold uppercase tracking-wider">Search Results</p>
            <button onClick={() => { setShowSearch(false); setSearch(""); }} className="text-[#7d90a0] text-xs">
              Close
            </button>
          </div>
          {searchResults.length > 0 ? (
            searchResults.map((user) => <PersonRow key={user.uid} user={user} showAdd />)
          ) : (
            <p className="text-[#7d90a0] text-xs text-center py-6">No results found</p>
          )}
        </div>
      )}

      {/* Tabs */}
      {!(showSearch && search.trim()) && (
        <div className="flex border-b border-[#0d1821]">
          <button
            onClick={() => { setTab("chats"); setShowSearch(false); }}
            className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider ${
              tab === "chats" ? "text-[#5288c1] border-b-2 border-[#5288c1]" : "text-[#7d90a0]"
            }`}
          >
            Chats
          </button>
          <button
            onClick={() => { setTab("contacts"); setShowSearch(false); }}
            className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider ${
              tab === "contacts" ? "text-[#5288c1] border-b-2 border-[#5288c1]" : "text-[#7d90a0]"
            }`}
          >
            Contacts {contacts.length > 0 && `(${contacts.length})`}
          </button>
          <button
            onClick={() => { setTab("explore"); setShowSearch(false); }}
            className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider ${
              tab === "explore" ? "text-[#5288c1] border-b-2 border-[#5288c1]" : "text-[#7d90a0]"
            }`}
          >
            Explore
          </button>
        </div>
      )}

      {/* Chats list */}
      {!(showSearch && search.trim()) && tab === "chats" && (
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-16 h-16 rounded-full bg-[#242f3d] flex items-center justify-center mb-4">
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-[#5288c1]">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
              </div>
              <p className="text-[#7d90a0] text-sm">No chats yet</p>
              <p className="text-[#4a6278] text-xs mt-1">Search for someone or explore public groups</p>
            </div>
          )}
          {filteredChats.map((chat) => {
            const isSelected = selectedChat?.id === chat.id;
            const other = otherMemberOf(chat);
            const displayName = chat.isGroup ? chat.name : other?.displayName || chat.name || "Unknown";
            const photoURL = chat.isGroup ? chat.photoURL : other?.photoURL;
            const isTyping =
              currentUser &&
              chat.typing &&
              Object.entries(chat.typing).some(([uid, val]) => uid !== currentUser.uid && val);
            return (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                  isSelected ? "bg-[#2b5278]" : "hover:bg-[#242f3d]"
                }`}
              >
                <Avatar name={displayName} photoURL={photoURL} size={44} />
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-white text-sm font-medium truncate">{displayName}</p>
                    {chat.lastMessageTime && (
                      <span className="text-[#7d90a0] text-xs flex-shrink-0">{formatTime(chat.lastMessageTime)}</span>
                    )}
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${isTyping ? "text-[#5288c1]" : "text-[#7d90a0]"}`}>
                    {isTyping
                      ? "typing..."
                      : `${chat.lastSenderId === currentUser?.uid ? "You: " : ""}${chat.lastMessage || "No messages yet"}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Contacts list */}
      {!(showSearch && search.trim()) && tab === "contacts" && (
        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <p className="text-[#7d90a0] text-sm">No contacts yet</p>
              <p className="text-[#4a6278] text-xs mt-1">Search for people and tap the + icon to add a contact</p>
            </div>
          )}
          {contacts.map((user) => (
            <PersonRow key={user.uid} user={user} showAdd />
          ))}
        </div>
      )}

      {/* Explore */}
      {!(showSearch && search.trim()) && tab === "explore" && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2">
            <p className="text-[#5288c1] text-xs font-semibold uppercase tracking-wider">Public Groups</p>
          </div>
          {exploreGroups.length === 0 && (
            <p className="text-[#7d90a0] text-xs text-center py-4 px-6">No public groups to discover right now.</p>
          )}
          {exploreGroups.map((g) => (
            <GroupRow key={g.id} group={g} />
          ))}

          <div className="px-4 py-2 mt-2">
            <p className="text-[#5288c1] text-xs font-semibold uppercase tracking-wider">Active People</p>
          </div>
          {explorePeople.length === 0 && (
            <p className="text-[#7d90a0] text-xs text-center py-4 px-6">No other users yet.</p>
          )}
          {explorePeople.map((user) => (
            <PersonRow key={user.uid} user={user} showAdd />
          ))}
        </div>
      )}

      {showProfile && currentUser && (
        <ProfileModal authUser={currentUser} profile={myProfile} onClose={() => setShowProfile(false)} />
      )}
      {showCreateGroup && currentUser && (
        <CreateGroupModal
          currentUid={currentUser.uid}
          usersMap={usersMap}
          blockedUsers={blockedUsers}
          onClose={() => setShowCreateGroup(false)}
          onCreated={onSelectChat}
        />
      )}
      {joiningGroup && (
        <PasswordPromptModal
          groupName={joiningGroup.name}
          onCancel={() => setJoiningGroup(null)}
          onSubmit={submitJoinPassword}
        />
      )}
    </div>
  );
}

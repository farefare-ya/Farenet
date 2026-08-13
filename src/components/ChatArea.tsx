import { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { compressImage, readFileAsDataURL } from "../imageUtils";
import Avatar from "./Avatar";
import GroupInfoModal from "./GroupInfoModal";
import UserInfoModal from "./UserInfoModal";
import type { Chat, Message, UserProfile, ReplyPreview } from "../types";
import { formatMessageTime, formatDateDivider } from "../utils";

interface ChatAreaProps {
  chat: Chat;
  usersMap: Record<string, UserProfile>;
  onLeaveChat: () => void;
}

const MAX_IMAGE_BYTES = 100 * 1024;
const MAX_GIF_BYTES = 400 * 1024;

function isSameDay(a: any, b: any) {
  const da = a?.toDate ? a.toDate() : new Date(a);
  const db2 = b?.toDate ? b.toDate() : new Date(b);
  return (
    da.getFullYear() === db2.getFullYear() &&
    da.getMonth() === db2.getMonth() &&
    da.getDate() === db2.getDate()
  );
}

function replySnippet(msg: Message): string {
  if (msg.deleted) return "Message deleted";
  if (msg.type === "image") return "\ud83d\uddbc\ufe0f Photo";
  if (msg.type === "gif") return "\ud83c\udfde\ufe0f GIF";
  return msg.text;
}

export default function ChatArea({ chat, usersMap, onLeaveChat }: ChatAreaProps) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [liveChat, setLiveChat] = useState<Chat>(chat);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [attachError, setAttachError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const gifInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLiveChat(chat);
    const unsub = onSnapshot(doc(db, "chats", chat.id), (snap) => {
      if (snap.exists()) setLiveChat({ id: snap.id, ...snap.data() } as Chat);
    });
    return unsub;
  }, [chat.id]);

  useEffect(() => {
    const q = query(collection(db, "chats", chat.id, "messages"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
    });
    return unsub;
  }, [chat.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setReplyingTo(null);
    setShowInfo(false);
  }, [chat.id]);

  useEffect(() => {
    return () => {
      if (currentUser) {
        updateDoc(doc(db, "chats", chat.id), { [`typing.${currentUser.uid}`]: false }).catch(() => {});
      }
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, [chat.id, currentUser]);

  const myProfile = currentUser ? usersMap[currentUser.uid] : null;
  const otherUid = !liveChat.isGroup && currentUser ? liveChat.members.find((m) => m !== currentUser.uid) : undefined;
  const otherProfile = otherUid ? usersMap[otherUid] : undefined;
  const iBlockedThem = !!otherUid && !!myProfile?.blockedUsers?.includes(otherUid);
  const theyBlockedMe = !!otherUid && !!otherProfile?.blockedUsers?.includes(currentUser?.uid || "");
  const isBlocked = iBlockedThem || theyBlockedMe;
  const isContact = !!otherUid && !!myProfile?.contacts?.includes(otherUid);
  const isAdmin = !!currentUser && !!liveChat.admins?.includes(currentUser.uid);
  const canPin = liveChat.isGroup ? isAdmin : true;

  const chatDisplayName = liveChat.isGroup ? liveChat.name : otherProfile?.displayName || liveChat.name || "Chat";
  const chatPhotoURL = liveChat.isGroup ? liveChat.photoURL : otherProfile?.photoURL;

  const typingNames = Object.entries(liveChat.typing || {})
    .filter(([uid, val]) => val && uid !== currentUser?.uid)
    .map(([uid]) => usersMap[uid]?.displayName || "Someone");

  let subtitle: string;
  if (isBlocked) {
    subtitle = iBlockedThem ? "Blocked" : "online";
  } else if (typingNames.length > 0) {
    subtitle = liveChat.isGroup ? `${typingNames.join(", ")} typing...` : "typing...";
  } else {
    subtitle = liveChat.isGroup ? `${liveChat.members.length} members` : otherProfile?.online ? "online" : "offline";
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    if (!currentUser) return;
    updateDoc(doc(db, "chats", chat.id), { [`typing.${currentUser.uid}`]: true }).catch(() => {});
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      updateDoc(doc(db, "chats", chat.id), { [`typing.${currentUser.uid}`]: false }).catch(() => {});
    }, 2000);
  }

  function buildReplyField(): ReplyPreview | null {
    if (!replyingTo) return null;
    return {
      id: replyingTo.id,
      text: replySnippet(replyingTo),
      senderName: replyingTo.senderName,
      type: replyingTo.type || "text",
    };
  }

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text.trim() || !currentUser || sending || isBlocked) return;
    const msgText = text.trim();
    const replyField = buildReplyField();
    setText("");
    setReplyingTo(null);
    setSending(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    try {
      await addDoc(collection(db, "chats", chat.id, "messages"), {
        type: "text",
        text: msgText,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || "Unknown",
        timestamp: serverTimestamp(),
        read: false,
        replyTo: replyField,
      });
      await updateDoc(doc(db, "chats", chat.id), {
        lastMessage: msgText,
        lastMessageTime: serverTimestamp(),
        lastSenderId: currentUser.uid,
        [`typing.${currentUser.uid}`]: false,
      });
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachError("");
    if (!file.type.startsWith("image/")) {
      setAttachError("Only image files are allowed (video is not supported).");
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }
    if (file.type === "image/gif") {
      setAttachError("Use the GIF button to send a GIF file.");
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }
    if (!currentUser || isBlocked) return;
    const replyField = buildReplyField();
    setSending(true);
    try {
      const compressed = await compressImage(file, MAX_IMAGE_BYTES);
      await addDoc(collection(db, "chats", chat.id, "messages"), {
        type: "image",
        text: "",
        imageData: compressed,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || "Unknown",
        timestamp: serverTimestamp(),
        read: false,
        replyTo: replyField,
      });
      await updateDoc(doc(db, "chats", chat.id), {
        lastMessage: "\ud83d\uddbc\ufe0f Photo",
        lastMessageTime: serverTimestamp(),
        lastSenderId: currentUser.uid,
      });
      setReplyingTo(null);
    } catch {
      setAttachError("Failed to send image.");
    } finally {
      setSending(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  async function handleGifSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachError("");
    if (file.type !== "image/gif") {
      setAttachError("File must be a GIF.");
      if (gifInputRef.current) gifInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_GIF_BYTES) {
      setAttachError(`GIF max size is ${Math.round(MAX_GIF_BYTES / 1024)}KB (not compressed so the animation stays intact).`);
      if (gifInputRef.current) gifInputRef.current.value = "";
      return;
    }
    if (!currentUser || isBlocked) return;
    const replyField = buildReplyField();
    setSending(true);
    try {
      const dataUrl = await readFileAsDataURL(file);
      await addDoc(collection(db, "chats", chat.id, "messages"), {
        type: "gif",
        text: "",
        imageData: dataUrl,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || "Unknown",
        timestamp: serverTimestamp(),
        read: false,
        replyTo: replyField,
      });
      await updateDoc(doc(db, "chats", chat.id), {
        lastMessage: "\ud83c\udfde\ufe0f GIF",
        lastMessageTime: serverTimestamp(),
        lastSenderId: currentUser.uid,
      });
      setReplyingTo(null);
    } catch {
      setAttachError("Failed to send GIF.");
    } finally {
      setSending(false);
      if (gifInputRef.current) gifInputRef.current.value = "";
    }
  }

  async function deleteMessage(msgId: string) {
    await updateDoc(doc(db, "chats", chat.id, "messages", msgId), {
      deleted: true,
      text: "",
      imageData: null,
    });
  }

  async function pinMessage(msg: Message) {
    await updateDoc(doc(db, "chats", chat.id), {
      pinnedMessage: { id: msg.id, text: replySnippet(msg), senderName: msg.senderName, type: msg.type || "text" },
    });
  }

  async function unpinMessage() {
    await updateDoc(doc(db, "chats", chat.id), { pinnedMessage: null });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const rendered: Array<{ type: "date"; label: string } | { type: "msg"; msg: Message }> = [];
  messages.forEach((msg, i) => {
    const prev = messages[i - 1];
    if (!prev || !isSameDay(prev.timestamp, msg.timestamp)) {
      rendered.push({ type: "date", label: formatDateDivider(msg.timestamp) });
    }
    rendered.push({ type: "msg", msg });
  });

  return (
    <div className="flex flex-col h-full" style={{ background: "#0e1621" }}>
      {/* Header */}
      <button
        onClick={() => setShowInfo(true)}
        className="flex items-center gap-3 px-4 py-3 border-b border-[#0d1821] flex-shrink-0 w-full text-left hover:bg-[#1c2733] transition-colors"
        style={{ background: "#17212b" }}
      >
        <Avatar name={chatDisplayName} photoURL={chatPhotoURL} size={40} />
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm truncate">{chatDisplayName}</p>
          <p className={`text-xs truncate ${typingNames.length > 0 && !isBlocked ? "text-[#5288c1]" : "text-[#7d90a0]"}`}>
            {subtitle}
          </p>
        </div>
      </button>

      {liveChat.isGroup && liveChat.announcement && (
        <div className="px-4 py-2 text-xs text-[#f4d58d] flex items-start gap-2 flex-shrink-0" style={{ background: "#26241a" }}>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#f4d58d] flex-shrink-0 mt-0.5">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <span>{liveChat.announcement}</span>
        </div>
      )}

      {liveChat.pinnedMessage && (
        <button
          onClick={canPin ? unpinMessage : undefined}
          className="flex items-center gap-2 px-4 py-2 text-left flex-shrink-0 hover:bg-[#1c2733] transition-colors"
          style={{ background: "#182533" }}
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#5288c1] flex-shrink-0">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="text-[#5288c1] text-[11px] font-semibold">Pinned \u00b7 {liveChat.pinnedMessage.senderName}</p>
            <p className="text-[#a8b8c5] text-xs truncate">{liveChat.pinnedMessage.text}</p>
          </div>
          {canPin && <span className="text-[#7d90a0] text-[10px] flex-shrink-0">Tap to unpin</span>}
        </button>
      )}

      {isBlocked && (
        <div className="px-4 py-2 text-center text-xs text-[#7d90a0] flex-shrink-0" style={{ background: "#182533" }}>
          {iBlockedThem ? "You blocked this user. Open their profile to unblock." : "You can't send messages to this user."}
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-cover bg-center"
        style={{
          backgroundImage: liveChat.wallpaper
            ? `url("${liveChat.wallpaper}")`
            : `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.015' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-[#242f3d] flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" className="w-8 h-8 fill-[#5288c1]">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
            </div>
            <p className="text-[#7d90a0] text-sm">No messages yet</p>
            <p className="text-[#4a6278] text-xs mt-1">Send a message to start the conversation</p>
          </div>
        )}

        {rendered.map((item, i) => {
          if (item.type === "date") {
            return (
              <div key={`date-${i}`} className="flex justify-center my-4">
                <span className="bg-[#182533]/80 backdrop-blur text-[#7d90a0] text-xs px-3 py-1 rounded-full">
                  {item.label}
                </span>
              </div>
            );
          }
          const { msg } = item;
          const isMe = msg.senderId === currentUser?.uid;
          const senderProfile = usersMap[msg.senderId];
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} group`}>
              {!isMe && (
                <Avatar name={msg.senderName} photoURL={senderProfile?.photoURL} size={28} className="mr-2 self-end mb-1" />
              )}

              {!msg.deleted && (
                <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity self-end mb-2 ${isMe ? "order-1 ml-1" : "ml-0 mr-1"}`}>
                  {canPin && (
                    <button onClick={() => pinMessage(msg)} title="Pin" className="text-[#7d90a0] hover:text-[#5288c1]">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                      </svg>
                    </button>
                  )}
                  <button onClick={() => setReplyingTo(msg)} title="Reply" className="text-[#7d90a0] hover:text-[#5288c1]">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                      <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" />
                    </svg>
                  </button>
                  {isMe && (
                    <button onClick={() => deleteMessage(msg.id)} title="Delete message" className="text-[#7d90a0] hover:text-[#e17076]">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              <div
                className={`max-w-[65%] rounded-2xl px-3 py-2 shadow-sm ${isMe ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                style={{ background: isMe ? "#2b5278" : "#182533" }}
              >
                {!isMe && liveChat.isGroup && !msg.deleted && (
                  <p className="text-xs font-semibold mb-1" style={{ color: "#5288c1" }}>
                    {msg.senderName}
                  </p>
                )}
                {msg.replyTo && !msg.deleted && (
                  <div className="mb-1.5 pl-2 border-l-2 border-[#5288c1]/60 bg-black/10 rounded py-1 px-1.5">
                    <p className="text-[11px] font-semibold text-[#5288c1]">{msg.replyTo.senderName}</p>
                    <p className="text-[11px] text-[#a8b8c5] truncate max-w-[220px]">{msg.replyTo.text}</p>
                  </div>
                )}
                {msg.deleted ? (
                  <p className="text-[#7d90a0] text-sm italic">This message was deleted</p>
                ) : (msg.type === "image" || msg.type === "gif") && msg.imageData ? (
                  <img src={msg.imageData} alt={msg.type === "gif" ? "GIF" : "Image"} className="rounded-lg max-w-[240px] max-h-[240px] object-cover" />
                ) : (
                  <p className="text-white text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                )}
                <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                  <span className="text-[10px] text-[#7d90a0]">{formatMessageTime(msg.timestamp)}</span>
                  {isMe && !msg.deleted && (
                    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-[#5288c1]">
                      <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {attachError && (
        <div className="px-4 py-1.5 text-center text-xs text-[#e17076] flex-shrink-0" style={{ background: "#17212b" }}>
          {attachError}
        </div>
      )}

      {replyingTo && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-[#0d1821] flex-shrink-0" style={{ background: "#182533" }}>
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#5288c1] flex-shrink-0">
            <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-[#5288c1] text-xs font-semibold">Replying to {replyingTo.senderName}</p>
            <p className="text-[#7d90a0] text-xs truncate">{replySnippet(replyingTo)}</p>
          </div>
          <button onClick={() => setReplyingTo(null)} className="text-[#7d90a0] hover:text-white flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-3 border-t border-[#0d1821] flex-shrink-0" style={{ background: "#17212b" }}>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
        <input ref={gifInputRef} type="file" accept="image/gif" className="hidden" onChange={handleGifSelect} />

        <button
          onClick={() => imageInputRef.current?.click()}
          disabled={isBlocked}
          title="Send image"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#242f3d] transition-colors flex-shrink-0 disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#7d90a0]">
            <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z" />
          </svg>
        </button>

        <button
          onClick={() => gifInputRef.current?.click()}
          disabled={isBlocked}
          title="Send GIF"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#242f3d] transition-colors flex-shrink-0 disabled:opacity-40 text-[10px] font-bold text-[#7d90a0]"
        >
          GIF
        </button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={isBlocked ? "You can't send messages" : "Message"}
            rows={1}
            disabled={isBlocked}
            className="w-full bg-[#242f3d] rounded-2xl px-4 py-2.5 text-white text-sm placeholder-[#4a6278] focus:outline-none resize-none disabled:opacity-50"
            style={{ maxHeight: "120px", overflowY: "auto" }}
          />
        </div>

        <button
          onClick={() => sendMessage()}
          disabled={!text.trim() || sending || isBlocked}
          className="w-9 h-9 flex items-center justify-center rounded-full transition-colors flex-shrink-0"
          style={{ background: text.trim() && !isBlocked ? "#5288c1" : "#242f3d" }}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
            <path d={text.trim() ? "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" : "M19 11H7.83l4.88-4.88c.39-.39.39-1.03 0-1.42-.39-.39-1.02-.39-1.41 0l-6.59 6.59c-.39.39-.39 1.02 0 1.41l6.59 6.59c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L7.83 13H19c.55 0 1-.45 1-1s-.45-1-1-1z"} />
          </svg>
        </button>
      </div>

      {showInfo && liveChat.isGroup && currentUser && (
        <GroupInfoModal
          chat={liveChat}
          currentUid={currentUser.uid}
          usersMap={usersMap}
          onClose={() => setShowInfo(false)}
          onLeft={() => { setShowInfo(false); onLeaveChat(); }}
        />
      )}
      {showInfo && !liveChat.isGroup && otherProfile && currentUser && (
        <UserInfoModal
          currentUid={currentUser.uid}
          profile={otherProfile}
          isContact={isContact}
          isBlocked={iBlockedThem}
          onClose={() => setShowInfo(false)}
        />
      )}
    </div>
  );
}

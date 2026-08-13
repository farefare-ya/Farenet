import { useState } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import AuthPage from "./components/AuthPage";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import SetupScreen from "./components/SetupScreen";
import { isFirebaseConfigured } from "./firebase";
import { useUsersMap } from "./hooks";
import type { Chat } from "./types";

function AppContent() {
  const { currentUser, loading } = useAuth();
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const usersMap = useUsersMap();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "#17212b" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#2b5278] flex items-center justify-center animate-pulse">
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
          </div>
          <p className="text-[#7d90a0] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPage />;
  }

  function handleSelectChat(chat: Chat) {
    setSelectedChat(chat);
    setMobileChatOpen(true);
  }

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#0e1621", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Sidebar */}
      <div
        className={`flex-shrink-0 border-r border-[#0d1821] transition-all duration-300 ${
          mobileChatOpen ? "hidden md:flex" : "flex"
        } flex-col`}
        style={{ width: "clamp(280px, 30%, 360px)" }}
      >
        <Sidebar selectedChat={selectedChat} onSelectChat={handleSelectChat} usersMap={usersMap} />
      </div>

      {/* Main chat area */}
      <div className={`flex-1 flex flex-col min-w-0 ${mobileChatOpen ? "flex" : "hidden md:flex"}`}>
        {selectedChat ? (
          <>
            {/* Mobile back button */}
            <div className="md:hidden absolute top-3 left-3 z-10">
              <button
                onClick={() => setMobileChatOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#242f3d]"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#7d90a0]">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </svg>
              </button>
            </div>
            <ChatArea chat={selectedChat} usersMap={usersMap} onLeaveChat={() => { setSelectedChat(null); setMobileChatOpen(false); }} />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center" style={{ background: "#0e1621" }}>
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-[#17212b] flex items-center justify-center mb-6 mx-auto">
                <svg viewBox="0 0 24 24" className="w-12 h-12 fill-[#2b5278]">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
              </div>
              <h2 className="text-white text-xl font-semibold mb-2">Select a Chat</h2>
              <p className="text-[#7d90a0] text-sm max-w-xs">
                Choose a conversation from the sidebar or search for someone new to start chatting
              </p>
            </div>
          </div>
        )}
      </div>


    </div>
  );
}

export default function App() {
  if (!isFirebaseConfigured) {
    return <SetupScreen />;
  }
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

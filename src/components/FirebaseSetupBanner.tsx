import { useState } from "react";

export default function FirebaseSetupBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-[#242f3d] border border-[#2d3e50] rounded-2xl shadow-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-[#e17076]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#e17076]">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-white text-sm font-semibold mb-1">Firebase Setup Required</p>
          <p className="text-[#7d90a0] text-xs leading-relaxed">
            Add your Firebase config to <code className="bg-[#17212b] px-1 py-0.5 rounded text-[#5288c1]">.env</code>:
          </p>
          <div className="mt-2 bg-[#17212b] rounded-lg p-2 font-mono text-[10px] text-[#7d90a0] space-y-0.5">
            <p>VITE_FIREBASE_API_KEY=...</p>
            <p>VITE_FIREBASE_AUTH_DOMAIN=...</p>
            <p>VITE_FIREBASE_PROJECT_ID=...</p>
            <p>VITE_FIREBASE_STORAGE_BUCKET=...</p>
            <p>VITE_FIREBASE_MESSAGING_SENDER_ID=...</p>
            <p>VITE_FIREBASE_APP_ID=...</p>
          </div>
          <a
            href="https://console.firebase.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-xs text-[#5288c1] hover:underline"
          >
            Open Firebase Console →
          </a>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-[#4a6278] hover:text-white transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

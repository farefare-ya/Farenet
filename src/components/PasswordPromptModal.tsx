import { useState } from "react";

interface PasswordPromptModalProps {
  groupName: string;
  onCancel: () => void;
  onSubmit: (password: string) => Promise<boolean>; // returns true if correct
}

export default function PasswordPromptModal({ groupName, onCancel, onSubmit }: PasswordPromptModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError("");
    const ok = await onSubmit(password);
    if (!ok) {
      setError("Incorrect password.");
      setChecking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs bg-[#1c2733] rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-[#242f3d]">
          <h2 className="text-white font-semibold">Password Required</h2>
          <p className="text-[#7d90a0] text-xs mt-1">"{groupName}" is password-protected</p>
        </div>
        <div className="px-6 py-5 space-y-3">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Group password"
            className="w-full bg-[#242f3d] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#4a6278] focus:outline-none"
          />
          {error && <p className="text-[#e17076] text-xs">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl bg-[#242f3d] text-white text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={checking || !password}
              className="flex-1 py-2.5 rounded-xl bg-[#5288c1] text-white text-sm font-medium disabled:opacity-40"
            >
              {checking ? "Checking..." : "Join"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

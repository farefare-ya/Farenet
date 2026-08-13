export default function SetupScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #17212b 0%, #0e1621 100%)" }}
    >
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-full bg-[#2b5278] flex items-center justify-center mb-5 shadow-2xl">
            <svg viewBox="0 0 24 24" className="w-11 h-11 fill-white">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
          </div>
          <h1 className="text-white text-3xl font-semibold tracking-tight">Farenet</h1>
          <p className="text-[#7d90a0] text-sm mt-2">Connect your Firebase project to get started</p>
        </div>

        {/* Steps */}
        <div className="bg-[#1c2733] rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-6 py-5 border-b border-[#242f3d]">
            <h2 className="text-white font-semibold">Firebase Setup Required</h2>
            <p className="text-[#7d90a0] text-sm mt-1">
              This app needs a Firebase project with Authentication and Firestore enabled.
            </p>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-[#5288c1] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold mt-0.5">1</div>
              <div>
                <p className="text-white text-sm font-medium">Create a Firebase project</p>
                <a
                  href="https://console.firebase.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#5288c1] text-xs hover:underline"
                >
                  console.firebase.google.com →
                </a>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-[#5288c1] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold mt-0.5">2</div>
              <div>
                <p className="text-white text-sm font-medium">Enable Authentication</p>
                <p className="text-[#7d90a0] text-xs mt-0.5">Go to Authentication → Sign-in method → Enable Email/Password</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-[#5288c1] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold mt-0.5">3</div>
              <div>
                <p className="text-white text-sm font-medium">Enable Firestore Database</p>
                <p className="text-[#7d90a0] text-xs mt-0.5">Go to Firestore Database → Create database → Start in test mode</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-[#5288c1] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold mt-0.5">4</div>
              <div>
                <p className="text-white text-sm font-medium">Add environment variables</p>
                <p className="text-[#7d90a0] text-xs mt-0.5 mb-2">
                  Go to Project Settings → Your apps → Web app → Config, then create a <code className="bg-[#17212b] px-1 rounded">.env</code> file:
                </p>
                <div className="bg-[#0e1621] rounded-xl p-3 font-mono text-[11px] text-[#7d90a0] space-y-1 select-all">
                  <p><span className="text-[#5288c1]">VITE_FIREBASE_API_KEY</span>=your_api_key</p>
                  <p><span className="text-[#5288c1]">VITE_FIREBASE_AUTH_DOMAIN</span>=your_project.firebaseapp.com</p>
                  <p><span className="text-[#5288c1]">VITE_FIREBASE_PROJECT_ID</span>=your_project_id</p>
                  <p><span className="text-[#5288c1]">VITE_FIREBASE_STORAGE_BUCKET</span>=your_project.appspot.com</p>
                  <p><span className="text-[#5288c1]">VITE_FIREBASE_MESSAGING_SENDER_ID</span>=your_sender_id</p>
                  <p><span className="text-[#5288c1]">VITE_FIREBASE_APP_ID</span>=your_app_id</p>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-[#7bc862] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold mt-0.5">5</div>
              <div>
                <p className="text-white text-sm font-medium">Reload the app</p>
                <p className="text-[#7d90a0] text-xs mt-0.5">After saving the <code className="bg-[#17212b] px-1 rounded">.env</code> file, the dev server will hot-reload and the app will launch.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

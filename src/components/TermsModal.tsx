interface TermsModalProps {
  onClose: () => void;
}

export default function TermsModal({ onClose }: TermsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-[#1c2733] rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-[#242f3d] flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-semibold">Terms of Service</h2>
          <button onClick={onClose} className="text-[#7d90a0] hover:text-white text-sm">
            Close
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 space-y-4 text-[#a8b8c5] text-sm leading-relaxed">
          <p className="text-[#7d90a0] text-xs">Last updated: 2026</p>

          <section>
            <h3 className="text-white font-semibold mb-1">1. About this service</h3>
            <p>
              This is an independent, personal messaging application. It is not affiliated with, endorsed by,
              or connected to any other messaging product or company. By creating an account, you agree to the
              terms below.
            </p>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-1">2. Your account</h3>
            <p>
              You're responsible for the activity on your account and for keeping your password secure. You must
              provide a working email address to register. You may delete your account at any time by contacting
              the operator of this app.
            </p>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-1">3. Acceptable use</h3>
            <p>
              Don't use this app to harass, threaten, or impersonate others; to share illegal content; to spam;
              or to attempt to disrupt or gain unauthorized access to the service. Accounts found doing so may be
              blocked or removed.
            </p>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-1">4. Content you send</h3>
            <p>
              You retain ownership of messages, images, and GIFs you send. You're solely responsible for content
              you share and confirm you have the right to share it. Group admins can remove members and moderate
              their own groups; the app operator is not responsible for user-created group content.
            </p>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-1">5. Data & storage</h3>
            <p>
              Messages, profile info, and images you upload are stored using a third-party cloud database
              provider to operate the service. Inactive accounts (no activity for 30+ days) may be automatically
              deleted. This app is provided for personal/educational use, without guarantees of uptime or data
              retention.
            </p>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-1">6. No warranty</h3>
            <p>
              This service is provided "as is," without warranties of any kind, express or implied. The operator
              is not liable for any damages arising from your use of the app, to the fullest extent permitted by
              law.
            </p>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-1">7. Changes</h3>
            <p>These terms may be updated from time to time. Continued use of the app means you accept the current version.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

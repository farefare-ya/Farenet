/**
 * cleanup-inactive-users.mjs
 * ---------------------------------------------------------------
 * Deletes any account whose `lastSeen` is older than 30 days.
 *
 * This runs OUTSIDE the app, with full admin access (bypasses
 * Firestore Security Rules entirely) — that's why it can't live in
 * the React app itself. Run it manually whenever you want, or
 * schedule it (see bottom of this file for cron / Task Scheduler).
 *
 * SETUP (one-time):
 *   1. Firebase Console → Project Settings → Service Accounts
 *      → "Generate new private key" → save the JSON file somewhere
 *      SAFE, outside your project's git repo (e.g. ~/keys/farenet-service-account.json)
 *   2. In this project folder: pnpm add -D firebase-admin
 *   3. Run:
 *        GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account.json" node scripts/cleanup-inactive-users.mjs
 *
 *      Add --dry-run to only PRINT who would be deleted, without deleting:
 *        GOOGLE_APPLICATION_CREDENTIALS="..." node scripts/cleanup-inactive-users.mjs --dry-run
 * ---------------------------------------------------------------
 */
import admin from "firebase-admin";

const INACTIVE_DAYS = 30;
const dryRun = process.argv.includes("--dry-run");

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    "Missing GOOGLE_APPLICATION_CREDENTIALS. Set it to the path of your service account JSON key.\n" +
      'Example: GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json" node scripts/cleanup-inactive-users.mjs'
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();
const auth = admin.auth();

async function main() {
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000);

  const snap = await db.collection("users").where("lastSeen", "<", cutoff).get();

  if (snap.empty) {
    console.log(`No accounts inactive for ${INACTIVE_DAYS}+ days. Nothing to do.`);
    return;
  }

  console.log(`Found ${snap.size} account(s) inactive for ${INACTIVE_DAYS}+ days:`);

  for (const docSnap of snap.docs) {
    const user = docSnap.data();
    const lastSeenStr = user.lastSeen?.toDate?.().toISOString() ?? "unknown";
    console.log(`  - ${user.displayName || docSnap.id} <${user.email || "no email"}> — last seen ${lastSeenStr}`);

    if (dryRun) continue;

    // Delete the Firestore profile doc.
    await docSnap.ref.delete();

    // Delete the Firebase Auth account too (so they can't just log back in).
    try {
      await auth.deleteUser(docSnap.id);
    } catch (err) {
      console.warn(`    (couldn't delete Auth account for ${docSnap.id}: ${err.message})`);
    }
  }

  console.log(dryRun ? "\nDry run complete — nobody was actually deleted." : "\nDone.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exit(1);
  });

/**
 * OPTIONAL: run this automatically every day.
 *
 * macOS/Linux (crontab -e), runs daily at 3am:
 *   0 3 * * * cd /path/to/project && GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json" /usr/local/bin/node scripts/cleanup-inactive-users.mjs >> cleanup.log 2>&1
 *
 * This only runs while your Mac is on. For a "set and forget" version that
 * runs in the cloud with no computer required, this same logic can be
 * moved into a Firebase Cloud Function with a scheduled (pubsub) trigger —
 * that requires upgrading the Firebase project to the Blaze (pay-as-you-go)
 * plan. Ask if you want that version instead.
 */

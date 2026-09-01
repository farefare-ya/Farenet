/**
 * Hashes a group password client-side with SHA-256 before it's ever sent to
 * Firestore, so the plaintext password never touches the database (only the
 * hash is stored on the chat document's `passwordHash` field).
 *
 * Note: this is "keep casual randoms out", not bank-grade security — anyone
 * with Firestore read access could still see the hash and brute-force a weak
 * password offline. That's an inherent limit of doing this without a backend.
 * It's fine for a group chat password gate; don't reuse it for anything more
 * sensitive.
 */
export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

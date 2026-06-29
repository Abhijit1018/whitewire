import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/** Returns the 32-byte master key from ENCRYPTION_KEY (base64). Throws if missing/invalid. */
export function getEncryptionKey(): Buffer {
  const b64 = process.env.ENCRYPTION_KEY;
  if (!b64) throw new Error("ENCRYPTION_KEY is not set");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must decode to 32 bytes");
  return key;
}

/** AES-256-GCM. Returns base64(iv):base64(authTag):base64(ciphertext). */
export function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

/** Reverses encrypt(); throws on tampering (auth tag) or malformed input. */
export function decrypt(blob: string, key: Buffer): string {
  const parts = blob.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted blob");
  const [ivB64, tagB64, ctB64] = parts;
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

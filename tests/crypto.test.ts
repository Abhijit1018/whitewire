import { describe, expect, it } from "vitest";
import { encrypt, decrypt, getEncryptionKey } from "@/core/ai/crypto";

const key = getEncryptionKey();

describe("crypto", () => {
  it("roundtrips plaintext", () => {
    const blob = encrypt("sk-secret-123", key);
    expect(blob).not.toContain("sk-secret-123");
    expect(decrypt(blob, key)).toBe("sk-secret-123");
  });

  it("produces a different ciphertext each time (random IV)", () => {
    expect(encrypt("same", key)).not.toBe(encrypt("same", key));
  });

  it("throws on a tampered blob", () => {
    const blob = encrypt("hello", key);
    const [iv, tag] = blob.split(":");
    const tampered = [iv, tag, Buffer.from("garbage").toString("base64")].join(":");
    expect(() => decrypt(tampered, key)).toThrow();
  });

  it("throws on a malformed blob", () => {
    expect(() => decrypt("not-a-valid-blob", key)).toThrow("Invalid encrypted blob");
  });

  it("getEncryptionKey throws when env is missing", () => {
    const prev = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    try {
      expect(() => getEncryptionKey()).toThrow("ENCRYPTION_KEY");
    } finally {
      process.env.ENCRYPTION_KEY = prev;
    }
  });
});

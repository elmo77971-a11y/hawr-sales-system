import { describe, expect, it } from "vitest";
import { createPasswordSalt, createSessionToken, hashPassword, hashSessionToken, passwordsMatch } from "./localAuthCrypto";

describe("local manager authentication primitives", () => {
  it("hashes passwords with unique salts and rejects incorrect credentials", () => {
    const salt = createPasswordSalt();
    const secondSalt = createPasswordSalt();
    const passwordHash = hashPassword("secret123", salt);
    expect(salt).not.toBe(secondSalt);
    expect(passwordHash).not.toBe("secret123");
    expect(passwordsMatch("secret123", salt, passwordHash)).toBe(true);
    expect(passwordsMatch("wrong-password", salt, passwordHash)).toBe(false);
  });

  it("stores only a one-way hash of session tokens", () => {
    const token = createSessionToken();
    expect(token.length).toBeGreaterThan(30);
    expect(hashSessionToken(token)).not.toContain(token);
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
  });
});

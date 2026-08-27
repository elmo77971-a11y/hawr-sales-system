import crypto from "node:crypto";

export const LOCAL_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
export const createPasswordSalt = () => crypto.randomBytes(16).toString("hex");
export const hashPassword = (password: string, salt: string) => crypto.scryptSync(password, salt, 64).toString("hex");
export const createSessionToken = () => crypto.randomBytes(32).toString("base64url");
export const hashSessionToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
export const passwordsMatch = (password: string, salt: string, expectedHash: string) => {
  const actual = Buffer.from(hashPassword(password, salt), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};

import { describe, expect, it } from "vitest";
import { createPasswordSalt, createSessionToken, hashPassword, hashSessionToken, passwordsMatch } from "./localAuthCrypto";
import { matchesLocalEmployee, matchesLocalManager } from "../shared/localAuth";

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

  it("matches manager and employee identity by username only", () => {
    const manager = { name: "مدير المعرض", username: "manager01", employeeCode: "manager01", role: "admin", isActive: true };
    const employee = { name: "أحمد علي", username: "ahmed01", employeeCode: "EMP001", role: "user", isActive: true };
    expect(matchesLocalManager(manager, "manager01")).toBe(true);
    expect(matchesLocalManager(manager, "wrong-user")).toBe(false);
    expect(matchesLocalEmployee(employee, "ahmed01")).toBe(true);
    expect(matchesLocalEmployee(employee, "EMP001")).toBe(false);
    expect(matchesLocalEmployee({ ...employee, isActive: false }, "ahmed01")).toBe(false);
    expect(matchesLocalEmployee(manager, "manager01")).toBe(false);
  });
});

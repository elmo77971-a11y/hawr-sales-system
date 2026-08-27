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

  it("matches manager and employee identity by name and code", () => {
    const manager = { name: "مدير المعرض", employeeCode: "MANAGER01", role: "admin", isActive: true };
    const employee = { name: "أحمد علي", employeeCode: "EMP001", role: "user", isActive: true };
    expect(matchesLocalManager(manager, "مدير المعرض", "MANAGER01")).toBe(true);
    expect(matchesLocalManager(manager, "مدير آخر", "MANAGER01")).toBe(false);
    expect(matchesLocalEmployee(employee, "أحمد علي", "EMP001")).toBe(true);
    expect(matchesLocalEmployee(employee, "أحمد علي", "WRONG")).toBe(false);
    expect(matchesLocalEmployee({ ...employee, isActive: false }, "أحمد علي", "EMP001")).toBe(false);
    expect(matchesLocalEmployee(manager, "مدير المعرض", "MANAGER01")).toBe(false);
  });
});

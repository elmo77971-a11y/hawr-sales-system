export type LocalAuthUser = {
  name?: string | null;
  username?: string | null;
  employeeCode?: string | null;
  role?: string | null;
  isActive?: boolean;
};

export function matchesLocalUsername(user: LocalAuthUser | null | undefined, username: string) {
  return Boolean(user && user.isActive !== false && user.username?.trim().toLowerCase() === username.trim().toLowerCase());
}

export function matchesLocalManager(user: LocalAuthUser | null | undefined, username: string) {
  return Boolean(user && user.isActive !== false && user.role === "admin" && matchesLocalUsername(user, username));
}

export function matchesLocalEmployee(user: LocalAuthUser | null | undefined, username: string) {
  return Boolean(user && user.isActive !== false && user.role !== "admin" && matchesLocalUsername(user, username));
}

export function canUseEmployeeCode(user: LocalAuthUser | null | undefined, employeeCode: string) {
  return Boolean(user && user.isActive !== false && user.role !== "admin" && user.employeeCode === employeeCode.trim());
}

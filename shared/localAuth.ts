export type LocalAuthUser = { name?: string | null; employeeCode?: string | null; role?: string | null; isActive?: boolean };

export function matchesLocalManager(user: LocalAuthUser | null | undefined, name: string, managerCode: string) {
  return Boolean(user && user.isActive !== false && user.role === "admin" && user.employeeCode === managerCode.trim() && user.name?.trim().toLowerCase() === name.trim().toLowerCase());
}

export function matchesLocalEmployee(user: LocalAuthUser | null | undefined, name: string, employeeCode: string) {
  return Boolean(user && user.isActive !== false && user.role !== "admin" && user.employeeCode === employeeCode.trim() && user.name?.trim().toLowerCase() === name.trim().toLowerCase());
}

export type UserRole = "admin" | "supervisor" | "user";
export type Permission = "sales" | "inventory" | "purchases" | "customers" | "reports" | "settings";

const userPermissions: Record<Permission, boolean> = { sales: true, inventory: false, purchases: false, customers: true, reports: false, settings: false };
export function can(role: UserRole, permission: Permission) { return role === "admin" || role === "supervisor" || userPermissions[permission]; }

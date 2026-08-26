export type UserRole = "admin" | "user";
export type Permission = "sales" | "inventory" | "purchases" | "customers" | "reports" | "settings";

const userPermissions: Record<Permission, boolean> = { sales: true, inventory: true, purchases: true, customers: true, reports: false, settings: false };
export function can(role: UserRole, permission: Permission) { return role === "admin" || userPermissions[permission]; }

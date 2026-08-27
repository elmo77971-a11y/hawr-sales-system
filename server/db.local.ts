import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let DatabaseCtor: any;
const loadDatabase = () => DatabaseCtor || (DatabaseCtor = require("better-sqlite3"));
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { purchaseRemovalDelta, purchaseStockDelta, purchaseUnitPrice, purchaseLocation } from "../shared/purchaseFlow";
import { assertEnoughStock, validateTransferLocations } from "../shared/inventory";
import { matchesLocalEmployee, matchesLocalManager } from "../shared/localAuth";
import { LOCAL_SESSION_TTL_MS, createPasswordSalt, createSessionToken, hashPassword, hashSessionToken, passwordsMatch } from "./localAuthCrypto";

let localDb: any = null;

const now = () => new Date().toISOString();
const dbPath = () => process.env.LOCAL_DB_PATH || path.join(process.cwd(), "data", "hawr-gallery.sqlite");

function getLocalDb() {
  if (localDb) return localDb;
  const filename = dbPath();
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  localDb = new (loadDatabase())(filename);
  localDb.pragma("journal_mode = WAL");
  localDb.pragma("foreign_keys = ON");
  localDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, openId TEXT NOT NULL UNIQUE, name TEXT, email TEXT,
      loginMethod TEXT, role TEXT NOT NULL DEFAULT 'user', employeeCode TEXT UNIQUE, isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, lastSignedIn TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS localAuth (
      id INTEGER PRIMARY KEY CHECK (id = 1), managerUserId INTEGER NOT NULL, managerCode TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL, passwordSalt TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS localSessions (
      tokenHash TEXT PRIMARY KEY, userId INTEGER NOT NULL, createdAt TEXT NOT NULL, expiresAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS localAuthEvents (
      id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, eventType TEXT NOT NULL,
      name TEXT, employeeCode TEXT, success INTEGER NOT NULL DEFAULT 1, reason TEXT, createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_localSessions_expiresAt ON localSessions(expiresAt);
    CREATE INDEX IF NOT EXISTS idx_localAuthEvents_createdAt ON localAuthEvents(createdAt);
    CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT, categoryId INTEGER, location TEXT NOT NULL DEFAULT 'المخزن', name TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'قطعة', sku TEXT NOT NULL UNIQUE, barcode TEXT UNIQUE, salePrice TEXT NOT NULL,
      costPrice TEXT NOT NULL DEFAULT '0', stockQty INTEGER NOT NULL DEFAULT 0, minStock INTEGER NOT NULL DEFAULT 0,
      isActive INTEGER NOT NULL DEFAULT 1, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, address TEXT, outstandingBalance TEXT NOT NULL DEFAULT '0', createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, balance TEXT NOT NULL DEFAULT '0', createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, category TEXT NOT NULL, amount TEXT NOT NULL, notes TEXT, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT, invoiceNo TEXT NOT NULL UNIQUE, customerId INTEGER, customerName TEXT, sellerId INTEGER, sellerCode TEXT,
      subtotal TEXT NOT NULL, paidAmount TEXT NOT NULL DEFAULT '0', paymentMethod TEXT NOT NULL DEFAULT 'cash', status TEXT NOT NULL DEFAULT 'paid', createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS saleItems (id INTEGER PRIMARY KEY AUTOINCREMENT, saleId INTEGER NOT NULL, productId INTEGER NOT NULL, quantity INTEGER NOT NULL, unitPrice TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS purchases (id INTEGER PRIMARY KEY AUTOINCREMENT, invoiceNo TEXT NOT NULL UNIQUE, supplierId INTEGER, movementType TEXT NOT NULL DEFAULT 'purchase', total TEXT NOT NULL, paidAmount TEXT NOT NULL DEFAULT '0', createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS purchaseItems (id INTEGER PRIMARY KEY AUTOINCREMENT, purchaseId INTEGER NOT NULL, productId INTEGER NOT NULL, productName TEXT NOT NULL, sku TEXT NOT NULL, unit TEXT NOT NULL DEFAULT 'قطعة', quantity INTEGER NOT NULL, unitPrice TEXT NOT NULL, total TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS installments (id INTEGER PRIMARY KEY AUTOINCREMENT, saleId INTEGER NOT NULL, customerId INTEGER NOT NULL, dueDate TEXT NOT NULL, amount TEXT NOT NULL, paidAmount TEXT NOT NULL DEFAULT '0', status TEXT NOT NULL DEFAULT 'pending', createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS installmentPayments (id INTEGER PRIMARY KEY AUTOINCREMENT, installmentId INTEGER NOT NULL, amount TEXT NOT NULL, paymentMethod TEXT NOT NULL DEFAULT 'cash', note TEXT, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS syncOperations (id INTEGER PRIMARY KEY AUTOINCREMENT, operationId TEXT NOT NULL UNIQUE, operationType TEXT NOT NULL, payload TEXT NOT NULL, createdAt TEXT NOT NULL, syncedAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS inventoryMovements (id INTEGER PRIMARY KEY AUTOINCREMENT, productId INTEGER NOT NULL, type TEXT NOT NULL, quantity INTEGER NOT NULL, referenceId INTEGER, note TEXT, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS inventoryTransfers (id INTEGER PRIMARY KEY AUTOINCREMENT, productId INTEGER NOT NULL, quantity INTEGER NOT NULL, fromLocation TEXT NOT NULL, toLocation TEXT NOT NULL, note TEXT, createdAt TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_products_location ON products(location);
    CREATE INDEX IF NOT EXISTS idx_sales_createdAt ON sales(createdAt);
    CREATE INDEX IF NOT EXISTS idx_purchases_createdAt ON purchases(createdAt);
  `);
  return localDb;
}

function transaction<T>(fn: (db: any) => T): T {
  const db = getLocalDb();
  db.exec("BEGIN");
  try { const result = fn(db); db.exec("COMMIT"); return result; }
  catch (error) { db.exec("ROLLBACK"); throw error; }
}

export async function getDb() { return getLocalDb(); }

const rowProduct = (row: any) => row ? { ...row, isActive: Boolean(row.isActive) } : row;
const rowsProducts = (rows: any[]) => rows.map(rowProduct);

export async function upsertUser(user: any): Promise<void> {
  const db = getLocalDb(); const timestamp = now();
  db.prepare(`INSERT INTO users (openId,name,email,loginMethod,role,employeeCode,isActive,createdAt,updatedAt,lastSignedIn)
    VALUES (@openId,@name,@email,@loginMethod,@role,@employeeCode,@isActive,@createdAt,@updatedAt,@lastSignedIn)
    ON CONFLICT(openId) DO UPDATE SET name=excluded.name,email=excluded.email,loginMethod=excluded.loginMethod,role=excluded.role,updatedAt=excluded.updatedAt,lastSignedIn=excluded.lastSignedIn`).run({
      openId: user.openId, name: user.name ?? null, email: user.email ?? null, loginMethod: user.loginMethod ?? "local",
      role: user.role ?? "admin", employeeCode: user.employeeCode ?? null, isActive: user.isActive === false ? 0 : 1,
      createdAt: timestamp, updatedAt: timestamp, lastSignedIn: user.lastSignedIn ? new Date(user.lastSignedIn).toISOString() : timestamp,
    });
}
export async function getUserByOpenId(openId: string) { return getLocalDb().prepare("SELECT * FROM users WHERE openId = ? LIMIT 1").get(openId); }

const publicUser = (row: any) => row ? { ...row, isActive: Boolean(row.isActive) } : null;

export async function getLocalAuthStatus() {
  const row: any = getLocalDb().prepare("SELECT managerCode FROM localAuth WHERE id = 1 LIMIT 1").get();
  return { configured: Boolean(row), managerCode: row?.managerCode || null };
}

export async function createLocalManager(input: { name: string; managerCode: string; password: string }) {
  const name = input.name.trim();
  const managerCode = input.managerCode.trim();
  if (name.length < 2) throw new Error("اسم المدير يجب أن يتكون من حرفين على الأقل");
  if (!/^[A-Za-z0-9_-]{3,40}$/.test(managerCode)) throw new Error("كود المدير يجب أن يكون 3 أحرف أو أرقام على الأقل وبالإنجليزية");
  if (input.password.length < 6) throw new Error("كلمة المرور يجب ألا تقل عن 6 أحرف");
  const result = transaction(db => {
    if (db.prepare("SELECT id FROM localAuth WHERE id = 1").get()) throw new Error("تم تسجيل المدير من قبل");
    const nowValue = now();
    const salt = createPasswordSalt();
    const userResult = db.prepare(`INSERT INTO users (openId,name,email,employeeCode,role,isActive,loginMethod,createdAt,updatedAt,lastSignedIn) VALUES (?,?,?,?,?,1,'local-password',?,?,?)`).run(`local-manager-${crypto.randomUUID()}`, name, null, managerCode, "admin", nowValue, nowValue, nowValue);
    const userId = Number(userResult.lastInsertRowid);
    db.prepare("INSERT INTO localAuth (id,managerUserId,managerCode,passwordHash,passwordSalt,createdAt,updatedAt) VALUES (1,?,?,?,?,?,?)").run(userId, managerCode, hashPassword(input.password, salt), salt, nowValue, nowValue);
    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + LOCAL_SESSION_TTL_MS).toISOString();
    db.prepare("INSERT INTO localSessions (tokenHash,userId,createdAt,expiresAt) VALUES (?,?,?,?)").run(hashSessionToken(token), userId, nowValue, expiresAt);
    return { token, userId };
  });
  return { token: result.token, user: publicUser(await getLocalUserById(result.userId)) };
}

export async function verifyLocalManagerPassword(password: string) { const auth: any = getLocalDb().prepare("SELECT passwordSalt,passwordHash FROM localAuth WHERE id = 1 LIMIT 1").get(); return Boolean(auth && password.length > 0 && passwordsMatch(password, auth.passwordSalt, auth.passwordHash)); }

export async function changeLocalManagerPassword(input: { oldPassword: string; newPassword: string }) {
  if (input.newPassword.length < 6) throw new Error("كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف");
  const db = getLocalDb();
  const auth: any = db.prepare("SELECT passwordSalt,passwordHash FROM localAuth WHERE id = 1 LIMIT 1").get();
  if (!auth || !passwordsMatch(input.oldPassword, auth.passwordSalt, auth.passwordHash)) throw new Error("كلمة المرور القديمة غير صحيحة");
  const passwordSalt = createPasswordSalt();
  db.prepare("UPDATE localAuth SET passwordHash = ?, passwordSalt = ?, updatedAt = ? WHERE id = 1").run(hashPassword(input.newPassword, passwordSalt), passwordSalt, now());
  return { success: true };
}

function recordAuthEvent(input: { userId?: number; eventType: "login" | "logout"; name?: string; employeeCode?: string; success?: boolean; reason?: string }) {
  getLocalDb().prepare("INSERT INTO localAuthEvents (userId,eventType,name,employeeCode,success,reason,createdAt) VALUES (?,?,?,?,?,?,?)").run(input.userId ?? null, input.eventType, input.name ?? null, input.employeeCode ?? null, input.success === false ? 0 : 1, input.reason ?? null, now());
}

export async function listLocalAuthEvents(limit = 200) {
  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
  return getLocalDb().prepare("SELECT e.id,e.userId,e.eventType,e.name,e.employeeCode,e.success,e.reason,e.createdAt,u.role FROM localAuthEvents e LEFT JOIN users u ON u.id = e.userId ORDER BY e.createdAt DESC LIMIT ?").all(safeLimit).map((row: any) => ({ ...row, success: Boolean(row.success) }));
}

export async function loginLocalManager(input: { name: string; managerCode: string; password: string }) {
  const db = getLocalDb();
  const auth: any = db.prepare("SELECT * FROM localAuth WHERE id = 1 LIMIT 1").get();
  if (!auth) throw new Error("لم يتم تسجيل مدير لهذا البرنامج بعد");
  const user: any = db.prepare("SELECT * FROM users WHERE id = ? AND isActive = 1 LIMIT 1").get(auth.managerUserId);
  if (!matchesLocalManager(user, input.name, input.managerCode) || !passwordsMatch(input.password, auth.passwordSalt, auth.passwordHash)) {
    recordAuthEvent({ eventType: "login", name: input.name, employeeCode: input.managerCode, success: false, reason: "بيانات المدير غير صحيحة" });
    throw new Error("اسم المدير أو كوده أو كلمة المرور غير صحيحة");
  }
  recordAuthEvent({ userId: user.id, eventType: "login", name: user.name, employeeCode: user.employeeCode, success: true });
  const token = createSessionToken();
  const timestamp = now();
  db.prepare("INSERT INTO localSessions (tokenHash,userId,createdAt,expiresAt) VALUES (?,?,?,?)").run(hashSessionToken(token), user.id, timestamp, new Date(Date.now() + LOCAL_SESSION_TTL_MS).toISOString());
  db.prepare("UPDATE users SET lastSignedIn = ?, updatedAt = ? WHERE id = ?").run(timestamp, timestamp, user.id);
  return { token, user: publicUser({ ...user, lastSignedIn: timestamp }) };
}

export async function loginLocalEmployee(input: { name: string; employeeCode: string }) {
  const name = input.name.trim();
  const employeeCode = input.employeeCode.trim();
  if (name.length < 2 || employeeCode.length < 1) throw new Error("اكتب اسم الموظف وكوده");
  const db = getLocalDb();
  const user: any = db.prepare("SELECT * FROM users WHERE employeeCode = ? AND lower(trim(name)) = lower(trim(?)) AND isActive = 1 LIMIT 1").get(employeeCode, name);
  if (!matchesLocalEmployee(user, name, employeeCode)) {
    recordAuthEvent({ eventType: "login", name, employeeCode, success: false, reason: "اسم الموظف أو الكود غير صحيح" });
    throw new Error("اسم الموظف أو الكود غير صحيح");
  }
  recordAuthEvent({ userId: user.id, eventType: "login", name: user.name, employeeCode: user.employeeCode, success: true });
  const token = createSessionToken();
  const timestamp = now();
  db.prepare("INSERT INTO localSessions (tokenHash,userId,createdAt,expiresAt) VALUES (?,?,?,?)").run(hashSessionToken(token), user.id, timestamp, new Date(Date.now() + LOCAL_SESSION_TTL_MS).toISOString());
  db.prepare("UPDATE users SET lastSignedIn = ?, updatedAt = ? WHERE id = ?").run(timestamp, timestamp, user.id);
  return { token, user: publicUser({ ...user, lastSignedIn: timestamp }) };
}

export async function getLocalUserById(id: number) { return getLocalDb().prepare("SELECT * FROM users WHERE id = ? AND isActive = 1 LIMIT 1").get(id); }
export async function getLocalUserBySession(token: string | undefined) {
  if (!token) return null;
  const db = getLocalDb();
  const row: any = db.prepare("SELECT u.* , s.expiresAt AS sessionExpiresAt FROM localSessions s INNER JOIN users u ON u.id = s.userId WHERE s.tokenHash = ? AND u.isActive = 1 LIMIT 1").get(hashSessionToken(token));
  if (!row) return null;
  if (new Date(row.sessionExpiresAt).getTime() <= Date.now()) { db.prepare("DELETE FROM localSessions WHERE tokenHash = ?").run(hashSessionToken(token)); return null; }
  const { sessionExpiresAt: _sessionExpiresAt, ...user } = row;
  return publicUser(user);
}
export async function logoutLocalUser(token: string | undefined) {
  if (!token) return;
  const db = getLocalDb();
  const sessionHash = hashSessionToken(token);
  const row: any = db.prepare("SELECT s.userId,u.name,u.employeeCode FROM localSessions s INNER JOIN users u ON u.id = s.userId WHERE s.tokenHash = ? LIMIT 1").get(sessionHash);
  if (row) recordAuthEvent({ userId: row.userId, eventType: "logout", name: row.name, employeeCode: row.employeeCode, success: true });
  db.prepare("DELETE FROM localSessions WHERE tokenHash = ?").run(sessionHash);
}
export async function deleteLocalSession(token: string | undefined) { await logoutLocalUser(token); }

export async function listEmployees() { return getLocalDb().prepare("SELECT id,name,email,employeeCode,role,isActive,createdAt FROM users ORDER BY createdAt DESC").all().map((row: any) => ({ ...row, isActive: Boolean(row.isActive) })); }
export async function createEmployee(input: { name: string; email?: string; employeeCode: string; role?: "user" | "admin" }) {
  if (input.role === "admin") throw new Error("لا يمكن إنشاء مدير إضافي من شاشة الموظفين المحلية");
  const timestamp = now(); const result = getLocalDb().prepare(`INSERT INTO users (openId,name,email,employeeCode,role,isActive,loginMethod,createdAt,updatedAt,lastSignedIn) VALUES (?,?,?,?,?,1,'employee-code',?,?,?)`).run(`employee-${input.employeeCode}-${Date.now()}`, input.name, input.email || null, input.employeeCode, input.role || "user", timestamp, timestamp, timestamp);
  return { success: true, id: Number(result.lastInsertRowid) };
}
export async function resetEmployeeCode(id: number) {
  const db = getLocalDb();
  const user: any = db.prepare("SELECT id,role FROM users WHERE id = ? LIMIT 1").get(id);
  if (!user) throw new Error("الموظف غير موجود");
  if (user.role === "admin") throw new Error("لا يمكن إعادة تعيين code المدير من شاشة الموظفين");
  let newCode = "";
  do { newCode = `EMP-${crypto.randomBytes(3).toString("hex").toUpperCase()}`; } while (db.prepare("SELECT id FROM users WHERE employeeCode = ? LIMIT 1").get(newCode));
  db.prepare("UPDATE users SET employeeCode = ?, updatedAt = ? WHERE id = ?").run(newCode, now(), id);
  return { success: true, employeeCode: newCode };
}

export async function updateEmployee(id: number, input: { name?: string; email?: string; employeeCode?: string; role?: "user" | "admin"; isActive?: boolean }) {
  const fields: string[] = []; const values: unknown[] = [];
  for (const key of ["name", "email", "employeeCode", "role"] as const) if (input[key] !== undefined) { fields.push(`${key} = ?`); values.push(input[key] || null); }
  if (input.isActive !== undefined) { fields.push("isActive = ?"); values.push(input.isActive ? 1 : 0); }
  if (fields.length) getLocalDb().prepare(`UPDATE users SET ${fields.join(", ")}, updatedAt = ? WHERE id = ?`).run(...values, now(), id);
  return { success: true };
}
export async function listCategories() { return getLocalDb().prepare("SELECT * FROM categories ORDER BY createdAt DESC").all(); }
export async function createCategory(name: string) { const result = getLocalDb().prepare("INSERT INTO categories (name,createdAt) VALUES (?,?)").run(name, now()); return { success: true, id: Number(result.lastInsertRowid) }; }
export async function updateCategory(id: number, name: string) { getLocalDb().prepare("UPDATE categories SET name = ? WHERE id = ?").run(name, id); return { success: true }; }
export async function deleteCategory(id: number) { getLocalDb().prepare("DELETE FROM categories WHERE id = ?").run(id); return { success: true }; }
export async function listProducts() { return rowsProducts(getLocalDb().prepare("SELECT * FROM products WHERE isActive = 1 ORDER BY createdAt DESC").all() as any[]); }
export async function listInventoryMovements() { return getLocalDb().prepare("SELECT * FROM inventoryMovements ORDER BY createdAt DESC").all(); }
export async function transferInventory(input: { productId: number; quantity: number; fromLocation: string; toLocation: string; note?: string }) {
  try { validateTransferLocations(input.fromLocation, input.toLocation); } catch { throw new Error("يجب اختيار مكانين مختلفين للنقل"); }
  return transaction(db => {
    const product: any = db.prepare("SELECT * FROM products WHERE id = ? AND isActive = 1 LIMIT 1").get(input.productId);
    if (!product || product.location !== input.fromLocation) throw new Error("المنتج غير موجود في المكان المصدر");
    try { assertEnoughStock(product.stockQty, input.quantity); } catch { throw new Error("الكمية المطلوبة أكبر من رصيد المكان المصدر"); }
    const timestamp = now(); const transfer = db.prepare("INSERT INTO inventoryTransfers (productId,quantity,fromLocation,toLocation,note,createdAt) VALUES (?,?,?,?,?,?)").run(input.productId, input.quantity, input.fromLocation, input.toLocation, input.note || null, timestamp);
    const transferId = Number(transfer.lastInsertRowid);
    db.prepare("UPDATE products SET stockQty = stockQty - ?, updatedAt = ? WHERE id = ?").run(input.quantity, timestamp, input.productId);
    db.prepare("INSERT INTO inventoryMovements (productId,type,quantity,referenceId,note,createdAt) VALUES (?,?,?,?,?,?)").run(input.productId, "transfer", -input.quantity, transferId, `نقل من ${input.fromLocation} إلى ${input.toLocation}`, timestamp);
    db.prepare("UPDATE products SET location = ?, stockQty = stockQty + ?, updatedAt = ? WHERE id = ?").run(input.toLocation, input.quantity, timestamp, input.productId);
    db.prepare("INSERT INTO inventoryMovements (productId,type,quantity,referenceId,note,createdAt) VALUES (?,?,?,?,?,?)").run(input.productId, "transfer", input.quantity, transferId, `وصول إلى ${input.toLocation} من ${input.fromLocation}`, timestamp);
    return { success: true, transferId };
  });
}
export async function listInstallments() { return getLocalDb().prepare("SELECT * FROM installments ORDER BY dueDate DESC").all(); }
export async function adjustInventory(input: { productId: number; quantity: number; note?: string }) { return transaction(db => { const timestamp = now(); db.prepare("UPDATE products SET stockQty = stockQty + ?, updatedAt = ? WHERE id = ?").run(input.quantity, timestamp, input.productId); db.prepare("INSERT INTO inventoryMovements (productId,type,quantity,note,createdAt) VALUES (?,?,?,?,?)").run(input.productId, "adjustment", input.quantity, input.note || null, timestamp); return { success: true }; }); }
export async function listCustomers() { return getLocalDb().prepare("SELECT * FROM customers ORDER BY createdAt DESC").all(); }
export async function listSuppliers() { return getLocalDb().prepare("SELECT * FROM suppliers ORDER BY createdAt DESC").all(); }
export async function listExpenses() { return getLocalDb().prepare("SELECT * FROM expenses ORDER BY createdAt DESC").all(); }
export async function listSales() { return getLocalDb().prepare(`SELECT s.*, GROUP_CONCAT(DISTINCT p.location) AS locations FROM sales s LEFT JOIN saleItems si ON si.saleId=s.id LEFT JOIN products p ON p.id=si.productId GROUP BY s.id ORDER BY s.createdAt DESC`).all(); }
export async function getSalesByEmployee(filters: { from?: Date; to?: Date } = {}) { const db = getLocalDb(); const conditions: string[] = []; const values: unknown[] = []; if (filters.from) { conditions.push("s.createdAt>=?"); values.push(filters.from.toISOString()); } if (filters.to) { conditions.push("s.createdAt<=?"); values.push(filters.to.toISOString()); } const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""; const rows = db.prepare(`SELECT COALESCE(s.sellerId, 0) AS sellerId, COALESCE(s.sellerCode, 'غير محدد') AS sellerCode, COALESCE(u.name, 'موظف غير مسجل') AS sellerName, COUNT(s.id) AS invoiceCount, COALESCE(SUM(CAST(s.subtotal AS REAL)), 0) AS totalSales, COALESCE(SUM(CAST(s.paidAmount AS REAL)), 0) AS totalPaid, COALESCE(SUM(CAST(s.subtotal AS REAL) - CAST(s.paidAmount AS REAL)), 0) AS totalDue FROM sales s LEFT JOIN users u ON u.id=s.sellerId ${where} GROUP BY s.sellerId, s.sellerCode, u.name ORDER BY totalSales DESC`).all(...values) as any[]; return rows.map(row => ({ sellerId: Number(row.sellerId), sellerCode: String(row.sellerCode), sellerName: String(row.sellerName), invoiceCount: Number(row.invoiceCount), totalSales: Number(row.totalSales), totalPaid: Number(row.totalPaid), totalDue: Number(row.totalDue) })); }
export async function getSaleDetails(id: number) { const sale = getLocalDb().prepare("SELECT * FROM sales WHERE id = ? LIMIT 1").get(id); if (!sale) return null; const items = getLocalDb().prepare("SELECT si.productId,p.name,p.location,p.unit,si.quantity,si.unitPrice FROM saleItems si INNER JOIN products p ON p.id=si.productId WHERE si.saleId=?").all(id); return { sale, items }; }
export async function listPurchaseItems() { return getLocalDb().prepare(`SELECT pi.*, p.invoiceNo, p.movementType, p.createdAt FROM purchaseItems pi INNER JOIN purchases p ON p.id=pi.purchaseId ORDER BY p.createdAt DESC`).all(); }
export async function updatePurchaseItem(id: number, input: { quantity: number; unitPrice: string }) { return transaction(db => { const item: any = db.prepare("SELECT * FROM purchaseItems WHERE id=? LIMIT 1").get(id); if (!item) throw new Error("حركة التوريد غير موجودة أو تم حذفها مسبقًا"); const delta = purchaseStockDelta(item.quantity, input.quantity); const product: any = db.prepare("SELECT * FROM products WHERE id=? LIMIT 1").get(item.productId); if (delta < 0 && (!product || product.stockQty < -delta)) throw new Error("الكمية الحالية في المخزون لا تسمح بالتعديل"); const timestamp = now(); db.prepare("UPDATE products SET stockQty=stockQty+?,updatedAt=? WHERE id=?").run(delta, timestamp, item.productId); db.prepare("UPDATE purchaseItems SET quantity=?,unitPrice=?,total=? WHERE id=?").run(input.quantity, input.unitPrice, (input.quantity * Number(input.unitPrice)).toFixed(2), id); db.prepare("INSERT INTO inventoryMovements (productId,type,quantity,referenceId,note,createdAt) VALUES (?,?,?,?,?,?)").run(item.productId, "adjustment", delta, item.purchaseId, `تعديل حركة توريد ${id}`, timestamp); return { success: true }; }); }
export async function deletePurchaseItem(id: number) { return transaction(db => { const item: any = db.prepare("SELECT * FROM purchaseItems WHERE id=? LIMIT 1").get(id); if (!item) throw new Error("حركة التوريد غير موجودة أو تم حذفها مسبقًا"); const product: any = db.prepare("SELECT * FROM products WHERE id=? LIMIT 1").get(item.productId); if (!product || product.stockQty < item.quantity) throw new Error("الكمية الحالية في المخزون لا تسمح بالحذف"); const timestamp = now(); db.prepare("UPDATE products SET stockQty=stockQty-?,updatedAt=? WHERE id=?").run(item.quantity, timestamp, item.productId); db.prepare("DELETE FROM purchaseItems WHERE id=?").run(id); db.prepare("INSERT INTO inventoryMovements (productId,type,quantity,referenceId,note,createdAt) VALUES (?,?,?,?,?,?)").run(item.productId, "adjustment", purchaseRemovalDelta(item.quantity), item.purchaseId, `حذف حركة توريد ${id}`, timestamp); return { success: true }; }); }
export async function createProduct(input: { name: string; sku: string; barcode?: string; unit?: string; location?: string; salePrice: string; costPrice?: string; stockQty?: number; minStock?: number; categoryId?: number }) { const timestamp = now(); const result = getLocalDb().prepare(`INSERT INTO products (name,sku,barcode,unit,location,salePrice,costPrice,stockQty,minStock,categoryId,isActive,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,1,?,?)`).run(input.name, input.sku, input.barcode || null, input.unit || "قطعة", input.location || "المخزن", input.salePrice, input.costPrice || "0", input.stockQty || 0, input.minStock || 0, input.categoryId || null, timestamp, timestamp); return { success: true, id: Number(result.lastInsertRowid) }; }
export async function createCustomer(input: { name: string; phone?: string; address?: string }) { const result = getLocalDb().prepare("INSERT INTO customers (name,phone,address,outstandingBalance,createdAt) VALUES (?,?,?, '0', ?)").run(input.name, input.phone || null, input.address || null, now()); return { success: true, id: Number(result.lastInsertRowid) }; }
export async function createSupplier(input: { name: string; phone?: string }) { const result = getLocalDb().prepare("INSERT INTO suppliers (name,phone,balance,createdAt) VALUES (?,?, '0', ?)").run(input.name, input.phone || null, now()); return { success: true, id: Number(result.lastInsertRowid) }; }
export async function createExpense(input: { title: string; category: string; amount: string; notes?: string }) { const result = getLocalDb().prepare("INSERT INTO expenses (title,category,amount,notes,createdAt) VALUES (?,?,?,?,?)").run(input.title, input.category, input.amount, input.notes || null, now()); return { success: true, id: Number(result.lastInsertRowid) }; }
export async function updateProduct(id: number, input: Record<string, unknown>) { const allowed = ["name", "sku", "barcode", "unit", "location", "salePrice", "costPrice", "stockQty", "minStock", "categoryId"]; const entries = Object.entries(input).filter(([key, value]) => allowed.includes(key) && value !== undefined); if (entries.length) { const sets = entries.map(([key]) => `${key} = ?`).join(", "); getLocalDb().prepare(`UPDATE products SET ${sets}, updatedAt = ? WHERE id = ?`).run(...entries.map(([, value]) => value ?? null), now(), id); } return { success: true }; }
export async function deleteProduct(id: number) { getLocalDb().prepare("UPDATE products SET isActive=0,updatedAt=? WHERE id=?").run(now(), id); return { success: true }; }
export async function updateCustomer(id: number, input: Record<string, unknown>) { const entries = Object.entries(input).filter(([, value]) => value !== undefined); if (entries.length) getLocalDb().prepare(`UPDATE customers SET ${entries.map(([key]) => `${key}=?`).join(", ")} WHERE id=?`).run(...entries.map(([, value]) => value ?? null), id); return { success: true }; }
export async function deleteCustomer(id: number) { getLocalDb().prepare("DELETE FROM customers WHERE id=?").run(id); return { success: true }; }
export async function updateSupplier(id: number, input: Record<string, unknown>) { const entries = Object.entries(input).filter(([, value]) => value !== undefined); if (entries.length) getLocalDb().prepare(`UPDATE suppliers SET ${entries.map(([key]) => `${key}=?`).join(", ")} WHERE id=?`).run(...entries.map(([, value]) => value ?? null), id); return { success: true }; }
export async function deleteSupplier(id: number) { getLocalDb().prepare("DELETE FROM suppliers WHERE id=?").run(id); return { success: true }; }
export async function deleteExpense(id: number) { getLocalDb().prepare("DELETE FROM expenses WHERE id=?").run(id); return { success: true }; }
export async function recordSyncOperations(operations: { id: string; type: string; payload: unknown; createdAt: number }[]) { const db = getLocalDb(); const stmt = db.prepare("INSERT OR IGNORE INTO syncOperations (operationId,operationType,payload,createdAt,syncedAt) VALUES (?,?,?,?,?)"); const accepted: string[] = []; for (const operation of operations) { const timestamp = now(); const result = stmt.run(operation.id, operation.type, JSON.stringify(operation.payload), new Date(operation.createdAt).toISOString(), timestamp); if (result.changes) accepted.push(operation.id); } return accepted; }
export async function getDailySummary(filters: { from: Date; to: Date }) { const db = getLocalDb(); const from = filters.from.toISOString(); const to = filters.to.toISOString(); const sales = db.prepare("SELECT COALESCE(SUM(CAST(subtotal AS REAL)),0) value, COUNT(*) count FROM sales WHERE createdAt>=? AND createdAt<=?").get(from, to) as any; const returns = db.prepare("SELECT COALESCE(SUM(CAST(total AS REAL)),0) value, COUNT(*) count FROM purchases WHERE movementType='return' AND createdAt>=? AND createdAt<=?").get(from, to) as any; const salesQuantity = db.prepare("SELECT COALESCE(SUM(si.quantity),0) value FROM saleItems si INNER JOIN sales s ON s.id=si.saleId WHERE s.createdAt>=? AND s.createdAt<=?").get(from, to) as any; const returnsQuantity = db.prepare("SELECT COALESCE(SUM(pi.quantity),0) value FROM purchaseItems pi INNER JOIN purchases p ON p.id=pi.purchaseId WHERE p.movementType='return' AND p.createdAt>=? AND p.createdAt<=?").get(from, to) as any; return { sales: Number(sales.value), salesCount: Number(sales.count), salesQuantity: Number(salesQuantity.value), returns: Number(returns.value), returnsCount: Number(returns.count), returnsQuantity: Number(returnsQuantity.value) }; }
export async function getReportSummary(filters: { from?: Date; to?: Date; sellerId?: number } = {}) { const db = getLocalDb(); const conditions: string[] = []; const values: unknown[] = []; if (filters.from) { conditions.push("createdAt>=?"); values.push(filters.from.toISOString()); } if (filters.to) { conditions.push("createdAt<=?"); values.push(filters.to.toISOString()); } let saleQuery = "SELECT COALESCE(SUM(CAST(subtotal AS REAL)),0) value FROM sales"; if (filters.sellerId) { conditions.push("sellerId=?"); values.push(filters.sellerId); } if (conditions.length) saleQuery += ` WHERE ${conditions.join(" AND ")}`; const sales = db.prepare(saleQuery).get(...values) as any; const expenseConditions: string[] = []; const expenseValues: unknown[] = []; if (filters.from) { expenseConditions.push("createdAt>=?"); expenseValues.push(filters.from.toISOString()); } if (filters.to) { expenseConditions.push("createdAt<=?"); expenseValues.push(filters.to.toISOString()); } const expenseQuery = `SELECT COALESCE(SUM(CAST(amount AS REAL)),0) value FROM expenses${expenseConditions.length ? ` WHERE ${expenseConditions.join(" AND ")}` : ""}`; const expenses = db.prepare(expenseQuery).get(...expenseValues) as any; const stock = db.prepare("SELECT COALESCE(SUM(stockQty * CAST(costPrice AS REAL)),0) value FROM products WHERE isActive=1").get() as any; const installments = db.prepare("SELECT COALESCE(SUM(CAST(amount AS REAL)-CAST(paidAmount AS REAL)),0) value FROM installments WHERE status <> 'paid'").get() as any; return { sales: Number(sales.value), expenses: Number(expenses.value), profit: Number(sales.value)-Number(expenses.value), stockValue: Number(stock.value), installmentsDue: Number(installments.value) }; }
export async function createSale(input: { invoiceNo: string; customerId?: number; customerName?: string; sellerId?: number; sellerCode?: string; paidAmount: string; paymentMethod: "cash" | "card" | "transfer" | "installment"; items: { productId: number; quantity: number; unitPrice: string }[] }) { const total = input.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0); const status = Number(input.paidAmount) >= total ? "paid" : Number(input.paidAmount) > 0 ? "partial" : "unpaid"; return transaction(db => { for (const item of input.items) { const product: any = db.prepare("SELECT * FROM products WHERE id=? AND isActive=1 LIMIT 1").get(item.productId); if (!product || product.stockQty < item.quantity) throw new Error("الكمية المطلوبة أكبر من الرصيد المتاح في المخزون"); } const timestamp = now(); const result = db.prepare("INSERT INTO sales (invoiceNo,customerId,customerName,sellerId,sellerCode,subtotal,paidAmount,paymentMethod,status,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)").run(input.invoiceNo, input.customerId || null, input.customerName || null, input.sellerId || null, input.sellerCode || null, total.toFixed(2), input.paidAmount, input.paymentMethod, status, timestamp); const saleId = Number(result.lastInsertRowid); for (const item of input.items) { db.prepare("INSERT INTO saleItems (saleId,productId,quantity,unitPrice) VALUES (?,?,?,?)").run(saleId, item.productId, item.quantity, item.unitPrice); db.prepare("UPDATE products SET stockQty=stockQty-?,updatedAt=? WHERE id=?").run(item.quantity, timestamp, item.productId); db.prepare("INSERT INTO inventoryMovements (productId,type,quantity,referenceId,note,createdAt) VALUES (?,?,?,?,?,?)").run(item.productId, "sale", -item.quantity, saleId, `فاتورة بيع ${input.invoiceNo}`, timestamp); } if (input.paymentMethod === "installment" && input.customerId && total > Number(input.paidAmount)) db.prepare("INSERT INTO installments (saleId,customerId,dueDate,amount,paidAmount,status,createdAt) VALUES (?,?,?,?,?,'pending',?)").run(saleId, input.customerId, new Date(Date.now() + 30 * 86400000).toISOString(), (total-Number(input.paidAmount)).toFixed(2), "0", timestamp); return { saleId, total: total.toFixed(2), status }; }); }
export async function createPurchase(input: { invoiceNo: string; movementType?: "purchase" | "return"; supplierId?: number; paidAmount: string; items: { productId?: number; quantity: number; unitPrice: string; unit?: string; location?: string; product?: { name: string; sku: string; barcode?: string; unit?: string; location?: string; salePrice?: string; minStock?: number } }[] }) { return transaction(db => { const requestedTotal = input.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0); const timestamp = now(); const result = db.prepare("INSERT INTO purchases (invoiceNo,supplierId,movementType,total,paidAmount,createdAt) VALUES (?,?,?,?,?,?)").run(input.invoiceNo, input.supplierId || null, input.movementType || "purchase", requestedTotal.toFixed(2), input.paidAmount, timestamp); const purchaseId = Number(result.lastInsertRowid); let total = 0; for (const item of input.items) { let product: any = item.productId ? db.prepare("SELECT * FROM products WHERE id=? LIMIT 1").get(item.productId) : undefined; if (!product && item.product) product = db.prepare("SELECT * FROM products WHERE sku=? OR (? IS NOT NULL AND barcode=?) LIMIT 1").get(item.product.sku, item.product.barcode || null, item.product.barcode || null); let productId = product?.id; if (!product && item.product) { const created = db.prepare("INSERT INTO products (name,sku,barcode,unit,location,salePrice,costPrice,stockQty,minStock,isActive,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,1,?,?)").run(item.product.name, item.product.sku, item.product.barcode || null, item.unit || item.product.unit || "قطعة", purchaseLocation(item.location || item.product.location), item.product.salePrice || item.unitPrice, item.unitPrice, item.quantity, item.product.minStock || 0, timestamp, timestamp); productId = Number(created.lastInsertRowid); product = { id: productId, name: item.product.name, sku: item.product.sku, unit: item.unit || item.product.unit || "قطعة", salePrice: item.product.salePrice || item.unitPrice, location: purchaseLocation(item.location || item.product.location) }; } else if (product && productId) { db.prepare("UPDATE products SET stockQty=stockQty+?,costPrice=?,unit=COALESCE(?,unit),location=COALESCE(?,location),updatedAt=? WHERE id=?").run(item.quantity, item.unitPrice, item.unit || null, item.location ? purchaseLocation(item.location) : null, timestamp, productId); product = { ...product, unit: item.unit || product.unit, location: purchaseLocation(item.location || product.location) }; } if (!productId || !product) throw new Error("بيانات الصنف مطلوبة لإتمام التوريد"); const effectiveUnitPrice = purchaseUnitPrice(input.movementType, product.salePrice, item.unitPrice); total += Number(effectiveUnitPrice) * item.quantity; db.prepare("INSERT INTO purchaseItems (purchaseId,productId,productName,sku,unit,quantity,unitPrice,total) VALUES (?,?,?,?,?,?,?,?)").run(purchaseId, productId, product.name, product.sku, item.unit || product.unit || "قطعة", item.quantity, effectiveUnitPrice, (Number(effectiveUnitPrice)*item.quantity).toFixed(2)); db.prepare("INSERT INTO inventoryMovements (productId,type,quantity,referenceId,note,createdAt) VALUES (?,?,?,?,?,?)").run(productId, input.movementType === "return" ? "return" : "purchase", item.quantity, purchaseId, input.movementType === "return" ? `توريد مرتجع ${input.invoiceNo}` : `توريد أصناف ${input.invoiceNo}`, timestamp); } db.prepare("UPDATE purchases SET total=? WHERE id=?").run(total.toFixed(2), purchaseId); return { purchaseId, total: total.toFixed(2) }; }); }
export async function recordInstallmentPayment(input: { installmentId: number; amount: string; paymentMethod: "cash" | "card" | "transfer"; note?: string }) { return transaction(db => { const timestamp = now(); db.prepare("INSERT INTO installmentPayments (installmentId,amount,paymentMethod,note,createdAt) VALUES (?,?,?,?,?)").run(input.installmentId, input.amount, input.paymentMethod, input.note || null, timestamp); const installment: any = db.prepare("SELECT * FROM installments WHERE id=? LIMIT 1").get(input.installmentId); if (!installment) throw new Error("Installment not found"); const paid = Number(installment.paidAmount) + Number(input.amount); const status = paid >= Number(installment.amount) ? "paid" : "partial"; db.prepare("UPDATE installments SET paidAmount=?,status=? WHERE id=?").run(paid.toFixed(2), status, input.installmentId); return { paidAmount: paid.toFixed(2), status }; }); }

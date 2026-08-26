import { Pencil, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchProducts } from "../../../shared/inventorySearch";
import { isLowStock } from "../../../shared/inventoryAlerts";

export type InventoryProduct = { id: number; name: string; sku: string; barcode?: string | null; unit?: string; salePrice: string; stockQty: number; minStock?: number };

export function InventoryTable({ products, search, loading = false, error, onSearch, onEdit }: { products: InventoryProduct[]; search: string; loading?: boolean; error?: unknown; onSearch: (value: string) => void; onEdit: (product: InventoryProduct) => void }) {
  const filtered = searchProducts(products, search);
  if (loading) return <section className="border-0 bg-white p-12 text-center text-sm text-slate-500">جاري تحميل المنتجات والمخزون...</section>;
  if (error) return <section className="border-2 border-red-200 bg-red-50 p-12 text-center text-sm text-red-700">تعذر تحميل المنتجات. تحقق من الاتصال ثم أعد المحاولة.</section>;
  return <section className="border-0 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
    <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"><div><h3 className="font-black">قائمة المنتجات والمخزون</h3><p className="text-xs text-slate-400 mt-1">{filtered.length} من {products.length} منتج</p></div><div className="flex items-center gap-2 bg-slate-100 px-3 h-10 w-full md:w-80"><Search size={16} className="text-slate-400"/><Input value={search} onChange={event => onSearch(event.target.value)} placeholder="ابحث بالاسم أو الكود أو الباركود" className="border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 text-sm"/></div></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-right"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-4">اسم المنتج</th><th className="p-4">الكود</th><th className="p-4">الوحدة</th><th className="p-4">العدد</th><th className="p-4">السعر</th><th className="p-4">الحالة</th><th className="p-4">إجراء</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(product => <tr key={product.id} className="text-sm"><td className="p-4 font-bold">{product.name}<span className="block text-xs text-slate-400 mt-1">{product.barcode || "بدون باركود"}</span></td><td className="p-4 font-mono text-xs" dir="ltr">{product.sku}</td><td className="p-4">{product.unit || "قطعة"}</td><td className="p-4 font-bold">{product.stockQty}</td><td className="p-4 font-bold">{Number(product.salePrice).toLocaleString("ar-EG")} ج.م</td><td className="p-4">{isLowStock(product.stockQty, product.minStock || 0) ? <span className="inline-flex bg-red-100 text-red-700 px-2 py-1 text-xs font-bold">مخزون منخفض</span> : <span className="text-xs text-green-700">متوفر</span>}</td><td className="p-4"><Button variant="outline" onClick={() => onEdit(product)} className="rounded-none gap-2"><Pencil size={14}/> تعديل</Button></td></tr>)}{!filtered.length && <tr><td colSpan={7} className="p-12 text-center text-sm text-slate-400">لا توجد منتجات مطابقة للبحث.</td></tr>}</tbody></table></div>
  </section>;
}

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft, ArrowUpLeft, BarChart3, Bell, Boxes, CalendarDays,
  ChevronDown, CircleDollarSign, ClipboardList, CreditCard, FileText,
  LayoutDashboard, Menu, Package, Plus, Search, Settings2, ShoppingCart,
  Truck, Users, WalletCards, X, Wifi, WifiOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { clearPendingOperations, enqueueOperation, readPendingOperations } from "../../../shared/offline";
import { loadLocalCollection, saveLocalCollection, type LocalEntity, type LocalStoreKey } from "../../../shared/localStore";
import { trpc } from "@/lib/trpc";

type NavKey = "dashboard" | "sales" | "inventory" | "purchases" | "customers" | "suppliers" | "expenses" | "reports";
const navItems: {key: NavKey; label: string; icon: typeof LayoutDashboard}[] = [
  { key: "dashboard", label: "نظرة عامة", icon: LayoutDashboard },
  { key: "sales", label: "المبيعات والفواتير", icon: ShoppingCart },
  { key: "inventory", label: "المخزون والمنتجات", icon: Boxes },
  { key: "purchases", label: "المشتريات", icon: ClipboardList },
  { key: "customers", label: "العملاء والأقساط", icon: Users },
  { key: "suppliers", label: "الموردون", icon: Truck },
  { key: "expenses", label: "المصروفات", icon: WalletCards },
  { key: "reports", label: "التقارير", icon: BarChart3 },
];

const productSeed = [
  { name: "غسالة LG أوتوماتيك", sku: "LG-9KG-2025", category: "غسالات", stock: 12, price: "24,500 ج.م", tone: "bg-red-50 text-red-700" },
  { name: "ثلاجة Samsung نوفروست", sku: "SAM-520L", category: "ثلاجات", stock: 7, price: "38,900 ج.م", tone: "bg-blue-50 text-blue-700" },
  { name: "بوتاجاز فريش 5 شعلة", sku: "FR-5B-INOX", category: "بوتاجازات", stock: 18, price: "13,750 ج.م", tone: "bg-amber-50 text-amber-700" },
  { name: "تكييف Sharp 1.5 حصان", sku: "SH-1.5HP", category: "تكييفات", stock: 3, price: "29,990 ج.م", tone: "bg-violet-50 text-violet-700" },
];

function StatCard({ label, value, note, icon: Icon, accent }: {label:string; value:string; note:string; icon: typeof CircleDollarSign; accent:string}) {
  return <Card className="border-0 shadow-[0_12px_35px_rgba(15,23,42,0.06)] rounded-none overflow-hidden">
    <CardContent className="p-5 relative">
      <div className={cn("absolute top-0 right-0 h-1 w-full", accent)} />
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs text-slate-500 mb-3">{label}</p><p className="text-2xl font-black tracking-tight text-slate-950">{value}</p><p className="text-xs text-slate-500 mt-2">{note}</p></div>
        <div className="h-10 w-10 bg-slate-950 text-white flex items-center justify-center"><Icon size={19} /></div>
      </div>
    </CardContent>
  </Card>;
}

export default function Home() {
  const [active, setActive] = useState<NavKey>("dashboard");
  const [search, setSearch] = useState("");
  const [showQuick, setShowQuick] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const { data: currentUser } = trpc.auth.me.useQuery();
  const { data: remoteProducts } = trpc.catalog.products.useQuery(undefined, { enabled: Boolean(currentUser && isOnline) });
  const { data: remoteSummary } = trpc.reports.summary.useQuery(undefined, { enabled: Boolean(currentUser && isOnline) });
  const syncMutation = trpc.sync.push.useMutation();
  useEffect(() => { const online = () => setIsOnline(true); const offline = () => setIsOnline(false); window.addEventListener("online", online); window.addEventListener("offline", offline); return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); }; }, []);
  useEffect(() => { if (!isOnline || !currentUser) return; const pending = readPendingOperations(); if (!pending.length) return; syncMutation.mutate({ operations: pending }, { onSuccess: () => clearPendingOperations() }); }, [isOnline, currentUser]);
  const displayProducts = remoteProducts?.length ? remoteProducts.map(p => ({ name: p.name, sku: p.sku, category: "منتجات", stock: p.stockQty, price: `${p.salePrice} ج.م`, tone: "bg-red-50 text-red-700" })) : productSeed;
  const filteredProducts = useMemo(() => displayProducts.filter(p => p.name.includes(search) || p.sku.toLowerCase().includes(search.toLowerCase())), [displayProducts, search]);
  const currentLabel = navItems.find(item => item.key === active)?.label ?? "نظرة عامة";

  return <div dir="rtl" className="min-h-screen bg-[#f7f7f5] text-slate-950 font-sans">
    <aside className="hidden lg:flex fixed inset-y-0 right-0 z-30 w-[264px] bg-white border-l border-slate-200 flex-col">
      <div className="h-24 px-7 flex items-center border-b border-slate-200"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-red-600 text-white flex items-center justify-center font-black text-xl">أ</div><div><p className="font-black text-lg leading-none">أروساين</p><p className="text-[10px] tracking-[0.18em] text-slate-400 mt-1">SALES SYSTEM</p></div></div></div>
      <div className="px-4 py-7"><p className="text-[10px] font-bold tracking-[0.18em] text-slate-400 px-3 mb-3">القائمة الرئيسية</p><nav className="space-y-1">{navItems.map(item => <button key={item.key} onClick={() => setActive(item.key)} className={cn("w-full flex items-center gap-3 px-3 py-3 text-sm font-semibold transition-colors text-right", active === item.key ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100")}><item.icon size={17} strokeWidth={active === item.key ? 2.5 : 1.8}/><span>{item.label}</span>{item.key === "customers" && <span className="mr-auto bg-red-600 text-white text-[10px] px-1.5 py-0.5">12</span>}</button>)}</nav></div>
      <div className="mt-auto p-5 border-t border-slate-200"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold">م</div><div className="min-w-0"><p className="text-sm font-bold truncate">مدير النظام</p><p className="text-xs text-slate-400 truncate">admin@arousain.local</p></div><Settings2 size={16} className="mr-auto text-slate-400" /></div></div>
    </aside>

    <main className="lg:mr-[264px] min-h-screen">
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-5 md:px-9 sticky top-0 z-20"><div className="flex items-center gap-4"><Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden"><Menu size={21}/></Button></SheetTrigger><SheetContent side="right" className="w-[290px] p-0"><SheetHeader className="p-6 border-b"><SheetTitle className="text-right">أروساين</SheetTitle></SheetHeader><nav className="p-4 space-y-1">{navItems.map(item => <button key={item.key} onClick={() => setActive(item.key)} className={cn("w-full flex items-center gap-3 px-3 py-3 text-sm font-semibold text-right", active === item.key ? "bg-slate-950 text-white" : "text-slate-600")}><item.icon size={17}/>{item.label}</button>)}</nav></SheetContent></Sheet><div><p className="text-xs text-slate-400 mb-1">الأربعاء، ٢٦ أغسطس ٢٠٢٦</p><h1 className="text-xl md:text-2xl font-black tracking-tight">{currentLabel}</h1></div></div><div className="flex items-center gap-3"><div className={cn("hidden sm:flex items-center gap-1.5 text-[11px] font-bold px-2.5 h-8", isOnline ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700")}><span className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-green-500" : "bg-amber-500")} />{isOnline ? "متصل" : "وضع عدم الاتصال"}</div><div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 h-10 w-56"><Search size={16} className="text-slate-400"/><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث في النظام..." className="border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 text-sm"/></div><Button variant="ghost" size="icon" className="relative"><Bell size={19}/><span className="absolute top-1 left-1 w-2 h-2 bg-red-600 rounded-full border-2 border-white"/></Button><div className="w-9 h-9 bg-slate-950 text-white flex items-center justify-center text-sm font-bold">م</div></div></header>

      <div className="p-5 md:p-9 max-w-[1500px] mx-auto">
        {active === "dashboard" ? <>
          <section className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8"><div><div className="flex items-center gap-2 mb-3"><span className="w-2 h-2 bg-red-600"/><span className="text-xs font-bold text-red-600 tracking-wide">ملخص اليوم</span></div><h2 className="text-3xl md:text-4xl font-black tracking-tight">صباح الخير، مدير النظام.</h2><p className="text-slate-500 mt-2">إليك ملخص أداء المعرض وحركة العمليات اليوم.</p></div><Button onClick={() => setShowQuick(!showQuick)} className="rounded-none bg-red-600 hover:bg-red-700 text-white gap-2 h-11 px-5"><Plus size={17}/> عملية جديدة <ChevronDown size={15}/></Button></section>
          {showQuick && <div className="mb-7 border-2 border-slate-950 bg-white p-4 flex flex-wrap gap-3"><button onClick={() => setActive("sales")} className="px-4 py-3 bg-slate-950 text-white text-sm font-bold">إنشاء فاتورة بيع</button><button onClick={() => setActive("inventory")} className="px-4 py-3 border border-slate-300 text-sm font-bold">إضافة منتج</button><button onClick={() => setActive("customers")} className="px-4 py-3 border border-slate-300 text-sm font-bold">تسجيل تحصيل</button></div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8"><StatCard label="مبيعات اليوم" value="84,650 ج.م" note="↑ 12.8% مقارنة بالأمس" icon={CircleDollarSign} accent="bg-red-600"/><StatCard label="صافي الربح" value="21,420 ج.م" note="هامش ربح 25.3%" icon={BarChart3} accent="bg-slate-950"/><StatCard label="فواتير معلقة" value="12 فاتورة" note="بقيمة 148,900 ج.م" icon={FileText} accent="bg-amber-400"/><StatCard label="أقساط مستحقة" value="36,750 ج.م" note="تحتاج متابعة هذا الأسبوع" icon={CreditCard} accent="bg-blue-500"/></div>
          <div className="grid xl:grid-cols-[1.4fr_1fr] gap-5 mb-5"><Card className="border-0 shadow-[0_12px_35px_rgba(15,23,42,0.06)] rounded-none"><CardContent className="p-0"><div className="flex items-center justify-between p-5 border-b border-slate-200"><div><h3 className="font-black">حركة المبيعات</h3><p className="text-xs text-slate-400 mt-1">آخر ٧ أيام</p></div><Badge variant="outline" className="rounded-none font-normal">هذا الأسبوع <ChevronDown size={13} className="mr-1"/></Badge></div><div className="h-64 p-5 flex items-end gap-3 md:gap-6"><div className="flex flex-col justify-between h-full text-[10px] text-slate-400 ml-2"><span>١٠٠k</span><span>٧٥k</span><span>٥٠k</span><span>٢٥k</span><span>٠</span></div>{[48, 66, 55, 78, 62, 88, 73].map((height, i) => <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-2"><div className={cn("w-full max-w-10 transition-all", i === 5 ? "bg-red-600" : "bg-slate-200")} style={{height: `${height}%`}}/><span className="text-[10px] text-slate-400">{["خميس","جمعة","سبت","أحد","إثنين","ثلاثاء","أربعاء"][i]}</span></div>)}</div></CardContent></Card><Card className="border-0 shadow-[0_12px_35px_rgba(15,23,42,0.06)] rounded-none"><CardContent className="p-0"><div className="p-5 border-b border-slate-200 flex items-center justify-between"><div><h3 className="font-black">آخر العمليات</h3><p className="text-xs text-slate-400 mt-1">تحديث مباشر</p></div><button className="text-xs font-bold text-red-600">عرض الكل</button></div><div className="divide-y divide-slate-100">{[["فاتورة بيع #1048","محمد أحمد","+18,500 ج.م","10:42 ص","bg-red-100 text-red-700",ArrowUpLeft],["تحصيل قسط #0291","سارة محمود","+4,200 ج.م","09:18 ص","bg-green-100 text-green-700",ArrowDownLeft],["فاتورة شراء #0087","شركة العربي","-32,000 ج.م","08:55 ص","bg-blue-100 text-blue-700",ArrowDownLeft],["مصروف تشغيلي","نقل وشحن","-1,250 ج.م","08:20 ص","bg-amber-100 text-amber-700",ArrowDownLeft]].map(([title, sub, amount, time, color, Icon]: any) => <div className="p-4 flex items-center gap-3"><div className={cn("w-9 h-9 flex items-center justify-center", color)}><Icon size={16}/></div><div className="min-w-0 flex-1"><p className="text-sm font-bold">{title}</p><p className="text-xs text-slate-400 mt-0.5">{sub} · {time}</p></div><span className={cn("text-xs font-bold", amount.startsWith("-") ? "text-slate-700" : "text-green-600")}>{amount}</span></div>)}</div></CardContent></Card></div>
          <Card className="border-0 shadow-[0_12px_35px_rgba(15,23,42,0.06)] rounded-none"><CardContent className="p-0"><div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5 border-b border-slate-200"><div><h3 className="font-black">تنبيهات المخزون</h3><p className="text-xs text-slate-400 mt-1">منتجات تحتاج إلى إعادة طلب</p></div><button onClick={() => setActive("inventory")} className="text-xs font-bold text-red-600">إدارة المخزون ←</button></div><div className="overflow-x-auto"><table className="w-full text-right min-w-[600px]"><thead className="bg-slate-50 text-xs text-slate-400"><tr><th className="p-4 font-medium">المنتج</th><th className="p-4 font-medium">التصنيف</th><th className="p-4 font-medium">رمز المنتج</th><th className="p-4 font-medium">الكمية الحالية</th><th className="p-4 font-medium">السعر</th><th className="p-4 font-medium">الحالة</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredProducts.map(p => <tr key={p.sku} className="text-sm"><td className="p-4 font-bold">{p.name}</td><td className="p-4 text-slate-500">{p.category}</td><td className="p-4 text-slate-400 font-mono text-xs" dir="ltr">{p.sku}</td><td className="p-4 font-bold">{p.stock} قطعة</td><td className="p-4 font-bold">{p.price}</td><td className="p-4"><Badge className={cn("rounded-none border-0", p.stock <= 3 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>{p.stock <= 3 ? "مخزون منخفض" : "متوفر"}</Badge></td></tr>)}</tbody></table></div></CardContent></Card>
        </> : <ModulePage module={active} label={currentLabel} summary={remoteSummary} firstProduct={remoteProducts?.[0]} onBack={() => setActive("dashboard")} />}
      </div>
    </main>
  </div>;
}

const moduleCopy: Record<NavKey, { description: string; action: string; fields: string[] }> = {
  dashboard: { description: "", action: "", fields: [] },
  sales: { description: "أنشئ الفواتير وسجل طريقة الدفع وتابع حالة التحصيل.", action: "فاتورة بيع جديدة", fields: ["اسم العميل", "إجمالي الفاتورة"] },
  inventory: { description: "تابع المنتجات والكميات وحركات الإدخال والإخراج من شاشة واحدة.", action: "إضافة منتج", fields: ["اسم المنتج", "الكمية الحالية"] },
  purchases: { description: "سجل مشتريات الموردين وأضف الكميات إلى رصيد المخزون.", action: "فاتورة شراء جديدة", fields: ["اسم المورد", "إجمالي الفاتورة"] },
  customers: { description: "ملفات العملاء والأرصدة وجدول الأقساط والتحصيلات.", action: "إضافة عميل", fields: ["اسم العميل", "رقم الهاتف"] },
  suppliers: { description: "إدارة الموردين والأرصدة وحركة التوريد.", action: "إضافة مورد", fields: ["اسم المورد", "رقم الهاتف"] },
  expenses: { description: "سجل المصروفات التشغيلية وصنّفها لمتابعة صافي الربح.", action: "تسجيل مصروف", fields: ["وصف المصروف", "القيمة"] },
  reports: { description: "تقارير المبيعات والربح والمخزون والأقساط المستحقة.", action: "تصدير التقرير", fields: [] },
};

function ModulePage({ module, label, summary, firstProduct, onBack }: { module: NavKey; label: string; summary?: { sales: number; profit: number; stockValue: number; installmentsDue: number } | null; firstProduct?: { id: number; salePrice: string }; onBack: () => void }) {
  const copy = moduleCopy[module];
  const storageKey = module === "inventory" ? "products" : module as Exclude<LocalStoreKey, "products">;
  const productCreate = trpc.catalog.createProduct.useMutation();
  const customerCreate = trpc.catalog.createCustomer.useMutation();
  const supplierCreate = trpc.catalog.createSupplier.useMutation();
  const expenseCreate = trpc.catalog.createExpense.useMutation();
  const saleCreate = trpc.sales.create.useMutation();
  const purchaseCreate = trpc.purchases.create.useMutation();
  const [rows, setRows] = useState<LocalEntity[]>(() => module === "reports" ? [] : loadLocalCollection(storageKey));
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(module === "reports");
  const save = () => {
    if (!title.trim() && module !== "reports") return;
    const next: LocalEntity[] = [{ id: String(Date.now()), name: title.trim() || "تقرير جديد", detail: detail.trim() || "تم الحفظ محليًا بانتظار المزامنة", amount: Number(detail) || undefined, updatedAt: Date.now() }, ...rows];
    setRows(next); if (module !== "reports") saveLocalCollection(storageKey, next); enqueueOperation(module, { name: title.trim() || "تقرير جديد", detail: detail.trim() });
    if (module === "inventory") productCreate.mutate({ name: title.trim(), sku: `LOCAL-${Date.now()}`, salePrice: detail.trim() || "0", stockQty: 0, minStock: 0 });
    if (module === "customers") customerCreate.mutate({ name: title.trim(), phone: detail.trim() });
    if (module === "suppliers") supplierCreate.mutate({ name: title.trim(), phone: detail.trim() });
    if (module === "expenses") expenseCreate.mutate({ title: title.trim(), category: "تشغيلية", amount: detail.trim() || "0" });
    if (module === "sales" && firstProduct) saleCreate.mutate({ invoiceNo: `LOCAL-${Date.now()}`, paidAmount: detail.trim() || "0", paymentMethod: "cash", items: [{ productId: firstProduct.id, quantity: 1, unitPrice: firstProduct.salePrice }] });
    if (module === "purchases" && firstProduct) purchaseCreate.mutate({ invoiceNo: `LOCAL-${Date.now()}`, paidAmount: detail.trim() || "0", items: [{ productId: firstProduct.id, quantity: 1, unitPrice: firstProduct.salePrice }] });
    setTitle(""); setDetail(""); setDrawerOpen(false);
  };
  return <div>
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8"><div><div className="flex items-center gap-2 mb-3"><span className="w-2 h-2 bg-red-600"/><span className="text-xs font-bold text-red-600">إدارة العمليات</span></div><h2 className="text-3xl md:text-4xl font-black tracking-tight">{label}</h2><p className="text-slate-500 mt-2">{copy.description}</p></div><Button onClick={() => setDrawerOpen(!drawerOpen)} className="rounded-none bg-red-600 hover:bg-red-700 gap-2 h-11"><Plus size={17}/>{copy.action}</Button></div>
    {drawerOpen && module !== "reports" && <Card className="rounded-none border-2 border-slate-950 shadow-none mb-6"><CardContent className="p-5"><div className="flex justify-between items-center mb-5"><div><h3 className="font-black">{copy.action}</h3><p className="text-xs text-slate-400 mt-1">يتم حفظ الإدخال محليًا ويمكن مزامنته عند عودة الاتصال.</p></div><button onClick={() => setDrawerOpen(false)}><X size={18}/></button></div><div className="grid md:grid-cols-2 gap-4"><div><label className="text-xs font-bold block mb-2">{copy.fields[0] || "الوصف"}</label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="اكتب هنا..." className="rounded-none" /></div><div><label className="text-xs font-bold block mb-2">{copy.fields[1] || "ملاحظات"}</label><Input value={detail} onChange={e => setDetail(e.target.value)} placeholder="اكتب هنا..." className="rounded-none" /></div></div><div className="flex gap-3 mt-5"><Button onClick={save} className="rounded-none bg-slate-950">حفظ العملية</Button><Button variant="outline" onClick={() => setDrawerOpen(false)} className="rounded-none">إلغاء</Button></div></CardContent></Card>}
    {module === "reports" ? <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">{[["إجمالي المبيعات", summary ? `${summary.sales.toLocaleString("ar-EG")} ج.م` : "٢٤٨,٦٥٠ ج.م", "من قاعدة البيانات", "bg-red-600"], ["صافي الربح", summary ? `${summary.profit.toLocaleString("ar-EG")} ج.م` : "٦٢,٤٢٠ ج.م", "بعد المصروفات", "bg-slate-950"], ["قيمة المخزون", summary ? `${summary.stockValue.toLocaleString("ar-EG")} ج.م` : "١.٨ مليون ج.م", "حسب تكلفة الشراء", "bg-blue-600"], ["أقساط مستحقة", summary ? `${summary.installmentsDue.toLocaleString("ar-EG")} ج.م` : "١٤٨,٩٠٠ ج.م", "غير مسددة", "bg-amber-400"]].map(([name, value, note, color]) => <Card className="rounded-none border-0 shadow-[0_12px_35px_rgba(15,23,42,0.06)]"><CardContent className="p-5"><div className={cn("h-1 w-10 mb-5", color)}/><p className="text-xs text-slate-500">{name}</p><p className="text-2xl font-black mt-2">{value}</p><p className="text-xs text-slate-400 mt-2">{note}</p></CardContent></Card>)}</div> : <Card className="rounded-none border-0 shadow-[0_12px_35px_rgba(15,23,42,0.06)]"><CardContent className="p-0"><div className="p-5 border-b border-slate-200 flex items-center justify-between"><div><h3 className="font-black">السجل المحلي</h3><p className="text-xs text-slate-400 mt-1">{rows.length ? `${rows.length} عملية محفوظة` : "لا توجد عمليات بعد"}</p></div><Badge variant="outline" className="rounded-none">{isClientOnline() ? "مزامنة متاحة" : "محلي فقط"}</Badge></div>{rows.length ? <div className="divide-y divide-slate-100">{rows.map(row => <div key={row.id} className="p-4 flex items-center gap-3"><div className="w-9 h-9 bg-red-50 text-red-700 flex items-center justify-center"><FileText size={16}/></div><div className="flex-1"><p className="text-sm font-bold">{row.name}</p><p className="text-xs text-slate-400 mt-1">{row.detail}</p></div><span className="text-xs text-slate-400">محفوظ محليًا</span></div>)}</div> : <div className="py-20 text-center"><div className="w-14 h-14 bg-slate-100 mx-auto flex items-center justify-center mb-4"><Package size={24} className="text-slate-400"/></div><p className="font-bold">ابدأ بإضافة أول عملية</p><p className="text-sm text-slate-400 mt-2">ستظهر السجلات هنا بعد الحفظ.</p></div>}</CardContent></Card>}
    <button onClick={onBack} className="mt-6 text-sm font-bold text-red-600">← العودة إلى النظرة العامة</button>
  </div>;
}

function isClientOnline() { return typeof navigator === "undefined" ? true : navigator.onLine; }

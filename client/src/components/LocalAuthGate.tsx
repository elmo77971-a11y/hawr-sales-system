import { useEffect, useState } from "react";
import { LockKeyhole, ShieldCheck, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

function isDesktopBridgeAvailable() {
  return typeof window !== "undefined" && Boolean((window as typeof window & { hawrDesktop?: { isDesktop?: boolean } }).hawrDesktop?.isDesktop);
}

function AuthCard({ children, title, description }: { children: React.ReactNode; title: string; description: string }) {
  return <main dir="rtl" className="min-h-screen bg-[#f7f7f5] px-5 py-10 text-slate-950 font-sans"><div className="mx-auto max-w-lg"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center bg-red-600 text-2xl font-black text-white">ح</div><div><p className="text-xl font-black">معرض حور</p><p className="text-xs tracking-[0.15em] text-slate-400">LOCAL SALES & INVENTORY</p></div></div><Card className="mt-8 rounded-none border-0 shadow-[0_18px_50px_rgba(15,23,42,0.08)]"><CardContent className="p-7 md:p-9"><div className="mb-7 flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center bg-slate-950 text-white"><LockKeyhole size={18} /></div><div><h1 className="text-2xl font-black">{title}</h1><p className="mt-2 text-sm leading-7 text-slate-500">{description}</p></div></div>{children}</CardContent></Card><p className="mt-5 text-center text-xs text-slate-400">بياناتك محفوظة محليًا على جهاز المعرض</p></div></main>;
}

function ManagerSetup({ onComplete }: { onComplete: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [managerCode, setManagerCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const register = trpc.auth.localRegister.useMutation();
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password !== confirm) return setError("تأكيد كلمة المرور غير مطابق");
    register.mutate({ name, managerCode, password }, { onSuccess: () => void onComplete(), onError: (e) => setError(e.message) });
  };
  return <AuthCard title="إنشاء حساب المدير" description="هذه الخطوة تظهر مرة واحدة فقط. المدير هو المسؤول عن الموظفين والأكواد والإعدادات الحساسة داخل النظام."><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-bold">اسم المدير<Input required minLength={2} value={name} onChange={e => setName(e.target.value)} placeholder="مثال: محمد سليمان" className="mt-2 h-11 rounded-none" /></label><label className="block text-sm font-bold">كود المدير<Input required minLength={3} pattern="[A-Za-z0-9_-]{3,40}" value={managerCode} onChange={e => setManagerCode(e.target.value)} placeholder="MANAGER01" dir="ltr" className="mt-2 h-11 rounded-none text-left" /><span className="mt-1 block text-xs font-normal text-slate-400">استخدم حروفًا وأرقامًا إنجليزية فقط.</span></label><label className="block text-sm font-bold">كلمة المرور<Input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="6 أحرف على الأقل" dir="ltr" className="mt-2 h-11 rounded-none text-left" /></label><label className="block text-sm font-bold">تأكيد كلمة المرور<Input required minLength={6} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="أعد كتابة كلمة المرور" dir="ltr" className="mt-2 h-11 rounded-none text-left" /></label>{error && <p className="bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}<Button type="submit" disabled={register.isPending} className="h-11 w-full rounded-none bg-slate-950">{register.isPending ? "جارٍ إنشاء الحساب..." : "حفظ وبدء استخدام النظام"}</Button></form></AuthCard>;
}

function ManagerLogin({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [managerCode, setManagerCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const login = trpc.auth.localLogin.useMutation();
  const submit = (event: React.FormEvent) => { event.preventDefault(); setError(""); login.mutate({ managerCode, password }, { onSuccess: () => void onSuccess(), onError: e => setError(e.message) }); };
  return <AuthCard title="تسجيل دخول المدير" description="أدخل كود المدير وكلمة المرور للوصول إلى المبيعات والمخزون وإدارة الموظفين."><div className="mb-6 grid grid-cols-2 gap-3 text-xs font-bold"><div className="flex items-center gap-2 bg-green-50 p-3 text-green-700"><ShieldCheck size={16} /> دخول محلي آمن</div><div className="flex items-center gap-2 bg-blue-50 p-3 text-blue-700"><Wifi size={16} /> يعمل عبر Wi‑Fi</div></div><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-bold">كود المدير<Input required value={managerCode} onChange={e => setManagerCode(e.target.value)} placeholder="MANAGER01" dir="ltr" className="mt-2 h-11 rounded-none text-left" /></label><label className="block text-sm font-bold">كلمة المرور<Input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="كلمة المرور" dir="ltr" className="mt-2 h-11 rounded-none text-left" /></label>{error && <p className="bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}<Button type="submit" disabled={login.isPending} className="h-11 w-full rounded-none bg-slate-950">{login.isPending ? "جارٍ التحقق..." : "دخول إلى النظام"}</Button></form></AuthCard>;
}

export function LocalAuthGate({ children }: { children: React.ReactNode }) {
  const [localRuntime, setLocalRuntime] = useState<boolean | null>(isDesktopBridgeAvailable() ? true : null);
  const utils = trpc.useUtils();
  const status = trpc.auth.localStatus.useQuery(undefined, { enabled: localRuntime === true, retry: false });
  const me = trpc.auth.me.useQuery(undefined, { enabled: localRuntime === true, retry: false, refetchOnWindowFocus: false });

  useEffect(() => {
    if (localRuntime !== null) return;
    let active = true;
    fetch("/__desktop/health", { cache: "no-store" }).then(response => response.ok).catch(() => false).then(isLocal => { if (active) setLocalRuntime(isLocal); });
    return () => { active = false; };
  }, [localRuntime]);

  if (localRuntime === null || (localRuntime && (status.isLoading || me.isLoading))) return <main dir="rtl" className="grid min-h-screen place-items-center bg-[#f7f7f5] text-sm text-slate-500">جارٍ التحقق من تشغيل النظام المحلي...</main>;
  if (!localRuntime) return <>{children}</>;
  if (!status.data?.configured) return <ManagerSetup onComplete={async () => { await status.refetch(); await me.refetch(); }} />;
  if (!me.data) return <ManagerLogin onSuccess={async () => { await utils.auth.me.invalidate(); }} />;
  return <>{children}</>;
}

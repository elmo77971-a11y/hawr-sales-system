import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ManagerPasswordDialog({ open, title = "تأكيد العملية", description = "أدخل كلمة مرور المدير للمتابعة.", loading = false, error = "", onCancel, onConfirm }: { open: boolean; title?: string; description?: string; loading?: boolean; error?: string; onCancel: () => void; onConfirm: (password: string) => void }) {
  const [password, setPassword] = useState("");
  useEffect(() => { if (open) setPassword(""); }, [open]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="manager-password-title"><Card className="w-full max-w-md rounded-none border-2 border-slate-950 shadow-2xl"><CardContent className="p-6" dir="rtl"><h2 id="manager-password-title" className="text-xl font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p><label className="mt-5 block text-sm font-bold">كلمة مرور المدير<Input autoFocus type="password" value={password} onChange={event => setPassword(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && password.trim()) onConfirm(password); }} placeholder="أدخل كلمة المرور" className="mt-2 h-11 rounded-none" dir="ltr" /></label>{error && <p className="mt-3 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}<div className="mt-5 flex gap-3"><Button type="button" onClick={() => onConfirm(password)} disabled={!password.trim() || loading} className="rounded-none bg-slate-950">{loading ? "جارٍ التحقق..." : "تأكيد وحفظ"}</Button><Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="rounded-none">إلغاء</Button></div></CardContent></Card></div>;
}

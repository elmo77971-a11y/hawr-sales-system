import { useEffect, useState } from "react";
import { Download, RefreshCw, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DesktopStatusBar() {
  const [status, setStatus] = useState<{ status: string; version?: string | null; percent?: number; downloaded?: boolean; error?: string | null }>({ status: "idle" });
  const [network, setNetwork] = useState<{ host: string; port: number | null; addresses: string[]; url: string | null } | null>(null);
  const desktop = typeof window !== "undefined" ? window.hawrDesktop : undefined;

  useEffect(() => {
    if (!desktop?.isDesktop) return;
    let active = true;
    void desktop.getUpdateStatus?.().then(value => { if (active && value) setStatus(value); });
    void desktop.getNetworkInfo?.().then(value => { if (active && value) setNetwork(value); });
    const unsubscribe = desktop.onUpdateStatus?.(value => { if (active) setStatus(value); });
    return () => { active = false; unsubscribe?.(); };
  }, [desktop]);

  if (!desktop?.isDesktop) return null;
  const updateText = status.status === "checking" ? "جاري فحص التحديثات..." : status.status === "downloading" ? `جاري تنزيل التحديث ${status.percent || 0}%` : status.status === "downloaded" ? `تم تنزيل الإصدار ${status.version || "الجديد"}` : status.status === "available" ? `يتوفر الإصدار ${status.version || "جديد"}` : status.status === "error" ? "تعذر فحص التحديث تلقائيًا" : "البرنامج محدث تلقائيًا";
  return <div dir="rtl" className="mb-5 flex flex-col gap-3 border border-slate-200 bg-white p-3 text-xs shadow-sm md:flex-row md:items-center md:justify-between"><div className="flex flex-wrap items-center gap-3"><span className="flex items-center gap-2 font-bold text-slate-700"><RefreshCw size={14} className={status.status === "checking" || status.status === "downloading" ? "animate-spin" : ""} />{updateText}</span>{status.status === "downloaded" && <Button onClick={() => void desktop.installUpdate?.()} size="sm" className="h-8 rounded-none bg-red-600">إعادة التشغيل والتثبيت</Button>}{status.status === "error" && <span className="text-slate-400">سيُعاد الفحص تلقائيًا لاحقًا.</span>}</div><div className="flex flex-wrap items-center gap-2"><span className="flex items-center gap-1 text-slate-500"><Wifi size={14} />{network?.host ? `${network.host}:${network.port || "-"}` : "شبكة الهاتف غير جاهزة"}</span><Button onClick={() => void desktop.showPairing?.()} size="sm" variant="outline" className="h-8 rounded-none"><Download size={14} className="ml-1" />فتح QR الهاتف</Button></div></div>;
}

"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function OnboardForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";

  const [status, setStatus] = useState<"loading" | "valid" | "error" | "done">("loading");
  const [tokenInfo, setTokenInfo] = useState<{ email: string; role: string } | null>(null);
  const [errMsg, setErrMsg] = useState("");
  const [form, setForm] = useState({ name: "", password: "", confirmPassword: "", phone: "", city: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("error"); setErrMsg("Token missing"); return; }
    fetch("/api/auth/validate-token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(r => r.json())
      .then(d => { if (d.valid) { setTokenInfo({ email: d.email, role: d.role }); setStatus("valid"); } else { setStatus("error"); setErrMsg(d.error); } })
      .catch(() => { setStatus("error"); setErrMsg("Network error"); });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setErrMsg("Passwords don't match"); return; }
    if (form.password.length < 6) { setErrMsg("Password min 6 chars"); return; }
    setSubmitting(true); setErrMsg("");
    const res = await fetch("/api/auth/onboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...form }) });
    const d = await res.json();
    if (d.ok) setStatus("done"); else { setErrMsg(d.error || "Error"); setSubmitting(false); }
  };

  if (status === "loading") return (
    <div className="flex flex-col items-center py-16">
      <Loader2 className="size-8 animate-spin text-primary mb-3" />
      <p className="text-sm text-muted-foreground">چاوەڕوانبە...</p>
    </div>
  );
  if (status === "error") return (
    <div className="flex flex-col items-center py-16 text-center">
      <p className="text-destructive font-semibold mb-2">هەڵە</p>
      <p className="text-sm text-muted-foreground">{errMsg}</p>
    </div>
  );
  if (status === "done") return (
    <div className="flex flex-col items-center py-16 text-center">
      <h2 className="text-lg font-bold mb-2">هەژمارەکەت دروستکرا!</h2>
      <p className="text-sm text-muted-foreground mb-6">ئێستا دەتوانیت بچیتە ژوورەوە.</p>
      <Button onClick={() => router.push("/")}>چوونە ژوورەوە</Button>
    </div>
  );

  const fields = [
    { key: "name", label: "ناو", type: "text", required: true },
    { key: "password", label: "وشەی نهێنی", type: "password", required: true },
    { key: "confirmPassword", label: "دڵنیابوونەوەی وشەی نهێنی", type: "password", required: true },
    { key: "phone", label: "تەلەفۆن", type: "text", required: false },
    { key: "city", label: "شار", type: "text", required: false },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CardHeader className="p-0 pb-4">
        <CardTitle>دروستکردنی هەژمار</CardTitle>
        <CardDescription>{tokenInfo?.email} — {tokenInfo?.role}</CardDescription>
      </CardHeader>

      {errMsg && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive">
          {errMsg}
        </div>
      )}

      {fields.map(f => (
        <div key={f.key} className="space-y-1.5">
          <Label htmlFor={`onboard-${f.key}`}>
            {f.label}
            {f.required && <span className="text-destructive ms-0.5">*</span>}
          </Label>
          <Input
            id={`onboard-${f.key}`}
            type={f.type}
            required={f.required}
            value={form[f.key as keyof typeof form]}
            onChange={e => setForm({ ...form, [f.key]: e.target.value })}
          />
        </div>
      ))}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? <><Loader2 className="size-4 animate-spin me-2" />...</> : "دروستکردنی هەژمار"}
      </Button>
    </form>
  );
}

export default function OnboardPage() {
  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center font-[family-name:var(--font-noto-sans-arabic)]" dir="rtl">
      <Card className="w-[90%] max-w-[520px]">
        <CardContent>
          <Suspense fallback={
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          }>
            <OnboardForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

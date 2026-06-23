"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

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
    if (d.success) setStatus("done");
    else { setErrMsg(d.error || "Error"); setSubmitting(false); }
  };

  if (status === "loading") return <div style={{ textAlign: "center", padding: 80 }}><p style={{ color: "#6C757D" }}>چاوەڕوانبە...</p></div>;
  if (status === "error") return <div style={{ textAlign: "center", padding: 80 }}><p style={{ color: "#FA5252", fontWeight: 600 }}>هەڵە: {errMsg}</p></div>;
  if (status === "done") return (
    <div style={{ textAlign: "center", padding: 80 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>هەژمارەکەت دروستکرا!</h2>
      <p style={{ color: "#6C757D", marginBottom: 24 }}>ئێستا دەتوانیت بچیتە ژوورەوە.</p>
      <button onClick={() => router.push("/")} style={{ padding: "12px 32px", borderRadius: 10, background: "#4263EB", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>چوونە ژوورەوە</button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 420, margin: "0 auto" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>دروستکردنی هەژمار</h2>
      <p style={{ fontSize: 13, color: "#6C757D", marginBottom: 24 }}>{tokenInfo?.email} — {tokenInfo?.role}</p>
      {errMsg && <p style={{ color: "#FA5252", fontSize: 13, marginBottom: 12 }}>{errMsg}</p>}
      {[
        { key: "name", label: "ناو", type: "text", required: true },
        { key: "password", label: "وشەی نهێنی", type: "password", required: true },
        { key: "confirmPassword", label: "دڵنیابوونەوەی وشەی نهێنی", type: "password", required: true },
        { key: "phone", label: "تەلەفۆن", type: "text", required: false },
        { key: "city", label: "شار", type: "text", required: false },
      ].map(f => (
        <div key={f.key} style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{f.label}</label>
          <input type={f.type} required={f.required} value={form[f.key as keyof typeof form]}
            onChange={e => setForm({ ...form, [f.key]: e.target.value })}
            style={{ width: "100%", padding: "10px 14px", border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "#F8F9FA" }} />
        </div>
      ))}
      <button type="submit" disabled={submitting} style={{ width: "100%", padding: "12px", borderRadius: 10, background: submitting ? "#ADB5BD" : "#4263EB", color: "white", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", marginTop: 8 }}>
        {submitting ? "..." : "دروستکردنی هەژمار"}
      </button>
    </form>
  );
}

export default function OnboardPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F8F9FA", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Noto Sans Arabic', sans-serif", direction: "rtl" }}>
      <div style={{ background: "white", borderRadius: 16, padding: 40, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", width: "90%", maxWidth: 520 }}>
        <Suspense fallback={<p style={{ textAlign: "center", color: "#6C757D" }}>چاوەڕوانبە...</p>}>
          <OnboardForm />
        </Suspense>
      </div>
    </div>
  );
}

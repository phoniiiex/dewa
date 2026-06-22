"use client";
import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, User, Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "@/styles/login.css";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  // Check if already logged in via Supabase session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/dashboard");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Sign out any existing session first to prevent stale session reuse
      await supabase.auth.signOut();

      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError("ئیمەیڵ یان وشەی نهێنی هەڵەیە");
        setIsLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("هەڵەیەک ڕوویدا، دووبارە هەوڵبدەوە");
      setIsLoading(false);
    }
  };

  if (checking) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F9FA" }}>
      <div style={{ width: 40, height: 40, border: "3px solid #DEE2E6", borderTopColor: "#4263EB", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div className="login-page">
      <div className="login-form-section">
        <div className="login-header">
          <div className="login-logo"><div className="login-logo-icon">د</div></div>
          <div className="login-register-link"><span>هەژمارت نییە؟</span><a href="#">تۆمارکردن</a></div>
        </div>

        <div className="login-form-container">
          <div className="login-avatar-icon"><User size={28} /></div>
          <h1>چوونە ژوورەوە</h1>
          <p>زانیارییەکانت بنووسە بۆ چوونە ژوورەوە</p>

          <div style={{ background: "#EDF2FF", border: "1px solid #D0BFFF", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#4263EB" }}>
            <strong>دێمۆ:</strong> admin@dewa.com / dewa2025
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>ئیمەیڵ<span className="required">*</span></label>
              <div className="input-wrapper">
                <span className="input-icon"><Mail size={18} /></span>
                <input type="email" placeholder="hello@dewa.com" value={email} onChange={(e) => setEmail(e.target.value)} required id="login-email" />
              </div>
            </div>

            <div className="form-group">
              <label>وشەی نهێنی<span className="required">*</span></label>
              <div className="input-wrapper">
                <span className="input-icon"><Lock size={18} /></span>
                <input type={showPassword ? "text" : "password"} placeholder="••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required id="login-password" />
                <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-extras">
              <div className="checkbox-group"><input type="checkbox" id="keep-logged" /><label htmlFor="keep-logged">لە ژوورەوە بمهێڵەوە</label></div>
              <a href="#" className="forgot-password">وشەی نهێنیت لەبیرکردووە؟</a>
            </div>

            <button type="submit" className="login-btn" disabled={isLoading} id="login-submit">
              {isLoading ? "چاوەڕوانبە..." : "چوونە ژوورەوە"}
            </button>

            {error && (
              <div style={{ background: "#FFF5F5", color: "#FA5252", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, textAlign: "center", border: "1px solid #FFE3E3" }}>
                {error}
              </div>
            )}
          </form>
        </div>

        <div className="login-footer">
          <span>© ٢٠٢٥ دەوا</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><Globe size={14} /><span>کوردی</span></div>
        </div>
      </div>

      <div className="login-branding">
        <div className="branding-content">
          <div className="branding-avatar">👤</div>
          <div className="branding-quote">
            سیستەمی بەڕێوەبردنی دەرمانسازی{" "}
            <span className="highlight">کارەکانمانی ئاسان کردووە، لە پلاندانانەوە بۆ شوێنپێگرتن.</span>
          </div>
          <div className="branding-author"><span className="name">دەوا</span><span className="role">سیستەمی بەڕێوەبردنی دەرمانسازی B2B</span></div>
          <div className="branding-dots"><span className="dot active"></span><span className="dot"></span><span className="dot"></span></div>
        </div>
      </div>
    </div>
  );
}

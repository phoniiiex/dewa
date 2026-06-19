"use client";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, User, Globe } from "lucide-react";
import "@/styles/login.css";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // For MVP — redirect to dashboard
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 800);
  };

  return (
    <div className="login-page">
      {/* Right side (RTL) — Form */}
      <div className="login-form-section">
        <div className="login-header">
          <div className="login-logo">
            <div className="login-logo-icon">د</div>
          </div>
          <div className="login-register-link">
            <span>هەژمارت نییە؟</span>
            <a href="#">تۆمارکردن</a>
          </div>
        </div>

        <div className="login-form-container">
          <div className="login-avatar-icon">
            <User size={28} />
          </div>

          <h1>چوونە ژوورەوە</h1>
          <p>زانیارییەکانت بنووسە بۆ چوونە ژوورەوە</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>
                ئیمەیڵ
                <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  placeholder="hello@dewa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  id="login-email"
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                وشەی نهێنی
                <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  id="login-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-extras">
              <div className="checkbox-group">
                <input type="checkbox" id="keep-logged" />
                <label htmlFor="keep-logged">لە ژوورەوە بمهێڵەوە</label>
              </div>
              <a href="#" className="forgot-password">
                وشەی نهێنیت لەبیرکردووە؟
              </a>
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={isLoading}
              id="login-submit"
            >
              {isLoading ? "چاوەڕوانبە..." : "چوونە ژوورەوە"}
            </button>
          </form>
        </div>

        <div className="login-footer">
          <span>© ٢٠٢٥ دەوا</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Globe size={14} />
            <span>کوردی</span>
          </div>
        </div>
      </div>

      {/* Left side (RTL) — Orange Branding */}
      <div className="login-branding">
        <div className="branding-content">
          <div className="branding-avatar">👤</div>
          <div className="branding-quote">
            سیستەمی بەڕێوەبردنی دەرمانسازی{" "}
            <span className="highlight">
              کارەکانمانی ئاسان کردووە، لە پلاندانانەوە بۆ شوێنپێگرتن.
            </span>
          </div>
          <div className="branding-author">
            <span className="name">دەوا</span>
            <span className="role">سیستەمی بەڕێوەبردنی دەرمانسازی B2B</span>
          </div>
          <div className="branding-dots">
            <span className="dot active"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        </div>
      </div>
    </div>
  );
}

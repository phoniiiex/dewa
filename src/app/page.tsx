"use client";
import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, User, Globe, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <Loader2 className="size-8 animate-spin text-primary" />
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

          <Card className="border-primary/20 bg-primary/5 mb-4">
            <CardContent className="py-2.5 px-3.5 text-xs text-primary">
              <strong>دێمۆ:</strong> admin@dewa.com / dewa2025
            </CardContent>
          </Card>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="login-email">ئیمەیڵ<span className="text-destructive ms-0.5">*</span></Label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input type="email" placeholder="hello@dewa.com" value={email} onChange={(e) => setEmail(e.target.value)} required id="login-email" className="ps-9" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login-password">وشەی نهێنی<span className="text-destructive ms-0.5">*</span></Label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input type={showPassword ? "text" : "password"} placeholder="••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required id="login-password" className="ps-9 pe-9" />
                <Button type="button" variant="ghost" size="icon" className="absolute end-1 top-1/2 -translate-y-1/2 size-7" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="keep-logged" />
                <Label htmlFor="keep-logged" className="text-sm font-normal cursor-pointer">لە ژوورەوە بمهێڵەوە</Label>
              </div>
              <a href="#" className="text-sm text-primary hover:underline">وشەی نهێنیت لەبیرکردووە؟</a>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading} id="login-submit">
              {isLoading ? <><Loader2 className="size-4 animate-spin me-2" />چاوەڕوانبە...</> : "چوونە ژوورەوە"}
            </Button>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-center text-sm font-semibold text-destructive">
                {error}
              </div>
            )}
          </form>
        </div>

        <div className="login-footer">
          <span>© ٢٠٢٥ دەوا</span>
          <div className="flex items-center gap-1.5"><Globe size={14} /><span>کوردی</span></div>
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

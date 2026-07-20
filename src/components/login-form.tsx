"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { supabase } from "@/lib/supabase"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await supabase.auth.signOut()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        setError("ئیمەیڵ یان وشەی نهێنی هەڵەیە")
        setIsLoading(false)
        return
      }
      router.push("/dashboard")
    } catch {
      setError("هەڵەیەک ڕوویدا، دووبارە هەوڵبدەوە")
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">بەخێربێیتەوە</CardTitle>
          <CardDescription>
            زانیارییەکانت بنووسە بۆ چوونە ژوورەوە
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Demo credentials banner */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs text-primary mb-5">
            <strong>دێمۆ:</strong> admin@dewa.com / dewa2025
          </div>

          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="login-email">ئیمەیڵ</FieldLabel>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="hello@dewa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="login-password">وشەی نهێنی</FieldLabel>
                  <a
                    href="#"
                    className="ms-auto text-sm underline-offset-4 hover:underline"
                  >
                    وشەی نهێنیت لەبیرکردووە؟
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute end-1 top-1/2 -translate-y-1/2 size-7"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
              </Field>

              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-center text-sm font-semibold text-destructive">
                  {error}
                </div>
              )}

              <Field>
                <Button type="submit" disabled={isLoading} id="login-submit">
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin me-2" />
                      چاوەڕوانبە...
                    </>
                  ) : (
                    "چوونە ژوورەوە"
                  )}
                </Button>
                <FieldDescription className="text-center">
                  هەژمارت نییە؟ <a href="#">تۆمارکردن</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center text-balance">
        بە کلیککردن لەسەر چوونەژوورەوە، ڕازیت بە{" "}
        <a href="#">مەرجەکانی خزمەتگوزاری</a> و{" "}
        <a href="#">سیاسەتی تایبەتمەندی</a>.
      </FieldDescription>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/dashboard")
      } else {
        setChecking(false)
      }
    })
  }, [router])

  if (checking) return (
    <div className="min-h-svh flex items-center justify-center bg-muted/40">
      <Loader2 className="size-8 animate-spin text-primary" />
    </div>
  )

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(263,70%,50%)] to-[hsl(263,80%,62%)] text-primary-foreground font-bold text-sm">
            د
          </div>
          <span className="text-lg font-bold">دەوا</span>
        </a>
        <LoginForm />
      </div>
    </div>
  )
}

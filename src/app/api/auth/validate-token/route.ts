import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ error: "Server config error" }, { status: 500 });

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data, error } = await admin.from("onboarding_tokens").select("*").eq("token", token).single();

    if (error || !data) return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    if (data.used) return NextResponse.json({ error: "Token already used" }, { status: 400 });
    if (new Date(data.expires_at) < new Date()) return NextResponse.json({ error: "Token expired" }, { status: 400 });

    return NextResponse.json({ valid: true, email: data.email, role: data.role, permissions: data.permissions || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { token, password, name, phone, city } = await req.json();
    if (!token || !password || !name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ error: "Server config error" }, { status: 500 });

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // Validate token
    const { data: tokenData, error: tokenErr } = await admin.from("onboarding_tokens").select("*").eq("token", token).single();
    if (tokenErr || !tokenData) return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    if (tokenData.used) return NextResponse.json({ error: "Token already used" }, { status: 400 });
    if (new Date(tokenData.expires_at) < new Date()) return NextResponse.json({ error: "Token expired" }, { status: 400 });

    // Create auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: tokenData.email, password, email_confirm: true,
      user_metadata: { name, role: tokenData.role, phone: phone || "", city: city || "" },
    });
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

    // Create profile
    await admin.from("profiles").upsert({
      id: authData.user.id, name, email: tokenData.email,
      role: tokenData.role, phone: phone || "", city: city || "",
      permissions: tokenData.permissions || [], is_active: true,
    });

    // Mark token as used
    await admin.from("onboarding_tokens").update({ used: true }).eq("token", token);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

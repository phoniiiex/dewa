import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, role, permissions } = body;

    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ error: "Server config error" }, { status: 500 });

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await admin.from("onboarding_tokens").insert({
      token, email,
      role: role || "REP",
      permissions: permissions || [],
      expires_at: expiresAt,
      used: false,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const origin = req.nextUrl.origin;
    const inviteUrl = `${origin}/onboard?token=${token}`;

    return NextResponse.json({ url: inviteUrl, token, expiresAt });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

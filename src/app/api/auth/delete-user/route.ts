import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// DELETE → disable account (ban from logging in + mark inactive)
// Data stays intact: orders, clients etc. still show the user's name.
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

    const admin = adminClient();

    // Ban in Supabase Auth — user can no longer sign in
    const { error: banErr } = await admin.auth.admin.updateUserById(id, {
      ban_duration: "876000h", // ~100 years = effectively permanent
    });
    if (banErr) return NextResponse.json({ error: banErr.message }, { status: 400 });

    // Mark is_active = false in profiles
    await admin.from("profiles").upsert({ id, is_active: false });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}

// PUT → reactivate (unban + mark active again)
export async function PUT(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

    const admin = adminClient();

    const { error: unbanErr } = await admin.auth.admin.updateUserById(id, {
      ban_duration: "none",
    });
    if (unbanErr) return NextResponse.json({ error: unbanErr.message }, { status: 400 });

    await admin.from("profiles").upsert({ id, is_active: true });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}

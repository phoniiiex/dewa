import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get all auth users (includes admin@dewa.com and everyone else)
    const { data: authData, error: authError } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

    // Get all profiles (has permissions, role overrides, is_active)
    const { data: profiles } = await admin.from("profiles").select("*");
    const profileMap = new Map((profiles || []).map((p: Record<string, unknown>) => [p.id, p]));

    // Merge: auth user + profile data
    const users = (authData?.users || []).map((u) => {
      const profile = profileMap.get(u.id) as Record<string, unknown> | undefined;
      return {
        id: u.id,
        email: u.email || "",
        name: profile?.name || u.user_metadata?.name || u.email?.split("@")[0] || "—",
        role: profile?.role || u.user_metadata?.role || "REP",
        phone: profile?.phone || u.user_metadata?.phone || "",
        city: profile?.city || u.user_metadata?.city || "",
        is_active: profile ? profile.is_active !== false : !u.banned_until,
        permissions: (profile?.permissions as string[]) || [],
        created_at: u.created_at,
        has_profile: !!profile,
        avatar_url: (profile?.avatar_url as string) || "",
        last_seen: (profile?.last_seen as string) || "",
      };
    });

    return NextResponse.json({ users });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  // Update a user's role/permissions/active status
  try {
    const { id, role, permissions, is_active, avatar_url } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const admin = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Upsert profile row
    const update: Record<string, unknown> = { id };
    if (role !== undefined) update.role = role;
    if (permissions !== undefined) update.permissions = permissions;
    if (is_active !== undefined) update.is_active = is_active;
    if (avatar_url !== undefined) update.avatar_url = avatar_url;

    const { error } = await admin.from("profiles").upsert(update);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}

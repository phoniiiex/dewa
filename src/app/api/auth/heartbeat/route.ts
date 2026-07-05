import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

// POST /api/auth/heartbeat
// Updates last_seen for the currently authenticated user using the admin client
// This bypasses RLS which would block the regular client from updating profiles
export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Get the session from the Authorization header or cookie
    // We read the access token sent from the client
    const body = await req.json().catch(() => ({}));
    const accessToken: string = body.accessToken || "";

    if (!accessToken) {
      return NextResponse.json({ error: "No token" }, { status: 401 });
    }

    // Verify the token by getting the user from it
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Use admin client to bypass RLS and update last_seen
    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .upsert({ id: user.id, last_seen: new Date().toISOString() }, { onConflict: "id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}

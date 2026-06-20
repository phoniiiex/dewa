import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, role, phone, city } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing required fields: email, password, name" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Server configuration error: missing Supabase credentials" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: role || "REP", phone: phone || "", city: city || "" },
    });

    if (authError) {
      console.error("Auth create error:", authError);
      return NextResponse.json({ error: authError.message || "Failed to create auth user" }, { status: 400 });
    }

    if (!authData?.user) {
      return NextResponse.json({ error: "User creation returned no data" }, { status: 500 });
    }

    // Insert profile row
    const { error: profileError } = await admin.from("profiles").upsert({
      id: authData.user.id,
      name,
      email,
      role: role || "REP",
      phone: phone || "",
      city: city || "",
      is_active: true,
    });

    if (profileError) {
      console.error("Profile insert error:", profileError);
      return NextResponse.json({ error: profileError.message || "Failed to create profile" }, { status: 400 });
    }

    return NextResponse.json({ user: { id: authData.user.id, name, email, role: role || "REP" } });
  } catch (err: unknown) {
    console.error("Create user catch error:", err);
    const message = err instanceof Error ? err.message : JSON.stringify(err) || "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

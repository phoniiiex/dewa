import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, role, phone, city } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Create auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification
      user_metadata: { name, role: role || "REP", phone: phone || "", city: city || "" },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
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
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ user: { id: authData.user.id, name, email, role } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

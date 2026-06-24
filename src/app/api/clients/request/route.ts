import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — list pending requests
export async function GET() {
  const { data, error } = await supabase
    .from("client_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data });
}

// POST — submit new request
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, owner, phone, city, type, requested_by, requested_by_id, notes } = body;
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("client_requests")
    .insert([{ name, owner, phone, city, type: type || "PHARMACY", requested_by, requested_by_id, notes, status: "PENDING" }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ request: data });
}

// PATCH — approve or reject
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, action, notes } = body; // action: "APPROVE" | "REJECT"

  if (action === "APPROVE") {
    // Fetch the request
    const { data: req_data, error: fetchErr } = await supabase
      .from("client_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !req_data) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    // Create actual client in clients table
    const { error: clientErr } = await supabase
      .from("clients")
      .insert([{
        id: crypto.randomUUID(),
        name: req_data.name,
        owner: req_data.owner || "",
        phone: req_data.phone || "",
        city: req_data.city || "",
        type: req_data.type || "PHARMACY",
        rep_id: null,
        payment_terms: "NET30",
        balance: 0,
        is_active: true,
      }]);

    if (clientErr) return NextResponse.json({ error: clientErr.message }, { status: 500 });
  }

  // Update request status
  const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
  const { error: updateErr } = await supabase
    .from("client_requests")
    .update({ status: newStatus, notes: notes || null })
    .eq("id", id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ success: true, status: newStatus });
}

// DELETE — delete one request (by id) or all non-pending (clear history)
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const clearAll = searchParams.get("clearAll");

  if (clearAll === "true") {
    // Delete all APPROVED and REJECTED requests (keep PENDING intact)
    const { error } = await supabase
      .from("client_requests")
      .delete()
      .in("status", ["APPROVED", "REJECTED"]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, cleared: true });
  }

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase
    .from("client_requests")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

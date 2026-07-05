// GET /api/rep-locations
// Returns all rep_locations rows enriched with profile_pic from the reps table.
// Uses admin client to bypass RLS.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  try {
    const admin = createAdminClient();

    // Fetch locations
    const { data: locs, error } = await admin
      .from("rep_locations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!locs || locs.length === 0) return NextResponse.json({ locations: [] });

    // Fetch all reps to look up profile pictures by telegram_chat_id
    const { data: reps } = await admin
      .from("reps")
      .select("telegram_chat_id, profile_pic, name");

    const repMap = new Map<string, { profile_pic: string; name: string }>();
    (reps || []).forEach((r: { telegram_chat_id: string; profile_pic: string; name: string }) => {
      if (r.telegram_chat_id) repMap.set(String(r.telegram_chat_id), r);
    });

    // Enrich: prefer reps.profile_pic, fall back to rep_locations.profile_pic_url
    const enriched = locs.map(l => {
      const rep = repMap.get(String(l.chat_id));
      return {
        ...l,
        profile_pic_url: rep?.profile_pic || l.profile_pic_url || "",
        rep_name:        rep?.name        || l.rep_name || "",
      };
    });

    return NextResponse.json({ locations: enriched });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

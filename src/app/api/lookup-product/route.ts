import { NextRequest, NextResponse } from "next/server";

interface LookupResult {
  found: boolean;
  barcode: string;
  name?: string;
  nameEn?: string;
  manufacturer?: string;
  description?: string;
  category?: string;
  origin?: string;
  activeIngredients?: string;
  dosageForm?: string;
  strength?: string;
  imageUrl?: string;
}

export async function GET(req: NextRequest) {
  const barcode = req.nextUrl.searchParams.get("barcode")?.trim();
  if (!barcode) return NextResponse.json({ error: "barcode required" }, { status: 400 });

  // ── 1. Try OpenFDA NDC database ───────────────────────────────────────────
  try {
    const clean = barcode.replace(/^0+/, ""); // strip leading zeros for NDC
    const fdaRes = await fetch(
      `https://api.fda.gov/drug/ndc.json?search=product_ndc:"${clean}"&limit=1`,
      { next: { revalidate: 3600 } }
    );
    if (fdaRes.ok) {
      const fdaData = await fdaRes.json();
      const r = fdaData?.results?.[0];
      if (r) {
        const ingredients = r.active_ingredients?.map((i: { name: string; strength: string }) => `${i.name} ${i.strength}`).join(", ");
        return NextResponse.json({
          found: true,
          barcode,
          nameEn: r.brand_name || r.generic_name || "",
          name: r.brand_name || r.generic_name || "",
          manufacturer: r.labeler_name || "",
          category: r.pharm_class?.join(", ") || "دەرمان",
          origin: "ئەمریکا",
          activeIngredients: ingredients || "",
          dosageForm: r.dosage_form || "",
          strength: r.active_ingredients?.[0]?.strength || "",
          description: `${r.brand_name || r.generic_name} — ${r.dosage_form || ""} — ${ingredients || ""}`.trim(),
        } as LookupResult);
      }
    }
  } catch { /* continue */ }

  // ── 2. Try OpenFDA Drug Labels ────────────────────────────────────────────
  try {
    const fdaRes = await fetch(
      `https://api.fda.gov/drug/label.json?search=openfda.upc:"${barcode}"&limit=1`,
      { next: { revalidate: 3600 } }
    );
    if (fdaRes.ok) {
      const fdaData = await fdaRes.json();
      const r = fdaData?.results?.[0];
      if (r) {
        const brandName = r.openfda?.brand_name?.[0] || r.openfda?.generic_name?.[0] || "";
        const manufacturer = r.openfda?.manufacturer_name?.[0] || "";
        return NextResponse.json({
          found: true,
          barcode,
          nameEn: brandName,
          name: brandName,
          manufacturer,
          category: "دەرمان",
          activeIngredients: r.active_ingredient?.join("; ") || "",
          dosageForm: r.dosage_and_administration_table?.[0] || "",
          description: r.purpose?.[0] || r.indications_and_usage?.[0]?.slice(0, 200) || "",
        } as LookupResult);
      }
    }
  } catch { /* continue */ }

  // ── 3. Try Open Medicine Facts ─────────────────────────────────────────────
  try {
    const omfRes = await fetch(
      `https://world.openmedicinesfacts.org/api/v2/product/${barcode}.json`,
      { next: { revalidate: 3600 } }
    );
    if (omfRes.ok) {
      const omfData = await omfRes.json();
      const p = omfData?.product;
      if (p?.product_name) {
        return NextResponse.json({
          found: true,
          barcode,
          nameEn: p.product_name_en || p.product_name || "",
          name: p.product_name || "",
          manufacturer: p.brands || p.producer || "",
          category: p.categories?.split(",")[0]?.trim() || "دەرمان",
          origin: p.origins || p.countries || "",
          description: p.generic_name || "",
          imageUrl: p.image_url || p.image_small_url || "",
        } as LookupResult);
      }
    }
  } catch { /* continue */ }

  // ── 4. Try Open Food Facts (some medicines are there) ────────────────────
  try {
    const offRes = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      { next: { revalidate: 3600 } }
    );
    if (offRes.ok) {
      const offData = await offRes.json();
      const p = offData?.product;
      if (p?.product_name) {
        return NextResponse.json({
          found: true,
          barcode,
          nameEn: p.product_name_en || p.product_name || "",
          name: p.product_name || "",
          manufacturer: p.brands || "",
          category: "دەرمان",
          origin: p.origins || p.countries || "",
          description: p.generic_name || "",
          imageUrl: p.image_url || p.image_small_url || "",
        } as LookupResult);
      }
    }
  } catch { /* continue */ }

  // ── Not found ─────────────────────────────────────────────────────────────
  return NextResponse.json({ found: false, barcode } as LookupResult);
}

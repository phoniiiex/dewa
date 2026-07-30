// ============================================
// Kurdistan Region — Location Data
// ============================================
// 9 primary regions: 5 cities + 4 independent administrations
// Each region has districts, each district has sub-districts.
// First district of every region is always "[Region] Center".

export interface SubDistrict {
  name: string;       // Kurdish name
}

export interface District {
  name: string;       // Kurdish name
  subDistricts: SubDistrict[];
}

export interface Region {
  name: string;       // Kurdish name
  type: "CITY" | "ADMIN"; // City or Independent Administration
  districts: District[];
}

export const REGIONS: Region[] = [
  // ═══════════════════════════════════════════
  // CITIES
  // ═══════════════════════════════════════════
  {
    name: "هەولێر",
    type: "CITY",
    districts: [
      { name: "ناوەندی هەولێر", subDistricts: [] },
      { name: "شقڵاوە", subDistricts: [{ name: "حریر" }, { name: "سەلاحەدین" }] },
      { name: "خەبات", subDistricts: [{ name: "ئەینکاوە" }] },
      { name: "دارەتوو", subDistricts: [] },
      { name: "کوێستان", subDistricts: [] },
      { name: "بنەسڵاوە", subDistricts: [] },
      { name: "مەخمور", subDistricts: [{ name: "گوێر" }, { name: "دبس" }] },
      { name: "قوشتەپە", subDistricts: [] },
      { name: "ڕوانزی", subDistricts: [] },
    ],
  },
  {
    name: "سلێمانی",
    type: "CITY",
    districts: [
      { name: "ناوەندی سلێمانی", subDistricts: [] },
      { name: "بازیان", subDistricts: [] },
      { name: "سەید سادق", subDistricts: [{ name: "خورمال" }] },
      { name: "شارەزوور", subDistricts: [{ name: "زەرگوێز" }] },
      { name: "دوکان", subDistricts: [] },
      { name: "چوارتا", subDistricts: [] },
      { name: "قەرەداغ", subDistricts: [] },
      { name: "مەوەت", subDistricts: [] },
      { name: "دەربەندیخان", subDistricts: [] },
      { name: "پیردە", subDistricts: [] },
      { name: "هەڵەبجە", subDistricts: [] }, // also accessible via Halabja region
    ],
  },
  {
    name: "دهۆک",
    type: "CITY",
    districts: [
      { name: "ناوەندی دهۆک", subDistricts: [] },
      { name: "عەمادیە", subDistricts: [] },
      { name: "سەمێل", subDistricts: [] },
      { name: "ئاکرێ", subDistricts: [] },
      { name: "بارزان", subDistricts: [] },
      { name: "شێخان", subDistricts: [] },
      { name: "باتێل", subDistricts: [] },
      { name: "مانگێش", subDistricts: [] },
    ],
  },
  {
    name: "کەرکوک",
    type: "CITY",
    districts: [
      { name: "ناوەندی کەرکوک", subDistricts: [] },
      { name: "داقوق", subDistricts: [] },
      { name: "دوبز", subDistricts: [] },
      { name: "ئەلتون کوپری", subDistricts: [] },
      { name: "لەیلان", subDistricts: [] },
    ],
  },
  {
    name: "هەڵەبجە",
    type: "CITY",
    districts: [
      { name: "ناوەندی هەڵەبجە", subDistricts: [] },
      { name: "بیارە", subDistricts: [] },
      { name: "خورمال", subDistricts: [] },
      { name: "سەیید سادق", subDistricts: [] },
    ],
  },

  // ═══════════════════════════════════════════
  // INDEPENDENT ADMINISTRATIONS
  // ═══════════════════════════════════════════
  {
    name: "ڕاپەڕین (ڕانیە)",
    type: "ADMIN",
    districts: [
      { name: "ناوەندی ڕانیە", subDistricts: [] },
      { name: "قەڵادزێ", subDistricts: [] },
      { name: "حاجی ئاوا", subDistricts: [] },
      { name: "چوارقوڕنە", subDistricts: [] },
    ],
  },
  {
    name: "گەرمیان (کەلار)",
    type: "ADMIN",
    districts: [
      { name: "ناوەندی کەلار", subDistricts: [] },
      { name: "کفری", subDistricts: [] },
      { name: "پێنجوێن", subDistricts: [] },
      { name: "چەمچەماڵ", subDistricts: [] },
      { name: "ئاگجەلەر", subDistricts: [] },
    ],
  },
  {
    name: "سۆران",
    type: "ADMIN",
    districts: [
      { name: "ناوەندی سۆران", subDistricts: [] },
      { name: "دیانا", subDistricts: [] },
      { name: "مێرگەسور", subDistricts: [] },
      { name: "ڕواندز", subDistricts: [] },
      { name: "جومان", subDistricts: [] },
      { name: "سدەکان", subDistricts: [] },
    ],
  },
  {
    name: "زاخۆ",
    type: "ADMIN",
    districts: [
      { name: "ناوەندی زاخۆ", subDistricts: [] },
      { name: "باتیفا", subDistricts: [] },
      { name: "دارکار", subDistricts: [] },
      { name: "ئیبراهیم خەلیل", subDistricts: [] },
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────────

/** Get all region names (flat list) */
export function getRegionNames(): string[] {
  return REGIONS.map(r => r.name);
}

/** Get districts for a region name */
export function getDistricts(regionName: string): District[] {
  return REGIONS.find(r => r.name === regionName)?.districts || [];
}

/** Get sub-districts for a region + district name */
export function getSubDistricts(regionName: string, districtName: string): SubDistrict[] {
  return getDistricts(regionName).find(d => d.name === districtName)?.subDistricts || [];
}

/** Build a location path string: "Region > District" or "Region > District > SubDistrict" */
export function buildLocationPath(region: string, district?: string, subDistrict?: string): string {
  if (!district) return region;
  if (!subDistrict) return `${region} > ${district}`;
  return `${region} > ${district} > ${subDistrict}`;
}

/** Extract region name from a location path string */
export function extractRegion(locationPath: string): string {
  return locationPath.split(" > ")[0].trim();
}

/** Parse a full location path into parts */
export function parseLocationPath(path: string): { region: string; district: string; subDistrict: string } {
  const parts = path.split(" > ").map(s => s.trim());
  return {
    region: parts[0] || "",
    district: parts[1] || "",
    subDistrict: parts[2] || "",
  };
}

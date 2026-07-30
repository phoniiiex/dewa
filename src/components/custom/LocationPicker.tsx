"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { REGIONS, getDistricts, getSubDistricts, buildLocationPath, parseLocationPath } from "@/lib/locations";

interface LocationPickerProps {
  value: string;                 // full path: "هەولێر > ناوەندی هەولێر"
  onChange: (path: string) => void;
  label?: string;
  required?: boolean;
  /** If true, only show region level (no district/sub-district) */
  regionOnly?: boolean;
}

export default function LocationPicker({ value, onChange, label = "شوێن", required, regionOnly }: LocationPickerProps) {
  const parsed = parseLocationPath(value);
  const [region, setRegion] = useState(parsed.region);
  const [district, setDistrict] = useState(parsed.district);
  const [subDistrict, setSubDistrict] = useState(parsed.subDistrict);

  // Sync internal state when value prop changes externally
  useEffect(() => {
    const p = parseLocationPath(value);
    setRegion(p.region);
    setDistrict(p.district);
    setSubDistrict(p.subDistrict);
  }, [value]);

  const districts = region ? getDistricts(region) : [];
  const subDistricts = region && district ? getSubDistricts(region, district) : [];

  const handleRegionChange = (v: string | null) => {
    if (!v) return;
    setRegion(v);
    setDistrict("");
    setSubDistrict("");
    if (regionOnly) {
      onChange(v);
    } else {
      onChange(v); // partial — will be updated when district is selected
    }
  };

  const handleDistrictChange = (v: string | null) => {
    if (!v) return;
    setDistrict(v);
    setSubDistrict("");
    onChange(buildLocationPath(region, v));
  };

  const handleSubDistrictChange = (v: string | null) => {
    if (!v) return;
    setSubDistrict(v);
    onChange(buildLocationPath(region, district, v));
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="grid grid-cols-1 gap-2" style={{ gridTemplateColumns: regionOnly ? "1fr" : subDistricts.length > 0 ? "1fr 1fr 1fr" : districts.length > 0 ? "1fr 1fr" : "1fr" }}>
        {/* Region */}
        <Select value={region || null} onValueChange={handleRegionChange}>
          <SelectTrigger>
            <SelectValue placeholder="ناوچە هەڵبژێرە..." />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">شارەکان</div>
            {REGIONS.filter(r => r.type === "CITY").map(r => (
              <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
            ))}
            <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1 border-t">بەڕێوەبەرایەتییە سەربەخۆکان</div>
            {REGIONS.filter(r => r.type === "ADMIN").map(r => (
              <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* District */}
        {!regionOnly && districts.length > 0 && (
          <Select value={district || null} onValueChange={handleDistrictChange}>
            <SelectTrigger>
              <SelectValue placeholder="قەزا..." />
            </SelectTrigger>
            <SelectContent>
              {districts.map(d => (
                <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Sub-district */}
        {!regionOnly && subDistricts.length > 0 && (
          <Select value={subDistrict || null} onValueChange={handleSubDistrictChange}>
            <SelectTrigger>
              <SelectValue placeholder="ناحیە..." />
            </SelectTrigger>
            <SelectContent>
              {subDistricts.map(sd => (
                <SelectItem key={sd.name} value={sd.name}>{sd.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

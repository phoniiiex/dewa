export interface Country {
  name: string; // Kurdish/Arabic display name
  nameEn: string; // English name for search
  flag: string; // Flag emoji
  code: string; // ISO 3166-1 alpha-2
}

export const COUNTRIES: Country[] = [
  // Kurdistan first
  { name: "کوردستان ☀️", nameEn: "Kurdistan", flag: "☀️", code: "KRD" },
  // Middle East & Central Asia
  { name: "عێراق 🇮🇶", nameEn: "Iraq", flag: "🇮🇶", code: "IQ" },
  { name: "تورکیا 🇹🇷", nameEn: "Turkey", flag: "🇹🇷", code: "TR" },
  { name: "ئێران 🇮🇷", nameEn: "Iran", flag: "🇮🇷", code: "IR" },
  { name: "ئوردن 🇯🇴", nameEn: "Jordan", flag: "🇯🇴", code: "JO" },
  { name: "عەرەبستانی سعوودی 🇸🇦", nameEn: "Saudi Arabia", flag: "🇸🇦", code: "SA" },
  { name: "ئیمارات 🇦🇪", nameEn: "UAE", flag: "🇦🇪", code: "AE" },
  { name: "کوەیت 🇰🇼", nameEn: "Kuwait", flag: "🇰🇼", code: "KW" },
  { name: "قەتەر 🇶🇦", nameEn: "Qatar", flag: "🇶🇦", code: "QA" },
  { name: "بەحرەین 🇧🇭", nameEn: "Bahrain", flag: "🇧🇭", code: "BH" },
  { name: "عومان 🇴🇲", nameEn: "Oman", flag: "🇴🇲", code: "OM" },
  { name: "یەمەن 🇾🇪", nameEn: "Yemen", flag: "🇾🇪", code: "YE" },
  { name: "سووریا 🇸🇾", nameEn: "Syria", flag: "🇸🇾", code: "SY" },
  { name: "لوبنان 🇱🇧", nameEn: "Lebanon", flag: "🇱🇧", code: "LB" },
  { name: "فەلەستین 🇵🇸", nameEn: "Palestine", flag: "🇵🇸", code: "PS" },
  { name: "ئیسرائیل 🇮🇱", nameEn: "Israel", flag: "🇮🇱", code: "IL" },
  { name: "ئەفغانستان 🇦🇫", nameEn: "Afghanistan", flag: "🇦🇫", code: "AF" },
  { name: "پاکستان 🇵🇰", nameEn: "Pakistan", flag: "🇵🇰", code: "PK" },
  { name: "ئەزەربایجان 🇦🇿", nameEn: "Azerbaijan", flag: "🇦🇿", code: "AZ" },
  { name: "ئەرمەنستان 🇦🇲", nameEn: "Armenia", flag: "🇦🇲", code: "AM" },
  { name: "گورجستان 🇬🇪", nameEn: "Georgia", flag: "🇬🇪", code: "GE" },
  { name: "قازاخستان 🇰🇿", nameEn: "Kazakhstan", flag: "🇰🇿", code: "KZ" },
  { name: "ئوزبەکستان 🇺🇿", nameEn: "Uzbekistan", flag: "🇺🇿", code: "UZ" },

  // Europe
  { name: "فەرەنسا 🇫🇷", nameEn: "France", flag: "🇫🇷", code: "FR" },
  { name: "ئەڵمانیا 🇩🇪", nameEn: "Germany", flag: "🇩🇪", code: "DE" },
  { name: "بریتانیا 🇬🇧", nameEn: "United Kingdom", flag: "🇬🇧", code: "GB" },
  { name: "ئیتالیا 🇮🇹", nameEn: "Italy", flag: "🇮🇹", code: "IT" },
  { name: "ئیسپانیا 🇪🇸", nameEn: "Spain", flag: "🇪🇸", code: "ES" },
  { name: "سوویسرا 🇨🇭", nameEn: "Switzerland", flag: "🇨🇭", code: "CH" },
  { name: "هۆڵەندا 🇳🇱", nameEn: "Netherlands", flag: "🇳🇱", code: "NL" },
  { name: "بەلژیک 🇧🇪", nameEn: "Belgium", flag: "🇧🇪", code: "BE" },
  { name: "سویید 🇸🇪", nameEn: "Sweden", flag: "🇸🇪", code: "SE" },
  { name: "نۆرویج 🇳🇴", nameEn: "Norway", flag: "🇳🇴", code: "NO" },
  { name: "دانمارک 🇩🇰", nameEn: "Denmark", flag: "🇩🇰", code: "DK" },
  { name: "فینلەند 🇫🇮", nameEn: "Finland", flag: "🇫🇮", code: "FI" },
  { name: "پۆلەند 🇵🇱", nameEn: "Poland", flag: "🇵🇱", code: "PL" },
  { name: "چیک 🇨🇿", nameEn: "Czech Republic", flag: "🇨🇿", code: "CZ" },
  { name: "ئۆستریا 🇦🇹", nameEn: "Austria", flag: "🇦🇹", code: "AT" },
  { name: "پۆرتوگال 🇵🇹", nameEn: "Portugal", flag: "🇵🇹", code: "PT" },
  { name: "یۆنان 🇬🇷", nameEn: "Greece", flag: "🇬🇷", code: "GR" },
  { name: "رووسیا 🇷🇺", nameEn: "Russia", flag: "🇷🇺", code: "RU" },
  { name: "ئوکرانیا 🇺🇦", nameEn: "Ukraine", flag: "🇺🇦", code: "UA" },
  { name: "رومانیا 🇷🇴", nameEn: "Romania", flag: "🇷🇴", code: "RO" },
  { name: "هەنگاریا 🇭🇺", nameEn: "Hungary", flag: "🇭🇺", code: "HU" },
  { name: "بۆلگاریا 🇧🇬", nameEn: "Bulgaria", flag: "🇧🇬", code: "BG" },
  { name: "سربیا 🇷🇸", nameEn: "Serbia", flag: "🇷🇸", code: "RS" },
  { name: "کرواتیا 🇭🇷", nameEn: "Croatia", flag: "🇭🇷", code: "HR" },
  { name: "سلۆڤاکیا 🇸🇰", nameEn: "Slovakia", flag: "🇸🇰", code: "SK" },
  { name: "ئیرلەند 🇮🇪", nameEn: "Ireland", flag: "🇮🇪", code: "IE" },
  { name: "لووکسەمبورگ 🇱🇺", nameEn: "Luxembourg", flag: "🇱🇺", code: "LU" },
  { name: "ئیستۆنیا 🇪🇪", nameEn: "Estonia", flag: "🇪🇪", code: "EE" },
  { name: "لاتڤیا 🇱🇻", nameEn: "Latvia", flag: "🇱🇻", code: "LV" },
  { name: "لیتوانیا 🇱🇹", nameEn: "Lithuania", flag: "🇱🇹", code: "LT" },

  // Asia
  { name: "هندستان 🇮🇳", nameEn: "India", flag: "🇮🇳", code: "IN" },
  { name: "چین 🇨🇳", nameEn: "China", flag: "🇨🇳", code: "CN" },
  { name: "جاپۆن 🇯🇵", nameEn: "Japan", flag: "🇯🇵", code: "JP" },
  { name: "کۆریای باشوور 🇰🇷", nameEn: "South Korea", flag: "🇰🇷", code: "KR" },
  { name: "کۆریای باکوور 🇰🇵", nameEn: "North Korea", flag: "🇰🇵", code: "KP" },
  { name: "ڤیەتنام 🇻🇳", nameEn: "Vietnam", flag: "🇻🇳", code: "VN" },
  { name: "تایلەند 🇹🇭", nameEn: "Thailand", flag: "🇹🇭", code: "TH" },
  { name: "مالیزیا 🇲🇾", nameEn: "Malaysia", flag: "🇲🇾", code: "MY" },
  { name: "سنگاپور 🇸🇬", nameEn: "Singapore", flag: "🇸🇬", code: "SG" },
  { name: "ئیندۆنیزیا 🇮🇩", nameEn: "Indonesia", flag: "🇮🇩", code: "ID" },
  { name: "فیلیپین 🇵🇭", nameEn: "Philippines", flag: "🇵🇭", code: "PH" },
  { name: "بەنگلادیش 🇧🇩", nameEn: "Bangladesh", flag: "🇧🇩", code: "BD" },
  { name: "سریلانکا 🇱🇰", nameEn: "Sri Lanka", flag: "🇱🇰", code: "LK" },
  { name: "نیپال 🇳🇵", nameEn: "Nepal", flag: "🇳🇵", code: "NP" },
  { name: "تایوان 🇹🇼", nameEn: "Taiwan", flag: "🇹🇼", code: "TW" },
  { name: "هۆنگ کۆنگ 🇭🇰", nameEn: "Hong Kong", flag: "🇭🇰", code: "HK" },
  { name: "مەنگۆلیا 🇲🇳", nameEn: "Mongolia", flag: "🇲🇳", code: "MN" },
  { name: "میانمار 🇲🇲", nameEn: "Myanmar", flag: "🇲🇲", code: "MM" },
  { name: "کامبۆدیا 🇰🇭", nameEn: "Cambodia", flag: "🇰🇭", code: "KH" },

  // Americas
  { name: "ئەمریکا 🇺🇸", nameEn: "United States", flag: "🇺🇸", code: "US" },
  { name: "کانەدا 🇨🇦", nameEn: "Canada", flag: "🇨🇦", code: "CA" },
  { name: "مێکسیکۆ 🇲🇽", nameEn: "Mexico", flag: "🇲🇽", code: "MX" },
  { name: "برازیل 🇧🇷", nameEn: "Brazil", flag: "🇧🇷", code: "BR" },
  { name: "ئارژانتین 🇦🇷", nameEn: "Argentina", flag: "🇦🇷", code: "AR" },
  { name: "شیلی 🇨🇱", nameEn: "Chile", flag: "🇨🇱", code: "CL" },
  { name: "کۆلۆمبیا 🇨🇴", nameEn: "Colombia", flag: "🇨🇴", code: "CO" },
  { name: "پیرو 🇵🇪", nameEn: "Peru", flag: "🇵🇪", code: "PE" },
  { name: "ڤینیزویلا 🇻🇪", nameEn: "Venezuela", flag: "🇻🇪", code: "VE" },
  { name: "کووبا 🇨🇺", nameEn: "Cuba", flag: "🇨🇺", code: "CU" },

  // Africa
  { name: "مەسر 🇪🇬", nameEn: "Egypt", flag: "🇪🇬", code: "EG" },
  { name: "لیبیا 🇱🇾", nameEn: "Libya", flag: "🇱🇾", code: "LY" },
  { name: "تونس 🇹🇳", nameEn: "Tunisia", flag: "🇹🇳", code: "TN" },
  { name: "مەغریب 🇲🇦", nameEn: "Morocco", flag: "🇲🇦", code: "MA" },
  { name: "ئەلجەزایر 🇩🇿", nameEn: "Algeria", flag: "🇩🇿", code: "DZ" },
  { name: "سوودان 🇸🇩", nameEn: "Sudan", flag: "🇸🇩", code: "SD" },
  { name: "نایجیریا 🇳🇬", nameEn: "Nigeria", flag: "🇳🇬", code: "NG" },
  { name: "ئەفریقای باشوور 🇿🇦", nameEn: "South Africa", flag: "🇿🇦", code: "ZA" },
  { name: "کینیا 🇰🇪", nameEn: "Kenya", flag: "🇰🇪", code: "KE" },
  { name: "ئەتیۆپیا 🇪🇹", nameEn: "Ethiopia", flag: "🇪🇹", code: "ET" },
  { name: "گانا 🇬🇭", nameEn: "Ghana", flag: "🇬🇭", code: "GH" },
  { name: "ئوگەندا 🇺🇬", nameEn: "Uganda", flag: "🇺🇬", code: "UG" },
  { name: "تانزانیا 🇹🇿", nameEn: "Tanzania", flag: "🇹🇿", code: "TZ" },
  { name: "سومالیا 🇸🇴", nameEn: "Somalia", flag: "🇸🇴", code: "SO" },
  { name: "رواندا 🇷🇼", nameEn: "Rwanda", flag: "🇷🇼", code: "RW" },

  // Oceania
  { name: "ئۆسترالیا 🇦🇺", nameEn: "Australia", flag: "🇦🇺", code: "AU" },
  { name: "نیوزیلەند 🇳🇿", nameEn: "New Zealand", flag: "🇳🇿", code: "NZ" },
];

// Helper: get display string for a country
export function countryDisplay(c: Country) {
  return `${c.flag} ${c.nameEn}`;
}

/**
 * Kurdish (Sorani) number-to-words converter for IQD amounts.
 * Extracted from debtReceipt.ts for reuse across the print system.
 */

export function amountInWords(amount: number): string {
  if (amount === 0) return "سفر دینار";
  const ones = ["", "یەک", "دوو", "سێ", "چوار", "پێنج", "شەش", "حەوت", "هەشت", "نۆ", "دە",
    "یازدە", "دوازدە", "سیازدە", "چواردە", "پازدە", "شازدە", "حەڤدە", "هەژدە", "نۆزدە"];
  const tens  = ["", "", "بیست", "سی", "چل", "پەنجا", "شەست", "حەفتا", "هەشتا", "نەوەد"];
  const pows  = ["", "هەزار", "ملیۆن", "ملیار"];

  function chunk(n: number): string {
    if (n === 0) return "";
    let result = "";
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;
    if (h > 0) result += ones[h] + " سەد ";
    if (t > 1)  result += tens[t] + (o > 0 ? " و " + ones[o] : "");
    else if (t === 1) result += ones[10 + o];
    else if (o > 0)  result += ones[o];
    return result.trim();
  }

  const groups: string[] = [];
  let remaining = Math.round(amount);
  let idx = 0;
  while (remaining > 0) {
    const g = remaining % 1000;
    if (g !== 0) groups.unshift(chunk(g) + (pows[idx] ? " " + pows[idx] : ""));
    remaining = Math.floor(remaining / 1000);
    idx++;
  }
  return groups.join(" و ") + " دینار";
}

// ============================================
// DEWA — QR Code Generator (base64 PNG data URL)
// Using a PNG data URL avoids SVG injection issues in print windows.
// ============================================
import QRCode from "qrcode";

/** Returns a base64 PNG data URL for the given URL */
export async function generateQRDataUrl(url: string, size: number = 200): Promise<string> {
  const dataUrl = await QRCode.toDataURL(url, {
    width: size,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
  return dataUrl;
}

/** Returns a ready-to-inject <img> HTML tag */
export async function generateQRImg(url: string, size: number = 140): Promise<string> {
  const dataUrl = await generateQRDataUrl(url, size);
  return `<img src="${dataUrl}" width="${size}" height="${size}" style="display:block;border-radius:6px;" alt="QR" />`;
}

/** @deprecated use generateQRDataUrl or generateQRImg instead */
export async function generateQRSvg(url: string, size: number = 200): Promise<string> {
  return generateQRImg(url, size);
}

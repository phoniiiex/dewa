// ============================================
// DEWA — Standard QR Code Generator (SVG)
// ============================================
import QRCode from "qrcode";

export async function generateQRSvg(url: string, size: number = 200): Promise<string> {
  const svg = await QRCode.toString(url, {
    type: "svg",
    width: size,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
  return svg;
}

import QRCode from 'qrcode';

/** SVG markup for a QR code. White modules on a transparent background, scales with CSS. */
export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#ffffffff', light: '#00000000' },
  });
}

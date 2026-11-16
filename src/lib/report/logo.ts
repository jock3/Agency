/**
 * Logotyp till en kvadratisk PNG på 128 × 128 px: bilden får plats med genomskinlig
 * kant. Då ser den likadan ut på skärmen och i PDF:en. Bara för webbläsaren (canvas).
 * Ingen logotyp ritas av oss, användaren laddar upp plattformarnas egna filer.
 */
const SIZE = 128;
/** Samma tak som normalizeDoc. En större bild skulle tyst tas bort vid sparning. */
const MAX_CHARS = 110_000;

export type LogoError = "type" | "read" | "decode" | "big";

export function processLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\//.test(file.type) && !/\.svg$/i.test(file.name)) return reject(new Error("type" satisfies LogoError));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read" satisfies LogoError));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode" satisfies LogoError));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("decode" satisfies LogoError));
        const w = img.naturalWidth || SIZE;
        const h = img.naturalHeight || SIZE;
        const k = Math.min(SIZE / w, SIZE / h);
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, (SIZE - w * k) / 2, (SIZE - h * k) / 2, w * k, h * k);
        const url = canvas.toDataURL("image/png");
        if (url.length > MAX_CHARS) return reject(new Error("big" satisfies LogoError));
        resolve(url);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

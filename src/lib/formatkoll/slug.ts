/**
 * Sluggen är hela säkerhetsmodellen för delningslänken: den som har länken
 * kommer in, ingen annan. Därför 12 tecken ur ett alfabet utan glyfer som går
 * att förväxla när någon läser upp eller skriver av en länk — inga 0/O, 1/l/I.
 *
 * 54^12 ≈ 5.7e20 möjliga slugs. Gissning är inte en realistisk väg in.
 */
const ALPHABET = "23456789abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ";
const LENGTH = 12;

export function newSlug(): string {
  const bytes = new Uint8Array(LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < LENGTH; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export const ADMIN_ERRORS: Record<string, string> = {
  UNAUTHORIZED: "Du är utloggad. Logga in igen.",
  FORBIDDEN: "Bara admin kan göra det här.",
  NOT_AUTHORIZED: "Bara admin kan göra det här.",
  USER_NOT_FOUND: "Användaren finns inte längre. Ladda om sidan.",
  INVALID_PIN: "PIN-koden måste vara exakt 6 siffror.",
  INVALID_INPUT: "Ogiltigt val. Ladda om sidan.",
  SELF_DEMOTE: "Du kan inte ta bort din egen adminroll. Be en annan admin.",
  LAST_ADMIN: "Det måste finnas minst en admin.",
  NAME_TAKEN: "Namnet är redan taget.",
  NAME_REQUIRED: "Ange ett namn.",
  SERVER_ERROR: "Något gick fel på servern. Försök igen.",
};
export const FALLBACK = "Något gick fel. Försök igen.";

/** Slumpad PIN med sex siffror, från webbläsarens kryptografiska slump. */
export function randomPin(): string {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return String(n[0] % 1_000_000).padStart(6, "0");
}

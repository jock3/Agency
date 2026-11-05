export const ADS_ERRORS: Record<string, string> = {
  UNAUTHORIZED: "Du är utloggad. Logga in igen.",
  FORBIDDEN: "Bara admin kan göra det här.",
  INVALID_NAME: "Ge företaget ett namn (högst 120 tecken).",
  DUPLICATE: "Det finns redan ett företag med det namnet.",
  USER_NOT_FOUND: "Ingen användare heter så. Skriv namnet exakt som vid inloggning, och skapa användaren på Admin först.",
  NOT_FOUND: "Företaget finns inte längre.",
  SERVER_ERROR: "Något gick fel på servern. Försök igen.",
};
export const FALLBACK = "Något gick fel. Försök igen.";

export const AUDIT_ERRORS: Record<string, string> = {
  INVALID_URL: "Det ser inte ut som en giltig webbadress.",
  BLOCKED_HOST: "Den adressen kan inte granskas.",
  TIMEOUT: "Sajten svarade inte i tid. Prova igen om en stund.",
  NETWORK: "Kom inte åt sajten. Kontrollera adressen.",
  TOO_LARGE: "Sidan är för stor för att granskas.",
  TOO_MANY_REDIRECTS: "Sajten omdirigerar för många gånger.",
  SITE_ERROR: "Sajten svarade med ett fel.",
  NOT_HTML: "Adressen pekar inte på en webbsida.",
  AI_DISABLED: "AI är avstängt. Lägg in ANTHROPIC_API_KEY i miljövariablerna.",
  WRONG_DOMAIN: "Adressen hör inte till projektets domän.",
  INVALID_NAME: "Ge projektet ett namn.",
  DUPLICATE: "Det finns redan ett projekt för den domänen.",
  NOT_FOUND: "Projektet finns inte längre.",
  SERVER_ERROR: "Något gick fel på servern. Försök igen.",
};
export const fallbackError = "Något gick fel. Försök igen.";

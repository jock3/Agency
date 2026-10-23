/** Ett projekt är en domän. "www." räknas som samma domän. */
export const projectDomain = (url: URL) => url.hostname.replace(/^www\./, "");

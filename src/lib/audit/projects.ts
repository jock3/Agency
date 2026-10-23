/** Ett projekt är en domän. "www." räknas som samma domän. */
export const domainOf = (host: string) => host.replace(/^www\./, "");

export const projectDomain = (url: URL) => domainOf(url.hostname);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Tillgänglighetsgranskningen kör Chromium på servern. Paketen laddas med
  // vanlig require, och Chromiums komprimerade binärer måste följa med i
  // funktionen (de läses från disk, så spårningen hittar dem inte själv).
  serverExternalPackages: ["puppeteer-core", "axe-core"],
  outputFileTracingIncludes: {
    "/api/tillganglighet/run": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
  // Mediaplaner och Kampanjer har flyttat till en egen app. Gamla bokmärken
  // skickas dit; delningslänkarna /share/[token] skickas vidare från sin sida.
  async redirects() {
    return [
      { source: "/mediaplan/:path*", destination: "https://mediaplan.milou.se/mediaplan/:path*", permanent: false },
      { source: "/kampanj", destination: "https://mediaplan.milou.se/mediaplan", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        // Ingen annan sajt får rama in appen (skydd mot klickkapning).
        // /share/audit undantas här och får egna regler nedan; två
        // frame-ancestors-huvuden på samma sida skulle stoppa inbäddningen.
        source: "/((?!share/audit).*)",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        // Auditverktyget bäddas in på milou.se med iframe. Bara de domänerna
        // (och appen själv) får rama in sidan.
        source: "/share/audit",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://milou.se https://*.milou.se",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

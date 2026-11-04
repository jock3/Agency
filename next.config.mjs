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
  async headers() {
    return [
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

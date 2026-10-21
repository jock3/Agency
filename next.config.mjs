/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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

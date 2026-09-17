import type { MetadataRoute } from "next";

/* Makes the board installable as a standalone app (Chrome/Edge "Install",
 * Safari "Add to Dock", phone home screen). It opens straight on /todo, but the
 * scope is the whole site so login redirects and the other tools stay inside
 * the app window instead of bouncing out to the browser. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/todo",
    name: "Milou Uppgifter",
    short_name: "Uppgifter",
    description: "Milous uppgiftstavla",
    start_url: "/todo",
    scope: "/",
    display: "standalone",
    background_color: "#F9FAFB",
    theme_color: "#1C1C1C",
    lang: "sv",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

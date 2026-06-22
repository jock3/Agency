import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Komet", "system-ui", "sans-serif"],
        accent: ["Verveine", "cursive"],
      },
      colors: {
        milou: {
          "100": "#FEE5EA",
          "200": "#FDB0BF",
          "300": "#FB7A94",
          "400": "#F54366",
          "500": "#E60330",
          "600": "#C20028",
          "700": "#931644",
          "800": "#5B173C",
          "900": "#35132B",
        },
      },
    },
  },
  plugins: [],
};

export default config;

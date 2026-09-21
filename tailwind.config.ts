import type { Config } from "tailwindcss";

// Paletten följer milou.se (se docs/milou-grafiskt-uttryck.md). gray och red
// skrivs över i stället för att läggas till, så att alla befintliga
// gray-*/red-*-klasser i appen får webbplatsens neutrala grå och röda familj
// utan att varje komponent behöver skrivas om.
const milouRed = {
  "50": "#FFF2F0",
  "100": "#FFDED0", // light-beige
  "200": "#FFBFB6", // peach
  "300": "#FF999C", // light-red
  "400": "#EE3558",
  "500": "#E60330", // brand-milou-red
  "600": "#B80226", // brand-milou-red-darkened
  "700": "#931644",
  "800": "#5B173C", // purple
  "900": "#35132B", // dark-purple
};

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Komet", "system-ui", "sans-serif"],
        accent: ["Verveine", "cursive"],
      },
      colors: {
        milou: milouRed,
        red: milouRed,
        gray: {
          "50": "#F2F2F2", // light-gray
          "100": "#EAEAEA",
          "200": "#DDDDDD",
          "300": "#C4C4C4",
          "400": "#AAAAAA", // mid-gray
          "500": "#8F8F8F", // gray
          "600": "#6C6C6C", // text-secondary
          "700": "#4A4A4A",
          "800": "#2B2B2B", // dark-gray
          "900": "#1C1C1C", // almost-black
          "950": "#111111",
        },
        peach: { DEFAULT: "#FFBFB6", dark: "#CC9992" },
        beige: "#FFDED0",
        blush: "#FF999C",
        plum: { DEFAULT: "#5B173C", dark: "#35132B" },
      },
      // Webbplatsen har raka hörn överallt. Alla steg utom full nollas, så
      // runda prickar, avatarer och reglage behåller sin form.
      borderRadius: {
        none: "0",
        sm: "0",
        DEFAULT: "0",
        md: "0",
        lg: "0",
        xl: "0",
        "2xl": "0",
        "3xl": "0",
      },
      // Förskjuten färgplatta utan oskärpa, som bakom bilderna på milou.se.
      boxShadow: {
        "plate-peach": "-12px 12px 0 0 #FFBFB6",
        "plate-beige": "12px -12px 0 0 #FFDED0",
        "plate-blush": "-12px -12px 0 0 #FF999C",
      },
      backgroundImage: {
        "red-fade":
          "linear-gradient(121deg, #e60330 3.15%, #c02058 72.68%, #ba245e 83.11%, #b52863 92.15%, #b02c68 101.88%, #9d3a7c 136.65%)",
      },
    },
  },
  plugins: [],
};

export default config;

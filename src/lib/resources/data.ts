/**
 * Resurssamlingen. Länkarna är hämtade från https://jock3.github.io/CAdesign/resources/
 * (62 st, 2026-11-20). Egna skills ligger först och laddas ner som zip från public/skills/.
 */

export const RESOURCE_TYPES = {
  SKILL: "Skill",
  MCP: "MCP",
  LIB: "Bibliotek",
  DOCS: "Riktlinjer",
  INSPO: "Inspiration",
  TOOL: "Verktyg",
} as const;
export type ResourceType = keyof typeof RESOURCE_TYPES;

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  category: string;
  /** Extern länk, eller för egna skills en nedladdning. */
  url: string;
  /** Sätts bara på egna skills: filen i public/skills/. */
  download?: string;
  tags: string[];
}

export const CATEGORIES: { id: string; title: string; description: string }[] = [
  { id: "own-skills", title: "Egna skills", description: "Dina globala skills för Claude Code. Packa upp zip-filen i ~/.claude/skills/." },
  { id: "components", title: "Komponentbibliotek", description: "React/Tailwind-komponenter att kopiera in eller installera via shadcn." },
  { id: "motion", title: "Animation & shaders", description: "Bibliotek för rörelse, 3D och GPU-effekter — det som får sidor att kännas levande." },
  { id: "color", title: "Färg", description: "Generera, testa och tillgänglighetssäkra paletter." },
  { id: "type", title: "Typografi", description: "Typsnitt, par och skalor." },
  { id: "assets", title: "Ikoner & assets", description: "Ikoner, loggor och illustrationer." },
  { id: "inspo", title: "Inspiration", description: "Kurerade gallerier och riktiga produktflöden att referera mot." },
  { id: "tools", title: "Verktyg — rörelse, 3D & mockups", description: "GUI-verktyg du bygger i; flera har runtimes så Claude kan embedda resultatet." },
  { id: "ai", title: "AI-verktyg", description: "Generativa verktyg för bild och UI." },
  { id: "skills", title: "AI-skills för Claude Code", description: "Installeras i Claude Code och ändrar hur Claude bygger." },
  { id: "mcp", title: "MCP-servrar", description: "Servrar Claude Code kan anropa direkt under arbetet." },
  { id: "docs", title: "Riktlinjer & discovery", description: "Regelverk att mata in i Claude, och kataloger för att hitta mer." },
]

export const RESOURCES: Resource[] = [
  {
    id: "skill-code",
    title: "code",
    description: "Ett flöde för att skriva, fixa och granska kod: plan, bygg, verifiera, granska, släpp och säkerhetskoll. Inkluderar Supabase- och ship-guider.",
    type: "SKILL",
    category: "own-skills",
    url: "/skills/code.zip",
    download: "code.zip",
    tags: ["kod", "granskning", "supabase", "deploy", "egen"],
  },
  {
    id: "skill-design",
    title: "design",
    description: "Ett flöde för att bygga, kritisera och polera gränssnitt, samt göra diagram och grafer som HTML, SVG och PNG.",
    type: "SKILL",
    category: "own-skills",
    url: "/skills/design.zip",
    download: "design.zip",
    tags: ["design", "ui", "diagram", "egen"],
  },
  { id: "r-shadcn-ui-0", title: "shadcn/ui", description: "Tillgängliga copy-paste-komponenter på Radix + Tailwind. Grunden för modern React-UI.", type: "LIB", category: "components", url: "https://ui.shadcn.com", tags: [] },
  { id: "r-21st-dev-1", title: "21st.dev", description: "Tusentals community-block — hero, pricing, shaders, knappar (som den här sidans liquid-metal-knapp).", type: "LIB", category: "components", url: "https://21st.dev/community/components", tags: [] },
  { id: "r-magic-ui-2", title: "Magic UI", description: "150+ animerade React/Tailwind-komponenter. shadcn-registry-kompatibelt.", type: "LIB", category: "components", url: "https://magicui.design", tags: [] },
  { id: "r-aceternity-ui-3", title: "Aceternity UI", description: "Påkostade animerade komponenter (Motion). Copy-paste eller via shadcn.", type: "LIB", category: "components", url: "https://ui.aceternity.com", tags: [] },
  { id: "r-react-bits-4", title: "React Bits", description: "Animerade React-komponenter och bakgrunder, copy-paste.", type: "LIB", category: "components", url: "https://reactbits.dev", tags: [] },
  { id: "r-cult-ui-5", title: "Cult UI", description: "Animerade shadcn-baserade komponenter med karaktär.", type: "LIB", category: "components", url: "https://www.cult-ui.com", tags: [] },
  { id: "r-motion-framer-motion-6", title: "Motion (Framer Motion)", description: "Deklarativa animationer för React. Driver övergångarna på den här sidan.", type: "LIB", category: "motion", url: "https://motion.dev", tags: [] },
  { id: "r-gsap-7", title: "GSAP", description: "Kraftfullaste animationsbiblioteket, numera helt gratis. Avancerad scroll/timeline.", type: "LIB", category: "motion", url: "https://gsap.com", tags: [] },
  { id: "r-anime-js-8", title: "Anime.js", description: "Lätt JS-animationsbibliotek — perfekt för micro-animations.", type: "LIB", category: "motion", url: "https://animejs.com", tags: [] },
  { id: "r-paper-shaders-9", title: "Paper Shaders", description: "Liquid-metal och andra GPU-shaders som React-komponenter. Driver knapparna här.", type: "LIB", category: "motion", url: "https://paper.design", tags: [] },
  { id: "r-three-js-10", title: "Three.js", description: "WebGL-3D i webbläsaren — bas för scener, partiklar och shaders.", type: "LIB", category: "motion", url: "https://threejs.org", tags: [] },
  { id: "r-lottie-11", title: "Lottie", description: "Lätta vektoranimationer (JSON) från After Effects, för webb och mobil.", type: "LIB", category: "motion", url: "https://lottiefiles.com", tags: [] },
  { id: "r-shadergradient-12", title: "ShaderGradient", description: "Animerade gradient-/shader-bakgrunder (three.js) med npm-paket + plugin.", type: "LIB", category: "motion", url: "https://shadergradient.co", tags: [] },
  { id: "r-coolors-13", title: "Coolors", description: "Snabb palettgenerator med kontrastkoll och förhandsvisning på riktig UI.", type: "TOOL", category: "color", url: "https://coolors.co", tags: [] },
  { id: "r-realtime-colors-14", title: "Realtime Colors", description: "Testa palett + typografi live på en färdig landningssida innan du bestämmer dig.", type: "TOOL", category: "color", url: "https://www.realtimecolors.com", tags: [] },
  { id: "r-huemint-15", title: "Huemint", description: "AI-genererade paletter för brand, webb och illustration.", type: "TOOL", category: "color", url: "https://huemint.com", tags: [] },
  { id: "r-colormind-16", title: "Colormind", description: "AI-palettgenerator som lär sig färgharmoni från foton och konst.", type: "TOOL", category: "color", url: "http://colormind.io", tags: [] },
  { id: "r-google-fonts-17", title: "Google Fonts", description: "Öppna webbtypsnitt, optimerade för prestanda (self-hostas via next/font).", type: "TOOL", category: "type", url: "https://fonts.google.com", tags: [] },
  { id: "r-fontshare-18", title: "Fontshare", description: "Gratis kvalitetstypsnitt med generösa licenser, av Indian Type Foundry.", type: "TOOL", category: "type", url: "https://www.fontshare.com", tags: [] },
  { id: "r-fontpair-19", title: "Fontpair", description: "Kurerade typsnittspar — bra startpunkt för rubrik/brödtext.", type: "INSPO", category: "type", url: "https://www.fontpair.co", tags: [] },
  { id: "r-typescale-20", title: "Typescale", description: "Bygg en modulär typografisk skala visuellt och kopiera CSS:en.", type: "TOOL", category: "type", url: "https://typescale.com", tags: [] },
  { id: "r-lucide-21", title: "Lucide", description: "Rent, konsekvent ikonset — finns redan i den här stacken.", type: "LIB", category: "assets", url: "https://lucide.dev", tags: [] },
  { id: "r-tabler-icons-22", title: "Tabler Icons", description: "Stort gratis outline-ikonset (5 000+).", type: "LIB", category: "assets", url: "https://tabler.io/icons", tags: [] },
  { id: "r-phosphor-icons-23", title: "Phosphor Icons", description: "Flexibelt ikonset i sex vikter — thin till fill.", type: "LIB", category: "assets", url: "https://phosphoricons.com", tags: [] },
  { id: "r-svgl-app-24", title: "svgl.app", description: "Brand-/logo-SVG:er via API. Bra för \"trusted by\"-loggor.", type: "LIB", category: "assets", url: "https://svgl.app", tags: [] },
  { id: "r-undraw-25", title: "unDraw", description: "Öppna illustrationer som auto-färgas till din palett.", type: "TOOL", category: "assets", url: "https://undraw.co", tags: [] },
  { id: "r-awwwards-26", title: "Awwwards", description: "Prisbelönt, jurybedömd webbdesign på den vassaste nivån.", type: "INSPO", category: "inspo", url: "https://www.awwwards.com", tags: [] },
  { id: "r-godly-27", title: "Godly", description: "High-end webbdesign med exceptionell animation och scroll-effekter.", type: "INSPO", category: "inspo", url: "https://godly.website", tags: [] },
  { id: "r-siteinspire-28", title: "SiteInspire", description: "Handplockat galleri sedan 2010 — konsekvent hög kvalitet.", type: "INSPO", category: "inspo", url: "https://www.siteinspire.com", tags: [] },
  { id: "r-dark-29", title: "Dark", description: "Galleri kurerat helt kring mörka gränssnitt.", type: "INSPO", category: "inspo", url: "https://www.dark.design", tags: [] },
  { id: "r-minimal-gallery-30", title: "Minimal Gallery", description: "Minimalistisk, ren webbdesign.", type: "INSPO", category: "inspo", url: "https://minimal.gallery", tags: [] },
  { id: "r-land-book-31", title: "Land-book", description: "Landningssidor taggade per affärsmodell — jämför värdeerbjudanden.", type: "INSPO", category: "inspo", url: "https://land-book.com", tags: [] },
  { id: "r-mobbin-32", title: "Mobbin", description: "Riktiga app-/webbskärmar och flöden. Go-to för UX-mönster.", type: "INSPO", category: "inspo", url: "https://mobbin.com", tags: [] },
  { id: "r-refero-33", title: "Refero", description: "Sökbart bibliotek med riktiga app-/webb-UI:er (Mobbin-likt).", type: "INSPO", category: "inspo", url: "https://refero.design", tags: [] },
  { id: "r-unsection-34", title: "Unsection", description: "4 000+ kurerade webb-sektioner (hero, CTA, footer), filtrerbara på stil.", type: "INSPO", category: "inspo", url: "https://www.unsection.com", tags: [] },
  { id: "r-design-spells-35", title: "Design Spells", description: "Små förtjusande UI-detaljer — mikrointeraktionerna som känns dyra.", type: "INSPO", category: "inspo", url: "https://designspells.com", tags: [] },
  { id: "r-httpster-36", title: "Httpster", description: "Rå, trendig webbdesign-inspiration utan filter.", type: "INSPO", category: "inspo", url: "https://httpster.net", tags: [] },
  { id: "r-screens-design-37", title: "Screens Design", description: "App-skärmar och flöden som video från riktiga appar.", type: "INSPO", category: "inspo", url: "https://screensdesign.com/library", tags: [] },
  { id: "r-page-flows-38", title: "Page Flows", description: "Inspelade UX-flöden från riktiga produkter (onboarding, checkout m.m.).", type: "INSPO", category: "inspo", url: "https://pageflows.com", tags: [] },
  { id: "r-spline-39", title: "Spline", description: "3D-designverktyg för webb; embedda scenen med react-spline.", type: "TOOL", category: "tools", url: "https://spline.design", tags: [] },
  { id: "r-unicorn-studio-40", title: "Unicorn Studio", description: "No-code interaktiva/animerade WebGL-visuals att embedda.", type: "TOOL", category: "tools", url: "https://www.unicorn.studio", tags: [] },
  { id: "r-jitter-41", title: "Jitter", description: "Webbaserat motion design-verktyg för animerad grafik och video.", type: "TOOL", category: "tools", url: "https://jitter.video", tags: [] },
  { id: "r-haikei-42", title: "Haikei", description: "Generera SVG-bakgrunder — vågor, blobs, mesh-gradients.", type: "TOOL", category: "tools", url: "https://haikei.app", tags: [] },
  { id: "r-shots-43", title: "Shots", description: "Snygga device-mockups och ramar för screenshots.", type: "TOOL", category: "tools", url: "https://shots.so", tags: [] },
  { id: "r-figcomponents-44", title: "Figcomponents", description: "Gratis Figma-komponenter och UI-kits.", type: "TOOL", category: "tools", url: "https://www.figcomponents.com", tags: [] },
  { id: "r-figma-45", title: "Figma", description: "Standarden för UI-design, nu med AI-utkast, auto-layout-förslag och sök.", type: "TOOL", category: "ai", url: "https://www.figma.com", tags: [] },
  { id: "r-midjourney-46", title: "Midjourney", description: "Guldstandard för AI-bildgenerering — moodboards, texturer, koncept.", type: "TOOL", category: "ai", url: "https://www.midjourney.com", tags: [] },
  { id: "r-google-stitch-47", title: "Google Stitch", description: "Genererar produktionsduglig UI för mobil/webb från text (f.d. Galileo AI).", type: "TOOL", category: "ai", url: "https://stitch.withgoogle.com", tags: [] },
  { id: "r-adobe-firefly-48", title: "Adobe Firefly", description: "Kommersiellt säker generativ AI, integrerad i Photoshop, Illustrator m.fl.", type: "TOOL", category: "ai", url: "https://www.adobe.com/products/firefly.html", tags: [] },
  { id: "r-taste-skill-49", title: "Taste Skill", description: "Ger AI-agenter \"smak\" och stoppar generiska frontends. 13 varianter. npx skills add Leonxlnx/taste-skill", type: "SKILL", category: "skills", url: "https://www.tasteskill.dev", tags: [] },
  { id: "r-ui-ux-pro-max-50", title: "UI UX Pro Max", description: "Sökbar databas över UI-stilar, paletter, typsnittspar och UX-regler. Användes för den här designen.", type: "SKILL", category: "skills", url: "https://ui-ux-pro-max-skill.nextlevelbuilder.io", tags: [] },
  { id: "r-boraoztunc-skills-51", title: "boraoztunc/skills", description: "Copywriting (Ogilvy, stop-slop), SEO och design-skills som slash-kommandon.", type: "SKILL", category: "skills", url: "https://github.com/boraoztunc/skills", tags: [] },
  { id: "r-anthropic-skills-52", title: "Anthropic Skills", description: "Anthropics officiella skills — docx, pptx, pdf, xlsx m.fl.", type: "SKILL", category: "skills", url: "https://github.com/anthropics/skills", tags: [] },
  { id: "r-shadcn-skills-53", title: "shadcn Skills", description: "shadcns egna skills, komplement till deras MCP.", type: "SKILL", category: "skills", url: "https://ui.shadcn.com/docs/skills", tags: [] },
  { id: "r-ruflo-54", title: "ruflo", description: "Agent-meta-harness för Claude Code — deploya multi-agent-swärmar med delat minne, neural routing och 300+ MCP-verktyg. Som npm-paket, Claude Code-plugins eller MCP-server.", type: "MCP", category: "mcp", url: "https://github.com/ruvnet/ruflo", tags: [] },
  { id: "r-21st-dev-magic-55", title: "21st.dev Magic", description: "Generera och hämta UI-komponenter direkt i Claude Code med naturligt språk.", type: "MCP", category: "mcp", url: "https://21st.dev/magic", tags: [] },
  { id: "r-shadcn-mcp-56", title: "shadcn MCP", description: "Bläddra, sök och installera shadcn-komponenter. npx shadcn@latest mcp init --client claude", type: "MCP", category: "mcp", url: "https://ui.shadcn.com/docs/mcp", tags: [] },
  { id: "r-supabase-mcp-57", title: "Supabase MCP", description: "Databas, migrationer och Edge Functions direkt från Claude.", type: "MCP", category: "mcp", url: "https://supabase.com/docs/guides/getting-started/mcp", tags: [] },
  { id: "r-github-mcp-58", title: "GitHub MCP", description: "PRs, issues, actions och kod via Claude — driver deployen av den här sidan.", type: "MCP", category: "mcp", url: "https://github.com/github/github-mcp-server", tags: [] },
  { id: "r-vercel-web-interface-guidelines-59", title: "Vercel Web Interface Guidelines", description: "Konkreta regler för interaktion, layout, innehåll och tillgänglighet.", type: "DOCS", category: "docs", url: "https://vercel.com/design/guidelines", tags: [] },
  { id: "r-toools-design-60", title: "toools.design", description: "Stor kurerad katalog över design-resurser, verktyg och inspiration.", type: "TOOL", category: "docs", url: "https://www.toools.design", tags: [] },
  { id: "r-toolfolio-61", title: "Toolfolio", description: "Kurerad katalog + nyhetsbrev över design-/dev-/marketing-verktyg och deals.", type: "TOOL", category: "docs", url: "https://toolfolio.io", tags: [] },
]

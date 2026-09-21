# Milou – grafiskt uttryck (skrapat från milou.se)

Källa: milou.se, 2026-09-17. Startsidan, /vad-vi-gor/, /vad-vi-gor/varumarke/, /vara-case/,
/case/fenomenalen/, /nyheter/, /vilka-vi-ar/, /filosofi/, /vara-kontor/.
Mätt i Chrome med beräknade stilar i desktopbredd (~1100 px). Hover-lägen och mobilvy är inte mätta.

Teknik: WordPress-tema `milou.se` byggt med Tailwind (`tailwind.dist.css`). Komponenterna har
prefixet `mc-`. Typsnittet laddas från Adobe Fonts (Typekit, kit `ifc4ywc`).

---

## Färg

Sajtens egna CSS-variabler från `:root`, ordagrant:

| Variabel | Värde | Används till |
|---|---|---|
| `--color-brand-milou-red` | `#E60330` | Pilknappar, CTA, gradientstart |
| `--color-brand-milou-red-darkened` | `#B80226` | Hover på rött |
| `--color-almost-black` | `#1C1C1C` | Hero, meny, footer |
| `--color-dark-gray` | `#2B2B2B` | Primär text (`--color-text-primary`), mörka sektioner |
| `--color-text-secondary` | `#6C6C6C` | Etiketter ("Nyhet", kundnamn) |
| `--color-gray` | `#8F8F8F` | |
| `--color-mid-gray` | `#AAAAAA` | Sekundär text på mörkt |
| `--color-light-gray` / `--color-light-grey` | `#F2F2F2` | Ljusgrå sektioner |
| `--color-white` | `#FFFFFF` | |
| `--color-dark-purple` | `#35132B` | Mörklila sektion, nyhetsrubriker |
| `--color-purple` | `#5B173C` | Namnband i porträtt |
| `--color-peach` | `#FFBFB6` | Aktiv menypunkt, rubrikband, kortskugga, accent på mörkt |
| `--color-peach-20` | `rgb(255 191 182 / 20%)` | |
| `--color-peach-darkened` | `#CC9992` | |
| `--color-light-red` | `#FF999C` | Tjänstekapsel, kortskugga, sektion |
| `--color-light-beige` | `#FFDED0` | Sektioner, text på mörklila, kortskugga |
| `--color-teal` | `#16917A` | Definierad, syns inte på de besökta sidorna |
| `--color-light-teal` | `#C2EDE5` | Definierad, syns inte på de besökta sidorna |
| `--color-dark-turqoise` | `#052D28` | Definierad, syns inte på de besökta sidorna |

**Gradient** `--gradient-red-fade` (Kontakta-blocket "Hör av dig!" och "Do good" på /filosofi/):

```css
linear-gradient(121deg, #e60330 3.15%, #c02058 72.68%, #ba245e 83.11%,
  #b52863 92.15%, #b02c68 101.88%, #9d3a7c 136.65%);
```

**Sektionsteman** (klasser på sajten): `mc-theme--white`, `mc-theme--gray-light` (#F2F2F2),
`mc-theme--gray-dark` (#2B2B2B), `mc-theme-black-almost` (#1C1C1C), `mc-theme-purple-dark`
(#35132B), `mc-theme-red-light` (#FF999C), `mc-theme-beige-light` (#FFDED0), `mc-theme-red-fade`
(gradienten). Sidor byggs som helbreddsband i de här färgerna, direkt efter varandra.

Grundregeln: mörk hero (#1C1C1C) upptill, rött bara i små ytor (knappar, gradientblock) och
persika/beige/ljusröd som de stora mjuka ytorna.

## Typografi

**Ett typsnitt: Komet** (`komet, sans-serif`) i alla texter. Laddade vikter: 400, 500, 700, 800
(plus kursiv 400 och 700). Ingen bokstavsspärrning och inga versaler.

| Roll | Storlek / radhöjd | Vikt | Exempel |
|---|---|---|---|
| Hero H1 | 80/80 px | 800 | "We're ordinary people." |
| Sidrubrik (enklare hero) | 60/75 px | 800 | "Våra case" |
| Stor bannerrubrik | 60/75 px | 800 | "We're ordinary people. But not your ordinary agency." |
| Sektionsrubrik H2 | 40/45 px (även 40/50, 40/40) | 800 | "Nytt hos oss", "Hör av dig!" |
| Kortrubrik | 30/33.75 px | 800 | Nyhets- och case-titlar, tjänster |
| Underrubrik i brödtext | 30/37.5 px | 800 | "Vem är du?" |
| E-post i kontaktblock | 70/98 px | 700, understruken | hello@milou.se |
| Ingress | 24/36 px | 400 | |
| Brödtext | 16/24 px | 400 | |
| Länk/CTA-text | 16/24 px | 700 | |
| Meny | 14/20 px | 700 | |
| Etikett | 16/24 px | 700, #6C6C6C | "Nyhet", kundnamn |

**Tagline** i två rader: "Beautiful experiences." i persika eller ljusröd, "For everyone." i vitt.

**Rubrikband:** hero-rubriker ligger i tätt åtsittande färgblock per rad, växelvis #5B173C (med
vit text) och #FFBFB6 (med mörk text), som markerad text.

## Former och detaljer

- **Raka hörn överallt.** Border-radius 0 på bilder, kort och knappar. Undantagen är runda ikoner,
  paus-knappen (9999 px) och tjänstekapslarna på /vad-vi-gor/.
- **Förskjuten färgplatta bakom bilder** är signaturdetaljen. En solid box-shadow utan oskärpa i
  varierande riktning och färg:
  - `-24px -20px 0 #FF999C`
  - `20px -32px 0 #FFDED0`
  - `-20px 20px 0 #FFBFB6`
  Bilderna i nyhets- och case-korten är 4:5.
- **Pilknapp:** röd kvadrat (#E60330) 57×57 px, padding 16 px, med vit tunn pil →. Sitter centrerad
  under varje kort och efter textblock.
- **Tillbaka-knapp:** samma röda kvadrat med ←, följd av texten "Alla erbjudanden" / "Alla case".
- **Meny:** 14 px/700 vita länkar med padding 0 12 px och höjd 40 px. Aktiv punkt har persikafärgad
  bakgrund (#FFBFB6) med mörk text och raka hörn. Längst till höger sitter en rund "Kontakta
  oss"-stämpel med text i cirkel runt en pil.
- **Tjänstekapslar** (/vad-vi-gor/): höga pillerformade kort i #FF999C, #35132B, #FFDED0 och #FFBFB6,
  förskjutna i höjdled.
- **Runda ikonstämplar:** cirklar i ljusröd/persika med text runt kanten ("VARUMÄRKE"), ovanför
  tjänstekorten på startsidan.
- **Taggar** på case-sidor: små vita rektanglar med mörk text (Design, Kommunikation, Koncept).
- **Konturlogotyp:** MILOU i vit kontur ovanpå showreel-videon på startsidan.
- **Ramar:** nästan inga. 1 px persika eller beige förekommer bara på fokuslänkar och
  cookieknappar.
- **Övergångar:** `transform 0.3s ease-in-out` och `all 0.5s cubic-bezier(0.4, 0, 0.2, 1)`.

## Layout

- Innehållsbredd max **1112 px**, yttre ram 1536 px. Sidopadding 1.5 rem mobil / 2 rem desktop
  (`--side-padding`).
- Sektioner i helbredd med stor vertikal luft: 96 px (`mc-block-padding`), större block ~128 px.
- Kortgrid i 3 kolumner med stort radavstånd (gap-y 96 px, gap-x 56 px). Texten i korten är
  centrerad.
- Tvåspaltiga band: rubrik till vänster och text till höger (/filosofi/), eller text till vänster
  och bild eller karta till höger (/vara-kontor/).
- Kontaktblock: rött gradientblock som går ut i högerkanten och överlappar footern.
- Footer i #1C1C1C med liten röd kvadratlogga, adressuppgifter och två länkkolumner.

## Bildspråk

- Riktiga människor och kontorsmiljöer. Svartvitt för team- och personalbilder (/vilka-vi-ar/,
  kontaktpersoner), färg för case.
- Porträtt i nyheter har ett grafiskt namnband: mörklila (#5B173C) eller persika block med namnet,
  ibland i handskrivet typsnitt (inbränt i bilden, inte webbtext), plus en vit MILOU-logga.
- Case-bilder visas i helbredd eller brett, med rundade hörn bara på vissa inbäddade bilder.
- Illustrationer förekommer i case (platt, varm vektorstil).

## Direkt användbart i Agency-repot

Stämmer redan: Komet, `milou-500 = #E60330`, `#1C1C1C` i toppraden och `#2B2B2B`.

Saknas i `tailwind.config.ts`, förslag:

```ts
milou: { ... },          // befintlig
peach:  { DEFAULT: "#FFBFB6", dark: "#CC9992" },
beige:  "#FFDED0",
"light-red": "#FF999C",
plum:   { DEFAULT: "#5B173C", dark: "#35132B" }, // finns redan som milou-800 och milou-900
```

Skillnader mot sajten: appen använder rundade hörn (`rounded-lg`, `rounded-xl`) och Tailwinds
kalla grå (#F3F4F6, #E5E7EB). Sajten har raka hörn och neutrala grå (#F2F2F2).

/**
 * History inicial mockado — espelha o array HISTORY do mockup HTML original.
 * Aparece no rail antes do user gerar qualquer coisa real.
 * Substituído por /generations real assim que loadHistory() resolve.
 */
export type HistoryItem = {
  p: string;
  img: string;
  t: string;
  pin?: string;
  kind?: "image" | "video";
};

const A = "/refine-assets/";

export const HISTORY_MOCK: HistoryItem[] = [
  { p: "editorial · golden hour", img: `${A}editorial-1.jpg`, t: "hoje · 14:22", pin: "FAV" },
  { p: "persona · cyberpunk neon", img: `${A}persona-f1.jpg`, t: "hoje · 13:48" },
  { p: "product · monster grape", img: `${A}product-hero.jpg`, t: "ontem · 19:01" },
  { p: "fashion lookbook ss26", img: `${A}editorial-2.jpg`, t: "ontem · 17:30" },
  { p: "fantasy · dragon scene", img: `${A}fantasy-1.png`, t: "ontem · 12:11" },
  { p: "sci-fi cinematic teaser", img: `${A}art-1.jpg`, t: "23 abr · 22:05", pin: "REMIX" },
  { p: "3D character · pokemon", img: `${A}char3d-1.png`, t: "23 abr · 18:44" },
  { p: "luxury beauty editorial", img: `${A}editorial-3.jpg`, t: "22 abr · 09:12" },
  { p: "product hero · gold", img: `${A}product-2.png`, t: "22 abr · 02:30" },
  { p: "character · iron man", img: `${A}char-ironman.png`, t: "21 abr · 15:55" },
  { p: "abstract gradient", img: `${A}art-2.jpg`, t: "20 abr" },
  { p: "persona portrait", img: `${A}persona-portrait.png`, t: "20 abr" },
];

import type { InternationalString } from "@iiif/presentation-3";

export function getLabelByUserLanguage(label: InternationalString): string[] {
  const userLangs = navigator.languages || [navigator.language];
  const lang = userLangs.find((l) => label[l]) || "none";
  const titles = label[lang] ? label[lang] : [];
  return titles;
}

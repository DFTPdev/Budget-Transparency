import { clean } from "./parse";

export type DpbItem = {
  id: string; title: string; amount: number;
  agency?: string; fund?: "GF"|"NGF"|"ALL"; chapter?: string;
  fiscalYear?: number; url?: string; notes?: string;
};

export function toItems(
  raw: { id: string; title: string; fy: number; amount: number }[],
  agency: string, url: string, chapter = "Chapter 725"
): DpbItem[] {
  return raw
    .filter(r => r.amount > 0)
    .map(r => ({
      id: clean(r.id),
      title: clean(r.title),
      amount: r.amount,
      agency: clean(agency),
      fund: "ALL",
      chapter,
      fiscalYear: r.fy || undefined,
      url
    }));
}
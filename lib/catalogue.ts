import "server-only";
import raw from "@/data/catalogue.json";
import type { Catalogue } from "./catalogue-types";
export const catalogue = raw as unknown as Catalogue;
export const getWork = (id: string) => catalogue.works.find((w) => w.id === id);

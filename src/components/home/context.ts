import type { HomeData } from "@/lib/willow/types";

/** What every Home section gets: the loaded data, an optimistic edit, and a full reload if a save fails. */
export type HomeCtx = {
  data: HomeData;
  edit: (fn: (d: HomeData) => HomeData) => void;
  reload: () => void;
};

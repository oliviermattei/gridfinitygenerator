import type { BuildPlate } from "@repo/geometry";
import type { ArticleModel } from "../basket";
import type { ArticleMeasure, StackChoice } from "./article-measure";
import type { BasketDownloadOptions, BasketDownloadPlan, BasketFile } from "./basket-download";

/** Requests from the basket page to its engine worker; each one gets a response with its id. */
export type BasketEngineRequest =
  | {
      id: number;
      type: "measure";
      model: ArticleModel;
      /** Query string of the article's share link. */
      link: string;
      /** Build plate a baseplate is cut for, and every article is checked against. */
      buildPlate: BuildPlate;
      /** How the pieces of a cut baseplate print stacked, or null side by side (#42: its objects). */
      stack: StackChoice | null;
    }
  | {
      id: number;
      /** The file of the basket (#43): progress messages, then the file. */
      type: "download";
      plan: BasketDownloadPlan;
      options: BasketDownloadOptions;
    };

/** Messages from the basket engine worker back to the page. */
export type BasketEngineResponse =
  | { id: number; type: "measure"; measure: ArticleMeasure }
  | { id: number; type: "progress"; done: number; total: number }
  | ({ id: number; type: "download" } & BasketFile)
  | { id: number; type: "error"; message: string };

import type { PackingProblem, PackingProgress, PackingSearch } from "@repo/geometry";

/** The request to the rangement worker: search the rangement of a problem (#42). */
export type PackingRequest = { type: "search"; problem: PackingProblem };

/** Messages from the rangement worker: each better rangement, then the end of the search. */
export type PackingResponse =
  | { type: "progress"; progress: PackingProgress }
  | { type: "done"; search: PackingSearch }
  | { type: "error"; message: string };

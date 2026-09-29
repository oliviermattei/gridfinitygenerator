import { expect, test } from "vitest";
import { LOCALES } from "../lib/i18n";
import { STRINGS } from "../lib/strings";

// Every text of the interface exists in every language (#14). The typecheck enforces it too:
// each language is typed with the shape of the French copy.

/** Every key path of a copy, with the kind of its value: a text, or a function and its arity. */
function shape(value: unknown, path = ""): string[] {
  if (typeof value === "function") return [`${path}: function(${value.length})`];
  if (value !== null && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .flatMap((key) => shape((value as Record<string, unknown>)[key], path ? `${path}.${key}` : key));
  }
  return [`${path}: ${typeof value}`];
}

/** Every text of a copy, the functions called with placeholder arguments. */
function texts(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (typeof value === "function") return [[path, String(value(...Array.from({ length: value.length }, () => "1")))]];
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => texts(child, path ? `${path}.${key}` : key));
  }
  return [];
}

test.each(LOCALES.filter((locale) => locale !== "fr"))("the %s copy has exactly the keys of the French one", (locale) => {
  expect(shape(STRINGS[locale])).toEqual(shape(STRINGS.fr));
});

test.each(LOCALES)("no text of the %s copy is empty", (locale) => {
  const empty = texts(STRINGS[locale]).filter(([, text]) => text.trim() === "" || text.includes("undefined"));
  expect(empty).toEqual([]);
});

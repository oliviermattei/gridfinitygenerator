import type { ChangeEvent, ClipboardEvent } from "react";

const separators = new Map<string, string>();

/** The decimal separator of a locale: "," in French, "." in English. */
function decimalSeparator(locale: string): string {
  let decimal = separators.get(locale);
  if (decimal === undefined) {
    decimal = new Intl.NumberFormat(locale).formatToParts(0.5).find((part) => part.type === "decimal")?.value ?? ".";
    separators.set(locale, decimal);
  }
  return decimal;
}

/**
 * Typed text in either convention: a comma or a point becomes the decimal separator of the
 * locale, and spaces go (number fields show no thousands separator).
 */
function normalize(text: string, decimal: string): string {
  return text.replace(/\s/gu, "").replace(/[.,]/g, decimal);
}

/**
 * Handlers of a Base UI number input that accept a decimal comma and a decimal point in every
 * language. Base UI reads the locale's own separator only (a comma is a thousands separator in
 * English), so the text is rewritten before its handlers run: they run after these ones.
 */
export function decimalInputProps(locale: string) {
  const decimal = decimalSeparator(locale);
  return {
    onChange(event: ChangeEvent<HTMLInputElement>) {
      const input = event.currentTarget;
      const text = input.value;
      const next = normalize(text, decimal);
      if (next === text) return;
      const caret = normalize(text.slice(0, input.selectionStart ?? text.length), decimal).length;
      input.value = next;
      input.setSelectionRange(caret, caret);
    },
    onPaste(event: ClipboardEvent<HTMLInputElement>) {
      const pasted = event.clipboardData.getData("text/plain");
      const next = normalize(pasted, decimal);
      if (next === pasted) return;
      // Base UI parses a paste itself unless it is prevented: insert the rewritten text instead,
      // which goes through onChange like typing.
      event.preventDefault();
      document.execCommand("insertText", false, next);
    },
  };
}

const formats = new Map<number | undefined, Intl.NumberFormatOptions>();

/**
 * Display format of a number field: no thousands separator, since a comma is read as a
 * decimal one, and at most `fractionDigits` decimals when given (the same object each time).
 */
export function numberFieldFormat(fractionDigits?: number): Intl.NumberFormatOptions {
  let format = formats.get(fractionDigits);
  if (!format) {
    format = fractionDigits === undefined ? { useGrouping: false } : { useGrouping: false, maximumFractionDigits: fractionDigits };
    formats.set(fractionDigits, format);
  }
  return format;
}

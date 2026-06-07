// Shared helper for the per-chain token modules. Each
// `src/tokens/<chain>.ts` is a thin wrapper that reads its sibling
// JSON in `data/` and reshapes it into a symbol-keyed map — every
// chain does the exact same transform, so the loop and validation
// live here.

import type { TokenChainEntry } from "./types";

/**
 * Source-data row shape. Each per-chain JSON file is an array of
 * these — `symbol` carries the lookup key; the rest is the per-chain
 * entry surfaced to consumers.
 */
export interface TokenDataRow extends TokenChainEntry {
  readonly symbol: string;
}

/**
 * Build the symbol → TokenChainEntry map for a single chain's data
 * file. Throws on duplicate symbols so data-entry mistakes fail at
 * module load rather than silently overwriting.
 *
 * `sourceLabel` shows up in the duplicate-symbol error so callers can
 * point at the exact JSON file that needs cleaning up.
 *
 * Implementation notes:
 *   - Backing map uses `Object.create(null)` so `Object.prototype`
 *     keys (`toString`, `hasOwnProperty`, etc.) can't be mistaken for
 *     existing entries when checking for duplicates.
 *   - Duplicate detection goes through `Object.prototype.hasOwnProperty.call`
 *     for the same reason — `in` would still match inherited keys
 *     even if our map happened to acquire a prototype.
 *   - Together these neutralize the `__proto__` prototype-pollution
 *     vector that a curated catalog file shouldn't have anyway, but
 *     the defense is free and the data is parsed externally.
 */
export function buildChainTokenMap(
  rows: ReadonlyArray<TokenDataRow>,
  sourceLabel: string,
): Readonly<Record<string, TokenChainEntry>> {
  const out: Record<string, TokenChainEntry> = Object.create(null);
  for (const row of rows) {
    const { symbol, ...entry } = row;
    if (Object.prototype.hasOwnProperty.call(out, symbol)) {
      throw new Error(
        `[@avaprotocol/protocols] duplicate symbol "${symbol}" in ${sourceLabel} — ` +
          `each symbol must appear once per chain file.`,
      );
    }
    out[symbol] = Object.freeze(entry);
  }
  return Object.freeze(out);
}

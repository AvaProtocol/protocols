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
 */
export function buildChainTokenMap(
  rows: ReadonlyArray<TokenDataRow>,
  sourceLabel: string,
): Readonly<Record<string, TokenChainEntry>> {
  const out: Record<string, TokenChainEntry> = {};
  for (const row of rows) {
    const { symbol, ...entry } = row;
    if (out[symbol]) {
      throw new Error(
        `[@avaprotocol/protocols] duplicate symbol "${symbol}" in ${sourceLabel} — ` +
          `each symbol must appear once per chain file.`,
      );
    }
    out[symbol] = Object.freeze(entry);
  }
  return Object.freeze(out);
}

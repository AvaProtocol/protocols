// Top-level token catalog. Mirrors `Protocols.*` in shape but is
// keyed by ERC-20 symbol — tokens cross protocol boundaries (USDC
// is touched by every DEX, lending market, and template), so they
// don't belong nested under any single protocol module.
//
// Source data lives in `src/tokens/data/<chain>.json` — one file per
// chain, each an array of `{symbol, address, decimals, name?, ...}`
// records. That layout mirrors how upstream catalogs (Studio's
// `app/lib/erc20/*.json`, the EigenLayer-AVS gateway's
// `token_whitelist/*.json`) organize the same data, so adding tokens
// = appending a row to the right chain's JSON. The `Tokens` object
// surfaced by this module aggregates the per-chain rows into the
// `Tokens.SYMBOL[chainId]` shape at module load.
//
// Pre-existing per-protocol token addresses under
// `Protocols.{name}.tokens.{SYMBOL}` continue to work for backward
// compatibility — those carry only the address, not the wider
// metadata shipped here.
//
// Lookup patterns:
//   import { Tokens, Chains, lookupToken } from "@avaprotocol/protocols";
//
//   // By symbol + chain
//   const usdc = Tokens.USDC[Chains.EthereumMainnet];
//
//   // By contract address (reverse lookup)
//   const meta = lookupToken(Chains.EthereumMainnet, "0xA0b86991...");

import { Chains } from "../chains";
import { type TokenByChain, type TokenChainEntry } from "./types";

import ethereumData from "./data/ethereum.json" with { type: "json" };
import sepoliaData from "./data/sepolia.json" with { type: "json" };
import baseData from "./data/base.json" with { type: "json" };
import baseSepoliaData from "./data/base-sepolia.json" with { type: "json" };
import bnbMainnetData from "./data/bnb-mainnet.json" with { type: "json" };

export type { TokenByChain, TokenChainEntry, TokenLinks } from "./types";

// Source-data record. Each per-chain JSON file is an array of these.
// Identical shape to TokenChainEntry plus a `symbol` discriminator so
// each row stands alone (independent of position in any array).
interface TokenDataRow extends TokenChainEntry {
  readonly symbol: string;
}

const CHAIN_DATA: ReadonlyArray<readonly [number, ReadonlyArray<TokenDataRow>]> = Object.freeze([
  [Chains.EthereumMainnet, ethereumData as ReadonlyArray<TokenDataRow>],
  [Chains.Sepolia, sepoliaData as ReadonlyArray<TokenDataRow>],
  [Chains.BaseMainnet, baseData as ReadonlyArray<TokenDataRow>],
  [Chains.BaseSepolia, baseSepoliaData as ReadonlyArray<TokenDataRow>],
  [Chains.BnbMainnet, bnbMainnetData as ReadonlyArray<TokenDataRow>],
]);

/**
 * Walk every per-chain data file and group entries by symbol so the
 * public API stays `Tokens.SYMBOL[chainId]` regardless of how the
 * source is laid out. Built once at module load; the cost is bounded
 * by the catalog size and the result is frozen at the outer level
 * (see the comment on `Tokens` below).
 *
 * If a symbol appears in multiple chain files, the per-chain entries
 * merge into a single `TokenByChain` map — the natural shape for the
 * symbol-keyed lookup.
 *
 * Throws if the same `(symbol, chainId)` pair is defined twice within
 * the chain data files. Silently overwriting would mask data-entry
 * bugs (and the integrity tests can't detect them after the
 * overwrite), so we fail fast at module load — the cost is a
 * one-off process startup error pointing straight at the duplicate.
 */
function buildTokensFromData(): Record<string, TokenByChain> {
  const merged: Record<string, Record<number, TokenChainEntry>> = {};
  for (const [chainId, rows] of CHAIN_DATA) {
    for (const row of rows) {
      const { symbol, ...entry } = row;
      if (!merged[symbol]) merged[symbol] = {};
      if (merged[symbol][chainId] !== undefined) {
        throw new Error(
          `[@avaprotocol/protocols] duplicate token entry for symbol="${symbol}" ` +
            `on chainId=${chainId}. Each (symbol, chainId) pair must be unique across ` +
            `src/tokens/data/*.json — remove the duplicate row.`,
        );
      }
      merged[symbol][chainId] = entry;
    }
  }
  return merged;
}

/**
 * Symbol → per-chain entry. The outer object is frozen at module
 * load, so the symbol set is immutable. The inner per-chain maps
 * (e.g. `Tokens.USDC`) are NOT deep-frozen — callers must treat
 * them as logically read-only. The shallow freeze is the right
 * tradeoff: deep-freezing the chain maps + their entries on every
 * import would add overhead for a guarantee no consumer has asked
 * for. Add a deep-freeze pass here if a real misuse case emerges.
 *
 * Symbol keys preserve the casing used by the token's canonical
 * branding as published by upstream catalogs. Most symbols are
 * uppercase (USDC, WETH, AAVE) but mixed-case tickers exist where
 * the project explicitly brands that way (stETH, wstETH, axlUSDC,
 * cbBTC, USDbC, rETH, sUSDe). The catalog is intentionally NOT
 * case-insensitive at this level — `Tokens.usdc` is `undefined`,
 * not USDC — so callers needing fuzzy lookup should normalize at
 * their own boundary or use `lookupToken(chainId, address)` which
 * lookups by address (case-insensitive on address, but symbol-
 * agnostic).
 */
export const Tokens: Readonly<Record<string, TokenByChain>> = Object.freeze(buildTokensFromData());

/**
 * Reverse lookup: given a contract address, find the token entry plus
 * its symbol. Address matching is case-insensitive so callers can pass
 * checksum or lowercase without normalizing upstream.
 *
 * Resolution strategy:
 *   1. When `chainId` is provided, prefer a match registered for that
 *      chain.
 *   2. If no chain-specific match (or no chainId), scan every chain
 *      for the address. Necessary when the caller's chain context
 *      diverges from where the address actually lives — happens in
 *      multi-chain dev gateways where the workflow targets one chain
 *      but the runtime is bound to a different one. The fallback is
 *      best-effort: the same 20-byte address is reachable on every
 *      EVM chain, so the scan only happens to be correct because the
 *      catalog only ships well-known canonical tokens whose contract
 *      addresses (mainnet USDC, OP-stack WETH predeploys, etc.) don't
 *      collide across chains in practice. Callers should still pass
 *      the right chainId when they have it.
 *
 * Returns `undefined` when no chain in the catalog carries the
 * address, or when the address is missing/falsy.
 *
 * Typical use: aggregator payloads ship `tokenSymbol="UNKNOWN"` for
 * tokens whose chain-specific RPC enrichment failed; consumers fall
 * through to `lookupToken(chainId, contractAddress)` and recover the
 * symbol + decimals from this catalog.
 */
export function lookupToken(
  chainId: number | undefined,
  address: string | undefined,
): (TokenChainEntry & { symbol: string }) | undefined {
  if (!address) return undefined;
  const target = address.toLowerCase();

  if (chainId) {
    for (const [symbol, byChain] of Object.entries(Tokens)) {
      const entry = (byChain as TokenByChain)[chainId as keyof TokenByChain];
      if (entry && entry.address.toLowerCase() === target) {
        return { symbol, ...entry };
      }
    }
  }
  // Cross-chain scan — necessary when the workflow's chain differs
  // from the runtime's bound chain.
  for (const [symbol, byChain] of Object.entries(Tokens)) {
    for (const entry of Object.values(byChain)) {
      if (entry && entry.address.toLowerCase() === target) {
        return { symbol, ...entry };
      }
    }
  }
  return undefined;
}

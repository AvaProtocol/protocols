// Top-level token catalog. Mirrors `Protocols.*` in shape but is
// keyed by ERC-20 symbol — tokens cross protocol boundaries (USDC
// is touched by every DEX, lending market, and template), so they
// don't belong nested under any single protocol module.
//
// Source-of-truth: each `src/tokens/<chain>.ts` per-chain module
// loads its JSON sidecar in `data/` and exposes a frozen, symbol-
// keyed `tokens` map. This aggregator imports those modules and
// re-shapes them into `Tokens.SYMBOL[chainId]` so chain-bound
// consumers and cross-chain consumers can share the same source:
//
//   - Cross-chain (here):
//       import { Tokens } from "@avaprotocol/protocols"
//       Tokens.USDC[Chains.Sepolia]?.address
//
//   - Chain-bound (per-chain subpath, smaller bundle):
//       import { tokens } from "@avaprotocol/protocols/tokens/sepolia"
//       tokens.USDC?.address
//
// Adding a token is still "append a row to the right chain's JSON";
// the per-chain module picks it up automatically. Per-chain modules
// validate within-chain duplicate symbols at load (see
// `./per-chain.ts:buildChainTokenMap`), so this aggregator only has
// to flatten — no re-validation needed.
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

import { Protocols } from "../protocols";
import { type TokenByChain, type TokenChainEntry } from "./types";

import * as ethereum from "./ethereum";
import * as sepolia from "./sepolia";
import * as base from "./base";
import * as baseSepolia from "./base-sepolia";
import * as bnbMainnet from "./bnb-mainnet";

export type { TokenByChain, TokenChainEntry, TokenLinks } from "./types";

/**
 * Per-chain module list. Each module exposes `chainId` plus a frozen
 * symbol → TokenChainEntry map; we just enumerate them here so
 * adding a new chain is a two-line change (one import, one row).
 */
const PER_CHAIN: ReadonlyArray<readonly [number, Readonly<Record<string, TokenChainEntry>>]> =
  Object.freeze([
    [ethereum.chainId, ethereum.tokens],
    [sepolia.chainId, sepolia.tokens],
    [base.chainId, base.tokens],
    [baseSepolia.chainId, baseSepolia.tokens],
    [bnbMainnet.chainId, bnbMainnet.tokens],
  ]);

/**
 * Walk every per-chain module and group entries by symbol so the
 * public API stays `Tokens.SYMBOL[chainId]`. Built once at module
 * load; the cost is bounded by the catalog size and the result is
 * frozen at the outer level (see the comment on `Tokens` below).
 *
 * Each per-chain module already guarantees a single entry per symbol
 * within its own chain (`buildChainTokenMap` throws on duplicates), so
 * the per-symbol flatten needs no re-validation. The one wiring mistake
 * the flatten itself can't tolerate is the same `chainId` appearing
 * twice in `PER_CHAIN` (e.g. a copy-paste in the array, or two modules
 * reporting the same `chainId`): the second pass would silently
 * overwrite the first chain's entries, producing a wrong
 * `Tokens.SYMBOL[chainId]` with no error. We fail fast on that instead.
 *
 * Null-prototype backing maps + own-property checks keep
 * `Object.prototype` keys (`toString`, `__proto__`, …) from
 * colliding with token symbols. See the parallel construct in
 * `./per-chain.ts:buildChainTokenMap` for the same rationale.
 */
function buildTokensFromData(): Record<string, TokenByChain> {
  const merged: Record<string, Record<number, TokenChainEntry>> = Object.create(null);
  const seenChainIds = new Set<number>();
  for (const [chainId, chainTokens] of PER_CHAIN) {
    if (seenChainIds.has(chainId)) {
      throw new Error(
        `[@avaprotocol/protocols] chainId ${chainId} appears more than once in PER_CHAIN — ` +
          `each chain must be listed exactly once. Merge the duplicate entries.`,
      );
    }
    seenChainIds.add(chainId);
    for (const [symbol, entry] of Object.entries(chainTokens)) {
      if (!Object.prototype.hasOwnProperty.call(merged, symbol)) {
        merged[symbol] = Object.create(null);
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
 * Default decimals applied to a `Protocols.*.tokens.<SYMBOL>` match
 * when the address is found via a per-protocol token table but the
 * top-level `Tokens` catalog doesn't carry the symbol on any chain.
 * Most ERC-20 tokens that ship with protocols use 18 decimals
 * (LINK on AAVE Sepolia, every WETH variant, etc.) so this default
 * is correct in practice. Symbols that explicitly have a different
 * canonical decimals value (USDC=6, USDT=6) appear in `Tokens` and
 * are looked up there first — see the resolution strategy below.
 */
const PROTOCOL_TOKEN_DEFAULT_DECIMALS = 18;

/**
 * Reverse lookup: given a contract address, find the token entry plus
 * its symbol. Address matching is case-insensitive so callers can pass
 * checksum or lowercase without normalizing upstream.
 *
 * Resolution strategy:
 *   1. When `chainId` is provided, prefer a match registered for that
 *      chain in the top-level `Tokens` catalog.
 *   2. If no chain-specific match (or no chainId), scan every chain
 *      in `Tokens` for the address. Necessary when the caller's chain
 *      context diverges from where the address actually lives —
 *      happens in multi-chain dev gateways where the workflow targets
 *      one chain but the runtime is bound to a different one. The
 *      fallback is best-effort: the same 20-byte address is
 *      reachable on every EVM chain, so the scan only happens to be
 *      correct because the catalog only ships well-known canonical
 *      tokens whose contract addresses (mainnet USDC, OP-stack WETH
 *      predeploys, etc.) don't collide across chains in practice.
 *      Callers should still pass the right chainId when they have it.
 *   3. If still no match, walk every per-protocol `tokens` table
 *      (`Protocols.aaveV3.tokens.LINK`, `Protocols.uniswapV3.tokens.WETH`,
 *      ...) for the address. Catches token addresses that ship
 *      alongside a specific protocol — most notably the AAVE-V3
 *      Sepolia faucet LINK (`0xf8Fb37…0EBE5`), which is the address
 *      AAVE templates actually use on Sepolia even though the
 *      canonical Chainlink LINK lives elsewhere. When the symbol
 *      resolved from a per-protocol map also appears in `Tokens`,
 *      `decimals` and `name` are lifted from the same-chain catalog
 *      entry when one exists, else from any other catalog entry
 *      under that symbol; `decimals` defaults to 18 when no catalog
 *      entry exists at all (true for every per-protocol token the
 *      catalog currently ships). The catalog's URL-shaped fields
 *      (`website`, `explorer`, `logoUrl`, `links`) are intentionally
 *      NOT lifted — they're per-deployment metadata that a faucet
 *      variant would render incorrectly.
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
  // Per-protocol tokens fallback — covers addresses that ship with a
  // specific protocol's token map but aren't in the top-level catalog
  // (the AAVE Sepolia faucet LINK is the canonical case). Symbol +
  // address are authoritative from the per-protocol entry; richer
  // metadata, when available, is lifted from `Tokens[symbol]` so
  // consumers still get the canonical decimals/name when there's a
  // top-level entry under the same symbol on some other chain.
  for (const protocolModule of Object.values(Protocols)) {
    const tokens = (protocolModule as { tokens?: unknown }).tokens;
    if (!tokens || typeof tokens !== "object") continue;
    for (const [symbol, addressMap] of Object.entries(tokens as Record<string, Record<number, string>>)) {
      if (!addressMap || typeof addressMap !== "object") continue;
      for (const [rawChainId, addr] of Object.entries(addressMap)) {
        if (typeof addr !== "string") continue;
        if (addr.toLowerCase() !== target) continue;
        const resolvedChainId = Number(rawChainId);
        const canonicalSymbolByChain = (Tokens as Record<string, TokenByChain>)[symbol];
        // Prefer the catalog's same-chain entry for decimals/name
        // (it'll usually be a different deployment of the same token,
        // e.g. canonical Chainlink LINK on Sepolia vs. AAVE-faucet
        // LINK on Sepolia — decimals + symbolic name are still
        // correct for either). Fall back to any other-chain entry
        // under the same symbol when the catalog has no same-chain
        // row, then to 18 decimals when the symbol has no catalog
        // presence at all.
        const metadataSource: TokenChainEntry | undefined =
          canonicalSymbolByChain?.[resolvedChainId as keyof TokenByChain] ??
          (canonicalSymbolByChain
            ? (Object.values(canonicalSymbolByChain).find(e => e) as TokenChainEntry | undefined)
            : undefined);
        return {
          symbol,
          address: addr as `0x${string}`,
          decimals: metadataSource?.decimals ?? PROTOCOL_TOKEN_DEFAULT_DECIMALS,
          ...(metadataSource?.name ? { name: metadataSource.name } : {}),
        };
      }
    }
  }
  return undefined;
}

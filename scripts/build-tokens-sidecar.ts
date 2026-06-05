/**
 * Build a per-chain JSON sidecar from the `Tokens` namespace so that
 * non-TS consumers (Go aggregator's TokenEnrichmentService, Python
 * tooling, etc.) can pick up the same data without depending on the
 * TS toolchain.
 *
 * Output shape — one file per chain, each an array of
 *   { id, name, symbol, decimals }
 * matching the schema the EigenLayer-AVS aggregator already loads via
 * `token_whitelist/*.json`. `id` is the lowercased address (the same
 * normalization Go does on read). Extra metadata fields the Go path
 * doesn't consume (description, website, logoUrl, links) are omitted
 * to keep the sidecar minimal — TS consumers go through the source
 * `Tokens` export directly.
 *
 * Output layout:
 *   dist/tokens/ethereum.json       — chain 1
 *   dist/tokens/sepolia.json        — chain 11155111
 *   dist/tokens/base.json           — chain 8453
 *   dist/tokens/base-sepolia.json   — chain 84532
 *   dist/tokens/bnb-mainnet.json    — chain 56
 *   dist/tokens/holesky.json        — chain 17000
 *
 * File naming matches the convention EigenLayer-AVS already uses for
 * its checked-in whitelists so the migration path is a one-line
 * config change on that side.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Chains, Tokens } from "../src";

interface SidecarEntry {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
}

const CHAIN_FILE_NAMES: Readonly<Record<number, string>> = Object.freeze({
  [Chains.EthereumMainnet]: "ethereum",
  [Chains.Sepolia]: "sepolia",
  [Chains.BaseMainnet]: "base",
  [Chains.BaseSepolia]: "base-sepolia",
  [Chains.BnbMainnet]: "bnb-mainnet",
  [Chains.Holesky]: "holesky",
});

function buildSidecar(): Record<number, SidecarEntry[]> {
  const byChain: Record<number, SidecarEntry[]> = {};
  for (const [symbol, perChain] of Object.entries(Tokens)) {
    for (const [rawChainId, entry] of Object.entries(perChain)) {
      const chainId = Number(rawChainId);
      if (!byChain[chainId]) byChain[chainId] = [];
      byChain[chainId].push({
        id: entry.address.toLowerCase(),
        name: entry.name ?? symbol,
        symbol,
        decimals: entry.decimals,
      });
    }
  }
  // Stable ordering by symbol so diffs are readable when the catalog
  // changes; the Go loader is order-insensitive.
  for (const list of Object.values(byChain)) {
    list.sort((a, b) => a.symbol.localeCompare(b.symbol));
  }
  return byChain;
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const outDir = resolve(here, "..", "dist", "tokens");
  mkdirSync(outDir, { recursive: true });

  const byChain = buildSidecar();
  let written = 0;
  let totalEntries = 0;

  for (const [rawChainId, entries] of Object.entries(byChain)) {
    const chainId = Number(rawChainId);
    const fileName = CHAIN_FILE_NAMES[chainId];
    if (!fileName) {
      console.warn(`[tokens-sidecar] no file name registered for chain ${chainId}, skipping`);
      continue;
    }
    const outPath = resolve(outDir, `${fileName}.json`);
    writeFileSync(outPath, JSON.stringify(entries, null, 2) + "\n", "utf8");
    written += 1;
    totalEntries += entries.length;
    console.log(`[tokens-sidecar] wrote ${fileName}.json (${entries.length} entries)`);
  }

  console.log(`[tokens-sidecar] done: ${written} files, ${totalEntries} entries`);
}

main();

/**
 * One-time mechanical port from EigenLayer-AVS's per-chain token
 * whitelists (`EigenLayer-AVS/token_whitelist/<chain>.json`) into
 * this package's `src/tokens/data/<chain>.json` source files.
 *
 * AVS's shape is identical to the package's minimal shape:
 *   { id, symbol, name, decimals }   →   { symbol, address, decimals, name }
 *
 * The catch: AVS carries a wider mainnet catalog than Studio (~104
 * tokens vs Studio's 30), but lacks the rich UX metadata (description,
 * website, explorer, links, logoUrl) that Studio's catalog has. Port
 * semantics handle that:
 *
 *   EXISTING WINS on `(symbol)` collision.
 *
 * Symbols already present in `src/tokens/data/<chain>.json` (i.e.
 * ported earlier from Studio with rich metadata) stay untouched —
 * AVS's barebones row doesn't overwrite Studio's curated description
 * fields. Symbols missing from the package (the AVS-only set) get
 * added with the basic fields AVS provides.
 *
 * Re-run this script when AVS's whitelist gains entries the package
 * doesn't have. Idempotent — re-runs over an already-ported tree
 * produce no diff.
 *
 * Usage: `yarn port:avs` (or `tsx scripts/port-from-avs.ts`)
 * Set `AVS_DIR` env var if your EigenLayer-AVS checkout isn't at
 * `../EigenLayer-AVS`.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { getAddress } from "ethers";

interface AvsToken {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
}

interface PortedToken {
  symbol: string;
  address: string;
  decimals: number;
  name?: string;
  description?: string;
  website?: string;
  explorer?: string;
  logoUrl?: string;
  links?: Record<string, string>;
}

const CHAIN_FILE_MAP: ReadonlyArray<readonly [string, string]> = [
  ["ethereum.json", "ethereum.json"],
  ["sepolia.json", "sepolia.json"],
  ["base.json", "base.json"],
  ["base-sepolia.json", "base-sepolia.json"],
];

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function portRow(avs: AvsToken): PortedToken {
  if (!ADDRESS_RE.test(avs.id)) {
    throw new Error(
      `[port-from-avs] symbol "${avs.symbol}" has an invalid address: ${avs.id}. ` +
        `Expected 0x-prefixed 40 hex chars. Fix the AVS whitelist row before re-running.`,
    );
  }
  // getAddress checksum-normalizes lowercase OR uppercase input (AVS
  // ships lowercase, which is fine) but throws on mixed-case input
  // whose checksum doesn't match — that surfaces a real corruption
  // we want to fail on, NOT to silently passthrough.
  const address = getAddress(avs.id);
  const out: PortedToken = {
    symbol: avs.symbol,
    address,
    decimals: avs.decimals,
  };
  if (avs.name) out.name = avs.name;
  return out;
}

function mergeExistingWins(
  existing: PortedToken[],
  incoming: PortedToken[],
  chainFileName: string,
): PortedToken[] {
  // EXISTING WINS: don't overwrite richer entries with AVS's
  // barebones rows. Add only what's not already present by symbol.
  // Surface address drift on collisions so upstream-data bugs don't
  // hide behind the silent merge — e.g. if AVS records a different
  // address for `WETH` on a chain where we already have one, that's
  // either a Studio/AVS disagreement worth resolving or a typo in
  // one source, and we want the operator to know either way.
  const bySymbol = new Map<string, PortedToken>();
  for (const t of existing) bySymbol.set(t.symbol, t);
  for (const t of incoming) {
    const prior = bySymbol.get(t.symbol);
    if (!prior) {
      bySymbol.set(t.symbol, t);
      continue;
    }
    if (prior.address.toLowerCase() !== t.address.toLowerCase()) {
      console.warn(
        `[port-from-avs] ${chainFileName}: address drift on "${t.symbol}" — ` +
          `existing=${prior.address}  AVS=${t.address}. Keeping existing (Studio/seed wins). ` +
          `Reconcile manually if the AVS address is the canonical one.`,
      );
    }
  }
  return Array.from(bySymbol.values()).sort((a, b) =>
    a.symbol.localeCompare(b.symbol),
  );
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(here, "..");
  const avsRoot = process.env.AVS_DIR
    ? resolve(process.env.AVS_DIR)
    : resolve(repoRoot, "..", "EigenLayer-AVS");
  const avsDir = resolve(avsRoot, "token_whitelist");
  const outDir = resolve(repoRoot, "src", "tokens", "data");

  if (!existsSync(avsDir)) {
    throw new Error(
      `[port-from-avs] expected AVS whitelist at ${avsDir}. ` +
        `Set AVS_DIR=/path/to/EigenLayer-AVS if your checkout is elsewhere.`,
    );
  }

  let totalAdded = 0;
  for (const [avsFile, ourFile] of CHAIN_FILE_MAP) {
    const avsPath = resolve(avsDir, avsFile);
    const ourPath = resolve(outDir, ourFile);
    if (!existsSync(avsPath)) {
      console.warn(`[port-from-avs] skipping ${avsFile} (not present in AVS)`);
      continue;
    }
    const avsRows = JSON.parse(readFileSync(avsPath, "utf8")) as AvsToken[];
    const existingRows = existsSync(ourPath)
      ? (JSON.parse(readFileSync(ourPath, "utf8")) as PortedToken[])
      : [];
    const ported = avsRows
      .filter(r => r && r.id && r.symbol && r.decimals !== undefined)
      .map(portRow);
    const merged = mergeExistingWins(existingRows, ported, ourFile);
    writeFileSync(ourPath, JSON.stringify(merged, null, 2) + "\n", "utf8");
    const added = merged.length - existingRows.length;
    totalAdded += Math.max(0, added);
    console.log(
      `[port-from-avs] ${ourFile}: ` +
        `${existingRows.length} → ${merged.length} (` +
        `+${Math.max(0, added)} new, ` +
        `${avsRows.length - ported.length} skipped from AVS)`,
    );
  }
  console.log(`[port-from-avs] done: ${totalAdded} new tokens across all chains`);
}

main();

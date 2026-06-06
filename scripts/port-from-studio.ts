/**
 * One-time mechanical port from Studio's per-chain token catalogs
 * (`studio/app/lib/erc20/<chain>.json`) into this package's
 * `src/tokens/data/<chain>.json` source files.
 *
 * Differences in shape between Studio's source and ours, applied as
 * a row-by-row transformation:
 *   - Studio: `id` (address) → ours: `address` (preserve checksum case)
 *   - Studio: `links: [{name, url}]` (array of named pairs)
 *     → ours: `{[name]: url, ...}` (object keyed by link name)
 *   - Strip Studio's `status`, `tags`, `type`, `research` — no
 *     consumer in this monorepo reads them.
 *   - Preserve `description`, `website`, `explorer`, `decimals`,
 *     `name`, `symbol`.
 *
 * Existing entries in `src/tokens/data/<chain>.json` are MERGED with
 * the ported Studio entries — Studio's data is the source of truth
 * for the wider seed, but anything we shipped earlier that isn't in
 * Studio's list survives the merge. When the same `(symbol)` appears
 * in both, Studio's entry wins (latest curated values).
 *
 * Re-run this script when Studio adds a new token to keep the
 * catalogs in sync. The transformation is deterministic, so re-runs
 * over an already-ported tree are no-ops.
 *
 * Usage: `yarn port:studio` (or `tsx scripts/port-from-studio.ts`)
 * Set `STUDIO_DIR` env var if your Studio checkout isn't at
 * `../studio`.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { getAddress } from "ethers";

interface StudioLink {
  name: string;
  url: string;
}

interface StudioToken {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  description?: string;
  website?: string;
  explorer?: string;
  links?: StudioLink[];
  // Stripped on port: status, tags, type, research
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

function studioLinksArrayToObject(links: StudioLink[] | undefined): Record<string, string> | undefined {
  if (!links || links.length === 0) return undefined;
  const obj: Record<string, string> = {};
  for (const l of links) {
    if (l.name && l.url) obj[l.name] = l.url;
  }
  return Object.keys(obj).length > 0 ? obj : undefined;
}

function portRow(studio: StudioToken): PortedToken {
  let address = studio.id;
  try {
    address = getAddress(studio.id); // checksum normalize
  } catch {
    // Some Studio entries have lowercase addresses without a checksum;
    // ethers throws on lowercase. Keep the original lowercase form —
    // the catalog readers normalize on lookup anyway.
  }
  const out: PortedToken = {
    symbol: studio.symbol,
    address,
    decimals: studio.decimals,
  };
  if (studio.name) out.name = studio.name;
  if (studio.description) out.description = studio.description;
  if (studio.website) out.website = studio.website;
  if (studio.explorer) out.explorer = studio.explorer;
  const links = studioLinksArrayToObject(studio.links);
  if (links) out.links = links;
  return out;
}

function mergeBySymbol(
  existing: PortedToken[],
  incoming: PortedToken[],
): PortedToken[] {
  // Studio wins for duplicates on (symbol).
  const bySymbol = new Map<string, PortedToken>();
  for (const t of existing) bySymbol.set(t.symbol, t);
  for (const t of incoming) bySymbol.set(t.symbol, t);
  return Array.from(bySymbol.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(here, "..");
  const studioRoot = process.env.STUDIO_DIR
    ? resolve(process.env.STUDIO_DIR)
    : resolve(repoRoot, "..", "studio");
  const studioDir = resolve(studioRoot, "app", "lib", "erc20");
  const outDir = resolve(repoRoot, "src", "tokens", "data");

  if (!existsSync(studioDir)) {
    throw new Error(
      `[port-from-studio] expected Studio ERC-20 catalog at ${studioDir}. ` +
        `Set STUDIO_DIR=/path/to/studio if your checkout is elsewhere.`,
    );
  }

  let totalAdded = 0;
  for (const [studioFile, ourFile] of CHAIN_FILE_MAP) {
    const studioPath = resolve(studioDir, studioFile);
    const ourPath = resolve(outDir, ourFile);
    if (!existsSync(studioPath)) {
      console.warn(`[port-from-studio] skipping ${studioFile} (not present in Studio)`);
      continue;
    }
    const studioRows = JSON.parse(readFileSync(studioPath, "utf8")) as StudioToken[];
    const existingRows = existsSync(ourPath)
      ? (JSON.parse(readFileSync(ourPath, "utf8")) as PortedToken[])
      : [];
    const ported = studioRows
      .filter(r => r && r.id && r.symbol && r.decimals !== undefined)
      .map(portRow);
    const merged = mergeBySymbol(existingRows, ported);
    writeFileSync(ourPath, JSON.stringify(merged, null, 2) + "\n", "utf8");
    const added = merged.length - existingRows.length;
    totalAdded += Math.max(0, added);
    console.log(
      `[port-from-studio] ${ourFile}: ` +
        `${existingRows.length} → ${merged.length} (` +
        `+${Math.max(0, added)} new, ` +
        `${studioRows.length - ported.length} skipped from Studio)`,
    );
  }
  console.log(`[port-from-studio] done: ${totalAdded} new tokens across all chains`);
}

main();

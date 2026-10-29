/**
 * Render docs/TOKEN_COVERAGE.md, the per-chain coverage matrix, from the
 * catalog data, the provenance files and the coverage target.
 *
 *   yarn report:tokens
 *
 * `tests/token-coverage.test.ts` fails when the committed file differs
 * from what this renders, so run it after any token data change.
 */

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Tokens, type TokenChainEntry } from "../src";
import {
  CATALOG_CHAINS,
  CHAIN_LABEL,
  COVERAGE_CATEGORY,
  EXPLICIT_BASELINE,
  KNOWN_GAPS,
  PROVENANCE_PENDING,
  aaveCoreReserves,
  type CoverageCategory,
} from "./token-catalog/coverage";
import { TOKEN_ISSUANCE, provenanceFor, type TokenProvenanceRow } from "./token-catalog/provenance";

const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), "../docs/TOKEN_COVERAGE.md");

const CATEGORY_LABEL: Readonly<Record<CoverageCategory, string>> = {
  [COVERAGE_CATEGORY.nativeWrapper]: "Native wrapper",
  [COVERAGE_CATEGORY.stablecoin]: "Stablecoin",
  [COVERAGE_CATEGORY.bitcoin]: "BTC",
  [COVERAGE_CATEGORY.liquidStaking]: "Liquid staking",
  [COVERAGE_CATEGORY.defi]: "DEX token",
  [COVERAGE_CATEGORY.aaveReserve]: "Aave Core reserve",
  [COVERAGE_CATEGORY.testToken]: "Test token",
};

interface ChainRow {
  readonly symbol: string;
  readonly entry: TokenChainEntry;
}

function catalogRows(chainId: number): ChainRow[] {
  const rows: ChainRow[] = [];
  for (const [symbol, byChain] of Object.entries(Tokens)) {
    const entry = (byChain as Record<number, TokenChainEntry | undefined>)[chainId];
    if (entry) rows.push({ symbol, entry });
  }
  return rows.sort((left, right) => left.symbol.localeCompare(right.symbol, "en", { sensitivity: "base" }));
}

/** Label a source link by host, or by `owner/repo` for GitHub, where the host alone says nothing. */
function link(url: string): string {
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^www\./, "");
  const label = host === "github.com" ? parsed.pathname.split("/").slice(1, 3).join("/") : host;
  return `[${label}](${url})`;
}

function status(entry: TokenChainEntry | undefined, provenance: TokenProvenanceRow | undefined, gap?: string): string {
  if (!entry) return `**missing** — ${gap ?? "not listed"}`;
  const flags: string[] = [];
  if (!provenance) flags.push("unverified provenance");
  else {
    if (provenance.issuance === TOKEN_ISSUANCE.bridged) flags.push(`bridged (${provenance.bridge})`);
    if (provenance.issuance === TOKEN_ISSUANCE.test) flags.push(`test token (${provenance.issuer})`);
    if (provenance.legacy) flags.push("legacy");
  }
  if (entry.transferConstraints?.length) flags.push(`transfer handling: ${entry.transferConstraints.join(", ")}`);
  return flags.length ? `present; ${flags.join("; ")}` : "present";
}

function sourceCell(provenance: TokenProvenanceRow | undefined): string {
  if (!provenance) return "—";
  const primary = provenance.sources.map(link).join(", ");
  const secondary = (provenance.references ?? []).map(link).join(", ");
  if (primary && secondary) return `${primary}; also ${secondary}`;
  return primary || `${secondary} (secondary only)`;
}

function renderChain(chainId: number): string[] {
  const label = CHAIN_LABEL[chainId];
  const rows = catalogRows(chainId);
  const provenance = new Map(provenanceFor(chainId).map((row) => [row.symbol, row]));
  const gaps = new Map(KNOWN_GAPS.filter((gap) => gap.chainId === chainId).map((gap) => [gap.symbol, gap.reason]));

  // Baseline: explicit assets, then Aave Core reserves not already named.
  const baseline: Array<{ symbol: string; category: CoverageCategory; row?: ChainRow }> = [];
  const covered = new Set<string>();
  for (const asset of EXPLICIT_BASELINE[chainId] ?? []) {
    const row = rows.find((candidate) => candidate.symbol === asset.symbol);
    baseline.push({ ...asset, row });
    if (row) covered.add(row.entry.address.toLowerCase());
    covered.add(asset.symbol);
  }
  const reserves = [...aaveCoreReserves(chainId)].sort((left, right) =>
    left.symbol.localeCompare(right.symbol, "en", { sensitivity: "base" }),
  );
  for (const reserve of reserves) {
    if (covered.has(reserve.underlying.toLowerCase()) || covered.has(reserve.symbol)) continue;
    const row = rows.find((candidate) => candidate.entry.address.toLowerCase() === reserve.underlying.toLowerCase());
    baseline.push({ symbol: row?.symbol ?? reserve.symbol, category: COVERAGE_CATEGORY.aaveReserve, row });
    covered.add(reserve.underlying.toLowerCase());
  }

  const lines = [`## ${label} (chain ${chainId})`, ""];
  lines.push("### Baseline", "");
  lines.push("| Asset | Category | Status | Address | Sources | Verified |", "|---|---|---|---|---|---|");
  for (const asset of baseline) {
    const record = asset.row ? provenance.get(asset.row.symbol) : undefined;
    lines.push(
      `| ${asset.symbol} | ${CATEGORY_LABEL[asset.category]} | ${status(asset.row?.entry, record, gaps.get(asset.symbol))} | ${
        asset.row ? `\`${asset.row.entry.address}\`` : "—"
      } | ${sourceCell(record)} | ${record?.verifiedAt ?? "—"} |`,
    );
  }

  const baselineSymbols = new Set(baseline.map((asset) => asset.row?.symbol).filter(Boolean));
  const others = rows.filter((row) => !baselineSymbols.has(row.symbol));
  const verified = others.filter((row) => provenance.has(row.symbol));
  const pending = others.filter((row) => !provenance.has(row.symbol));
  if (verified.length) {
    lines.push("", "### Other verified rows", "");
    lines.push("| Asset | Status | Address | Sources | Verified |", "|---|---|---|---|---|");
    for (const row of verified) {
      const record = provenance.get(row.symbol);
      lines.push(`| ${row.symbol} | ${status(row.entry, record)} | \`${row.entry.address}\` | ${sourceCell(record)} | ${record?.verifiedAt} |`);
    }
  }
  if (pending.length) {
    const constrained = pending.filter((row) => row.entry.transferConstraints?.length);
    lines.push("", `### Provenance pending (${pending.length})`, "");
    lines.push(
      "Listed before provenance tracking. `yarn verify:tokens` reads their code, decimals and symbol on-chain; no canonical source has been recorded yet.",
      "",
      pending.map((row) => row.symbol).join(", "),
    );
    if (constrained.length) {
      lines.push("", "Transfer handling among them:", "");
      for (const row of constrained) lines.push(`- ${row.symbol}: ${row.entry.transferConstraints!.join(", ")}`);
    }
  }
  lines.push("");
  return lines;
}

export function renderCoverageReport(): string {
  const lines = [
    "# Token catalog coverage",
    "",
    "<!-- Generated by `yarn report:tokens`. Do not edit by hand. -->",
    "",
    "Per-chain coverage of the shared token catalog against the target in `scripts/token-catalog/coverage.ts`. Selection rules, status definitions and the maintenance policy are in [TOKEN_CATALOG.md](./TOKEN_CATALOG.md).",
    "",
    "Status: **present** (listed, canonical source recorded); **bridged** or **test token** (listed variant, with who issues it); **legacy** (superseded deployment kept for existing holdings); **unverified provenance** (listed, on-chain checked, no canonical source recorded); **transfer handling** (listed with transfer constraints); **missing** (in the target, not listed yet).",
    "",
    "## Summary",
    "",
    "| Chain | Rows | Provenance recorded | Provenance pending | Known gaps | With transfer constraints |",
    "|---|---|---|---|---|---|",
  ];
  for (const chainId of CATALOG_CHAINS) {
    const rows = catalogRows(chainId);
    const recorded = new Set(provenanceFor(chainId).map((row) => row.symbol));
    lines.push(
      `| ${CHAIN_LABEL[chainId]} | ${rows.length} | ${rows.filter((row) => recorded.has(row.symbol)).length} | ${
        (PROVENANCE_PENDING[chainId] ?? []).length
      } | ${KNOWN_GAPS.filter((gap) => gap.chainId === chainId).length} | ${
        rows.filter((row) => row.entry.transferConstraints?.length).length
      } |`,
    );
  }
  lines.push("");
  for (const chainId of CATALOG_CHAINS) lines.push(...renderChain(chainId));
  return lines.join("\n");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  writeFileSync(OUTPUT, renderCoverageReport());
  console.log(`wrote ${OUTPUT}`);
}

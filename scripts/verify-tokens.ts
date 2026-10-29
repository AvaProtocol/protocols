/**
 * Read-only on-chain check of the token catalog.
 *
 * For every row in `src/tokens/data/<chain>.json` this calls the
 * contract and compares what the chain says with what the catalog
 * says:
 *   - contract code exists at the address
 *   - `decimals()` equals the catalog's `decimals`
 *   - `symbol()` matches the catalog symbol (case-insensitive)
 *
 * A symbol mismatch is a warning, not an error: a few catalog keys
 * deliberately differ from the on-chain string (see the per-row
 * provenance notes). Missing code or a decimals mismatch is an error.
 *
 * This is the drift check from docs/TOKEN_CATALOG.md. It needs network
 * access, so it is not part of `yarn test`; run it when adding or
 * changing rows and before a release:
 *
 *   yarn verify:tokens                 # every chain
 *   yarn verify:tokens --chain 56      # one chain
 *   yarn verify:tokens --json          # machine-readable output
 *   yarn verify:tokens --rows new.json # check candidate rows before adding them
 *
 * `--rows` takes a JSON array of `{ chainId, symbol, address, decimals }`
 * and checks those instead of the catalog files. Every row must be
 * well-formed and on a catalog chain (and on `--chain`, when given):
 * a row the run would skip fails it before any RPC call, so a clean
 * result means every candidate was checked.
 *
 * RPC endpoints default to public PublicNode endpoints. Override per
 * chain with `RPC_URL_<chainId>` (e.g. `RPC_URL_1=https://...`).
 *
 * No transactions, no signatures — `eth_getCode` and `eth_call` only.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Contract, JsonRpcProvider, decodeBytes32String, isAddress } from "ethers";

import { Chains } from "../src/chains";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

interface ChainTarget {
  readonly chainId: number;
  readonly file: string;
  readonly defaultRpc: string;
}

const CHAIN_TARGETS: readonly ChainTarget[] = [
  { chainId: Chains.EthereumMainnet, file: "ethereum.json", defaultRpc: "https://ethereum-rpc.publicnode.com" },
  { chainId: Chains.BaseMainnet, file: "base.json", defaultRpc: "https://base-rpc.publicnode.com" },
  { chainId: Chains.BnbMainnet, file: "bnb-mainnet.json", defaultRpc: "https://bsc-rpc.publicnode.com" },
  { chainId: Chains.Sepolia, file: "sepolia.json", defaultRpc: "https://ethereum-sepolia-rpc.publicnode.com" },
  { chainId: Chains.BaseSepolia, file: "base-sepolia.json", defaultRpc: "https://base-sepolia-rpc.publicnode.com" },
];

const CATALOG_CHAIN_IDS: ReadonlySet<number> = new Set(CHAIN_TARGETS.map((target) => target.chainId));
const MAX_UINT8 = 255;

interface DataRow {
  readonly chainId?: number;
  readonly symbol: string;
  readonly address: string;
  readonly decimals: number;
}

export interface CandidateRow extends DataRow {
  readonly chainId: number;
}

interface RowResult {
  readonly chainId: number;
  readonly symbol: string;
  readonly address: string;
  readonly hasCode: boolean;
  readonly onchainDecimals?: number;
  readonly onchainSymbol?: string;
  readonly onchainName?: string;
  readonly errors: string[];
  readonly warnings: string[];
}

// `string` and `bytes32` variants — MKR and a few older tokens return
// bytes32 from symbol()/name().
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
];
const ERC20_BYTES32_ABI = ["function symbol() view returns (bytes32)", "function name() view returns (bytes32)"];

async function readText(
  contract: Contract,
  fallback: Contract,
  method: "symbol" | "name",
): Promise<string | undefined> {
  try {
    return String(await contract[method]());
  } catch {
    try {
      return decodeBytes32String(await fallback[method]());
    } catch {
      return undefined;
    }
  }
}

async function checkRow(provider: JsonRpcProvider, chainId: number, row: DataRow): Promise<RowResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const code = await provider.getCode(row.address);
  const hasCode = code !== "0x";
  if (!hasCode) {
    errors.push("no contract code at address");
    return { chainId, symbol: row.symbol, address: row.address, hasCode, errors, warnings };
  }
  const contract = new Contract(row.address, ERC20_ABI, provider);
  const bytes32 = new Contract(row.address, ERC20_BYTES32_ABI, provider);

  let onchainDecimals: number | undefined;
  try {
    onchainDecimals = Number(await contract.decimals());
  } catch {
    errors.push("decimals() reverted");
  }
  const onchainSymbol = await readText(contract, bytes32, "symbol");
  const onchainName = await readText(contract, bytes32, "name");

  if (onchainDecimals !== undefined && onchainDecimals !== row.decimals) {
    errors.push(`decimals: catalog ${row.decimals}, chain ${onchainDecimals}`);
  }
  if (onchainSymbol === undefined) {
    warnings.push("symbol() unreadable");
  } else if (onchainSymbol.toLowerCase() !== row.symbol.toLowerCase()) {
    warnings.push(`symbol: catalog ${row.symbol}, chain ${onchainSymbol}`);
  }
  return {
    chainId,
    symbol: row.symbol,
    address: row.address,
    hasCode,
    onchainDecimals,
    onchainSymbol,
    onchainName,
    errors,
    warnings,
  };
}

/** Small concurrency limiter so public endpoints don't rate-limit us. */
async function mapLimited<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      out[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const FLAG = { chain: "--chain", rows: "--rows", json: "--json" } as const;
const USAGE = `usage: verify-tokens [${FLAG.chain} <chainId>] [${FLAG.rows} <file.json>] [${FLAG.json}]`;

export interface VerifyArgs {
  readonly chain?: number;
  readonly json: boolean;
  readonly rowsFile?: string;
}

/** Strict: an unknown flag or a flag without its value throws, rather than falling back to the whole catalog. */
export function parseArgs(argv: readonly string[]): VerifyArgs {
  let chain: number | undefined;
  let rowsFile: string | undefined;
  let json = false;
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--") continue;
    if (arg === FLAG.json) {
      json = true;
      continue;
    }
    if (arg === FLAG.chain || arg === FLAG.rows) {
      const value = argv[++index];
      if (value === undefined || value.startsWith("--")) throw new Error(`${arg} needs a value; ${USAGE}`);
      if (arg === FLAG.chain) chain = Number(value);
      else rowsFile = value;
      continue;
    }
    throw new Error(`unknown argument ${arg}; ${USAGE}`);
  }
  return { chain, json, rowsFile };
}

/**
 * Validate `--rows` input before any RPC call. Collects every problem, so
 * one run reports all bad rows. A row on a chain the run would not visit
 * (not a catalog chain, or not `--chain`) is a problem, not a skip.
 */
export function parseCandidateRows(input: unknown, chain?: number): CandidateRow[] {
  if (!Array.isArray(input)) throw new Error(`${FLAG.rows}: expected a JSON array of { chainId, symbol, address, decimals }`);
  if (input.length === 0) throw new Error(`${FLAG.rows}: the file has no rows`);
  const problems: string[] = [];
  input.forEach((row: unknown, index) => {
    if (typeof row !== "object" || row === null || Array.isArray(row)) {
      problems.push(`row ${index}: not an object`);
      return;
    }
    const { chainId, symbol, address, decimals } = row as Record<string, unknown>;
    const where = `row ${index}${typeof symbol === "string" && symbol ? ` (${symbol})` : ""}`;
    if (typeof chainId !== "number" || !CATALOG_CHAIN_IDS.has(chainId)) {
      problems.push(`${where}: chainId ${JSON.stringify(chainId)} is not a catalog chain (${[...CATALOG_CHAIN_IDS].join(", ")})`);
    } else if (chain !== undefined && chainId !== chain) {
      problems.push(`${where}: chainId ${chainId}, but ${FLAG.chain} ${chain}`);
    }
    if (typeof symbol !== "string" || symbol.trim() === "") problems.push(`${where}: symbol missing`);
    if (typeof address !== "string" || !isAddress(address)) {
      problems.push(`${where}: address ${JSON.stringify(address)} is not an address, or has a bad EIP-55 checksum`);
    }
    if (typeof decimals !== "number" || !Number.isInteger(decimals) || decimals < 0 || decimals > MAX_UINT8) {
      problems.push(`${where}: decimals ${JSON.stringify(decimals)} is not an integer from 0 to ${MAX_UINT8}`);
    }
  });
  if (problems.length > 0) throw new Error(`${FLAG.rows}: ${problems.length} problem(s), nothing checked:\n  ${problems.join("\n  ")}`);
  return input as CandidateRow[];
}

async function main() {
  const { chain, json, rowsFile } = parseArgs(process.argv.slice(2));
  const targets = CHAIN_TARGETS.filter((target) => chain === undefined || target.chainId === chain);
  if (targets.length === 0) throw new Error(`no catalog chain ${chain}`);
  const candidateRows = rowsFile ? parseCandidateRows(JSON.parse(readFileSync(resolve(rowsFile), "utf8")), chain) : undefined;

  const results: RowResult[] = [];
  for (const target of targets) {
    const rows = candidateRows
      ? candidateRows.filter((row) => row.chainId === target.chainId)
      : (JSON.parse(readFileSync(resolve(ROOT, "src/tokens/data", target.file), "utf8")) as DataRow[]);
    if (rows.length === 0) continue;
    const rpc = process.env[`RPC_URL_${target.chainId}`] ?? target.defaultRpc;
    const provider = new JsonRpcProvider(rpc, target.chainId, { staticNetwork: true });
    results.push(...(await mapLimited(rows, 6, (row) => checkRow(provider, target.chainId, row))));
    provider.destroy();
  }
  if (candidateRows && results.length !== candidateRows.length) {
    throw new Error(`checked ${results.length} of ${candidateRows.length} candidate rows`);
  }

  if (json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const result of results) {
      for (const message of result.errors) console.log(`ERROR ${result.chainId} ${result.symbol} ${result.address}: ${message}`);
      for (const message of result.warnings) console.log(`warn  ${result.chainId} ${result.symbol} ${result.address}: ${message}`);
    }
    const errorCount = results.filter((result) => result.errors.length > 0).length;
    console.log(`${results.length} rows checked, ${errorCount} with errors`);
  }
  if (results.some((result) => result.errors.length > 0)) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

/**
 * Generate the AAVE V3 reserve catalog from chain.
 *
 * For each covered chain we read the Pool's reserve list and, per asset,
 * its aToken / variableDebtToken (via `getReserveData`) plus the ERC-20
 * `symbol`/`decimals`. The result is written to
 * `src/protocols/aave-v3-reserves.ts`, which `aave-v3.ts` re-exports as
 * `aaveV3.reserves`.
 *
 * Run: `yarn generate:aave-reserves`
 *
 * Why generate instead of hand-copy: AAVE adds/removes reserves over time;
 * regenerating against the canonical Pool keeps `underlying -> aToken`
 * mappings accurate. Pool addresses come from the catalog itself
 * (`aaveV3.pool`) so this stays the single source of truth.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ethers } from "ethers";

import { Chains, type ChainId } from "../src/chains";
import { aaveV3 } from "../src/protocols/aave-v3";

// Public RPC endpoints per chain. Read-only `eth_call`s only; swap for a
// private endpoint via env if a public one rate-limits during a refresh.
const RPC_URLS: Readonly<Record<number, string>> = Object.freeze({
  [Chains.EthereumMainnet]: process.env.RPC_MAINNET ?? "https://ethereum-rpc.publicnode.com",
  [Chains.OptimismMainnet]: process.env.RPC_OPTIMISM ?? "https://optimism-rpc.publicnode.com",
  [Chains.BaseMainnet]: process.env.RPC_BASE ?? "https://base-rpc.publicnode.com",
  [Chains.BnbMainnet]: process.env.RPC_BNB ?? "https://bsc-rpc.publicnode.com",
  [Chains.ArbitrumOne]: process.env.RPC_ARBITRUM ?? "https://arbitrum-one-rpc.publicnode.com",
  [Chains.Sepolia]: process.env.RPC_SEPOLIA ?? "https://ethereum-sepolia-rpc.publicnode.com",
  [Chains.BaseSepolia]: process.env.RPC_BASE_SEPOLIA ?? "https://base-sepolia-rpc.publicnode.com",
});

// Emit `Chains.X` keys (not magic numbers) to match the catalog's convention.
const CHAIN_CONST_NAME: Readonly<Record<number, string>> = Object.freeze({
  [Chains.EthereumMainnet]: "EthereumMainnet",
  [Chains.OptimismMainnet]: "OptimismMainnet",
  [Chains.BaseMainnet]: "BaseMainnet",
  [Chains.BnbMainnet]: "BnbMainnet",
  [Chains.ArbitrumOne]: "ArbitrumOne",
  [Chains.Sepolia]: "Sepolia",
  [Chains.BaseSepolia]: "BaseSepolia",
});

const POOL_ABI = [
  "function getReservesList() view returns (address[])",
  // Legacy ReserveData struct — stable across AAVE V3 pool versions. We only
  // read aTokenAddress + variableDebtTokenAddress; the rest is decoded for
  // correct field offsets.
  "function getReserveData(address asset) view returns (" +
    "((uint256 data) configuration," +
    "uint128 liquidityIndex,uint128 currentLiquidityRate,uint128 variableBorrowIndex," +
    "uint128 currentVariableBorrowRate,uint128 currentStableBorrowRate,uint40 lastUpdateTimestamp," +
    "uint16 id,address aTokenAddress,address stableDebtTokenAddress,address variableDebtTokenAddress," +
    "address interestRateStrategyAddress,uint128 accruedToTreasury,uint128 unbacked,uint128 isolationModeTotalDebt))",
];

const ERC20_STRING_ABI = ["function symbol() view returns (string)", "function decimals() view returns (uint8)"];
const ERC20_BYTES32_ABI = ["function symbol() view returns (bytes32)"];

/**
 * Bridged USDC.e — on-chain `symbol()` is still `"USDC"`, same as native
 * Circle USDC. Rename so a symbol lookup (`find(r => r.symbol === "USDC")`)
 * cannot silently resolve to the bridged token on chains that list both.
 * Addresses are the well-known Circle USDC.e deployments and do not move.
 */
const BRIDGED_USDC_E = new Set(
  [
    "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", // Arbitrum One
    "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // Optimism
  ].map((address) => address.toLowerCase()),
);

function disambiguateSymbol(row: ReserveRow): ReserveRow {
  if (row.symbol === "USDC" && BRIDGED_USDC_E.has(row.underlying.toLowerCase())) {
    return { ...row, symbol: "USDC.e" };
  }
  return row;
}

interface ReserveRow {
  symbol: string;
  underlying: string;
  aToken: string;
  variableDebtToken: string;
  decimals: number;
}

/** Resolve an ERC-20 symbol, falling back to bytes32 (e.g. legacy MKR). */
async function readSymbol(provider: ethers.Provider, address: string): Promise<string> {
  try {
    const erc20 = new ethers.Contract(address, ERC20_STRING_ABI, provider);
    return await erc20.symbol();
  } catch {
    try {
      const erc20 = new ethers.Contract(address, ERC20_BYTES32_ABI, provider);
      const raw: string = await erc20.symbol();
      return ethers.decodeBytes32String(raw);
    } catch {
      return "UNKNOWN";
    }
  }
}

/** Run `tasks` with a bounded concurrency so public RPCs don't rate-limit. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function fetchChainReserves(chainId: number, poolAddress: string): Promise<ReserveRow[]> {
  const rpcUrl = RPC_URLS[chainId];
  const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
  const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);

  const assets: string[] = await pool.getReservesList();
  console.log(`[aave-reserves] chain ${chainId}: ${assets.length} reserves`);

  const rows = await mapWithConcurrency(assets, 5, async (asset): Promise<ReserveRow | null> => {
    try {
      const data = await pool.getReserveData(asset);
      const [symbol, decimals] = await Promise.all([
        readSymbol(provider, asset),
        new ethers.Contract(asset, ERC20_STRING_ABI, provider).decimals(),
      ]);
      return {
        symbol,
        underlying: ethers.getAddress(asset),
        aToken: ethers.getAddress(data.aTokenAddress),
        variableDebtToken: ethers.getAddress(data.variableDebtTokenAddress),
        decimals: Number(decimals),
      };
    } catch (err) {
      console.warn(`[aave-reserves]   skip ${asset} on chain ${chainId}: ${(err as Error).message}`);
      return null;
    }
  });

  return rows
    .filter((row): row is ReserveRow => row !== null)
    .map(disambiguateSymbol)
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

function renderFile(byChain: Map<number, ReserveRow[]>): string {
  const header = [
    "// AUTO-GENERATED by scripts/generate-aave-reserves.ts — do not edit by hand.",
    "// Regenerate: yarn generate:aave-reserves",
    "//",
    "// Underlying -> aToken / variableDebtToken mappings read from each chain's",
    "// AAVE V3 Pool (getReservesList + getReserveData). Ordered by symbol.",
    "",
    'import { Chains } from "../chains";',
    'import { type AaveV3ReservesByChain } from "./types";',
    "",
    "export const aaveV3Reserves: AaveV3ReservesByChain = {",
  ];

  const body: string[] = [];
  for (const [chainId, rows] of byChain) {
    const constName = CHAIN_CONST_NAME[chainId];
    body.push(`  [Chains.${constName}]: [`);
    for (const row of rows) {
      body.push(
        `    { symbol: ${JSON.stringify(row.symbol)}, underlying: "${row.underlying}", ` +
          `aToken: "${row.aToken}", variableDebtToken: "${row.variableDebtToken}", decimals: ${row.decimals} },`,
      );
    }
    body.push("  ],");
  }

  return [...header, ...body, "};", ""].join("\n");
}

async function main(): Promise<void> {
  const pool = aaveV3.pool as Record<number, string | undefined>;
  const chains = Object.keys(RPC_URLS).map(Number) as ChainId[];

  const byChain = new Map<number, ReserveRow[]>();
  for (const chainId of chains) {
    const poolAddress = pool[chainId];
    if (!poolAddress) {
      console.warn(`[aave-reserves] no Pool address for chain ${chainId}; skipping`);
      continue;
    }
    try {
      const rows = await fetchChainReserves(chainId, poolAddress);
      if (rows.length > 0) byChain.set(chainId, rows);
    } catch (err) {
      console.warn(`[aave-reserves] chain ${chainId} failed: ${(err as Error).message}`);
    }
  }

  if (byChain.size === 0) throw new Error("[aave-reserves] no reserves fetched on any chain");

  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(here, "..", "src", "protocols", "aave-v3-reserves.ts");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, renderFile(byChain), "utf8");

  const total = [...byChain.values()].reduce((sum, rows) => sum + rows.length, 0);
  console.log(`[aave-reserves] wrote ${outPath} (${byChain.size} chains, ${total} reserves)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * The token catalog's coverage target: which assets each catalog chain
 * must list, which known gaps remain, and which pre-audit rows still lack
 * provenance. `tests/token-coverage.test.ts` enforces it and
 * `scripts/token-coverage-report.ts` renders it to docs/TOKEN_COVERAGE.md.
 *
 * The selection rules are in docs/TOKEN_CATALOG.md ("Coverage target").
 * In short, per mainnet:
 *   1. the canonical wrapper of the native coin (`Protocols.wrapped.weth`)
 *   2. major fiat stablecoins, on chains where the issuer publishes an address
 *   3. major BTC representations, on chains where the issuer publishes an address
 *   4. major liquid-staking assets, on chains where the issuer publishes an address
 *   5. every Aave V3 Core reserve on the chain except expiring Pendle PTs,
 *      plus the chain's main DEX governance token
 * Testnets list verified test deployments only (rule 6).
 *
 * The list is explicit on purpose. "All common tokens" is not testable;
 * this is.
 */

import { Chains } from "../../src/chains";
import { Protocols } from "../../src/protocols";

export const COVERAGE_CATEGORY = Object.freeze({
  nativeWrapper: "nativeWrapper",
  stablecoin: "stablecoin",
  bitcoin: "bitcoin",
  liquidStaking: "liquidStaking",
  defi: "defi",
  aaveReserve: "aaveReserve",
  testToken: "testToken",
} as const);

export type CoverageCategory = (typeof COVERAGE_CATEGORY)[keyof typeof COVERAGE_CATEGORY];

export interface BaselineAsset {
  readonly symbol: string;
  readonly category: CoverageCategory;
}

/** Catalog chains, in report order. Mainnets first. */
export const CATALOG_CHAINS: readonly number[] = [
  Chains.EthereumMainnet,
  Chains.BaseMainnet,
  Chains.BnbMainnet,
  Chains.Sepolia,
  Chains.BaseSepolia,
];

export const CHAIN_LABEL: Readonly<Record<number, string>> = Object.freeze({
  [Chains.EthereumMainnet]: "Ethereum",
  [Chains.BaseMainnet]: "Base",
  [Chains.BnbMainnet]: "BNB Chain",
  [Chains.Sepolia]: "Sepolia",
  [Chains.BaseSepolia]: "Base Sepolia",
});

const { nativeWrapper, stablecoin, bitcoin, liquidStaking, defi, testToken } = COVERAGE_CATEGORY;

/** Rules 1–4 and 6, plus rule 5's DEX token. Rule 5's Aave reserves are derived below. */
export const EXPLICIT_BASELINE: Readonly<Record<number, readonly BaselineAsset[]>> = Object.freeze({
  [Chains.EthereumMainnet]: [
    { symbol: "WETH", category: nativeWrapper },
    { symbol: "USDC", category: stablecoin },
    { symbol: "USDT", category: stablecoin },
    { symbol: "DAI", category: stablecoin },
    { symbol: "USDS", category: stablecoin },
    { symbol: "USDe", category: stablecoin },
    { symbol: "PYUSD", category: stablecoin },
    { symbol: "RLUSD", category: stablecoin },
    { symbol: "USDG", category: stablecoin },
    { symbol: "FDUSD", category: stablecoin },
    { symbol: "USD1", category: stablecoin },
    { symbol: "EURC", category: stablecoin },
    { symbol: "WBTC", category: bitcoin },
    { symbol: "cbBTC", category: bitcoin },
    { symbol: "tBTC", category: bitcoin },
    { symbol: "LBTC", category: bitcoin },
    { symbol: "stETH", category: liquidStaking },
    { symbol: "wstETH", category: liquidStaking },
    { symbol: "rETH", category: liquidStaking },
    { symbol: "cbETH", category: liquidStaking },
    { symbol: "weETH", category: liquidStaking },
    { symbol: "UNI", category: defi },
  ],
  [Chains.BaseMainnet]: [
    { symbol: "WETH", category: nativeWrapper },
    { symbol: "USDC", category: stablecoin },
    { symbol: "EURC", category: stablecoin },
    { symbol: "USDS", category: stablecoin },
    { symbol: "USDe", category: stablecoin },
    { symbol: "RLUSD", category: stablecoin },
    { symbol: "WBTC", category: bitcoin },
    { symbol: "cbBTC", category: bitcoin },
    { symbol: "tBTC", category: bitcoin },
    { symbol: "LBTC", category: bitcoin },
    { symbol: "wstETH", category: liquidStaking },
    { symbol: "rETH", category: liquidStaking },
    { symbol: "cbETH", category: liquidStaking },
    { symbol: "weETH", category: liquidStaking },
    { symbol: "AERO", category: defi },
  ],
  [Chains.BnbMainnet]: [
    { symbol: "WBNB", category: nativeWrapper },
    { symbol: "USDT", category: stablecoin },
    { symbol: "USDC", category: stablecoin },
    { symbol: "FDUSD", category: stablecoin },
    { symbol: "USD1", category: stablecoin },
    { symbol: "USDe", category: stablecoin },
    { symbol: "BTCB", category: bitcoin },
    { symbol: "LBTC", category: bitcoin },
    { symbol: "wstETH", category: liquidStaking },
    { symbol: "slisBNB", category: liquidStaking },
    { symbol: "Cake", category: defi },
  ],
  [Chains.Sepolia]: [
    { symbol: "WETH", category: nativeWrapper },
    { symbol: "USDC", category: testToken },
    { symbol: "EURC", category: testToken },
    { symbol: "LINK", category: testToken },
  ],
  [Chains.BaseSepolia]: [
    { symbol: "WETH", category: nativeWrapper },
    { symbol: "USDC", category: testToken },
    { symbol: "EURC", category: testToken },
    { symbol: "LINK", category: testToken },
  ],
});

/** Pendle principal tokens expire; Aave lists them as collateral for a few months each. */
const EXPIRING_RESERVE = /^PT-/;

/**
 * Rule 5: Aave V3 Core reserves on a mainnet, matched by address. Testnet
 * reserves are Aave faucet tokens and are excluded.
 */
export function aaveCoreReserves(chainId: number): ReadonlyArray<{ readonly symbol: string; readonly underlying: string }> {
  if (chainId === Chains.Sepolia || chainId === Chains.BaseSepolia) return [];
  return (Protocols.aaveV3.reserves[chainId] ?? []).filter((reserve) => !EXPIRING_RESERVE.test(reserve.symbol));
}

export interface KnownGap {
  readonly chainId: number;
  readonly symbol: string;
  readonly reason: string;
}

/**
 * Baseline assets the catalog does not list yet. The test fails when a
 * listed gap is filled, so this list stays current.
 */
export const KNOWN_GAPS: readonly KnownGap[] = [];

/**
 * Catalog rows that predate provenance tracking and have no provenance row
 * yet. On-chain reads (`yarn verify:tokens`) cover them; canonical sources
 * do not. New rows may not be added here: the test fails if a chain's list
 * grows past `PROVENANCE_PENDING_AT_AUDIT`, and when a listed row gains
 * provenance.
 */
export const PROVENANCE_PENDING: Readonly<Record<number, readonly string[]>> = Object.freeze({
  [Chains.EthereumMainnet]: [
    "AIOZ", "APE", "ARB", "ATH", "AXS", "BGB", "BNB", "Bonk", "BTT", "BUIDL", "Cake",
    "cgETH.hashkey", "clBTC", "COMP", "CRO", "DEXE", "DYDX", "EIGEN", "ENA", "ETHFI", "FET",
    "FLOKI", "FTN", "GALA", "GRT", "GT", "IMX", "INJ", "JASMY", "LEO", "LsETH", "MANA", "MNT",
    "NEAR", "NEXO", "NFT", "OKB", "ONDO", "OUSG", "PAXG", "PENDLE", "PEPE", "POL", "pumpBTC", "QNT",
    "RNDR", "RSR", "SAND", "SHIB", "SPX", "STRK", "SYRUP", "syrupUSDC", "TEL", "TKX",
    "TONCOIN", "TUSD", "USD0", "USDD", "USDX", "USDY", "USYC", "VIRTUAL", "WBT", "WLD", "XCN", "ZK",
  ],
  [Chains.BaseMainnet]: ["axlUSDC", "BAL", "BRETT", "DEGEN", "MORPHO", "RSR", "TOSHI", "UNI", "VIRTUAL", "WELL", "YFI"],
  [Chains.Sepolia]: ["DAI"],
  [Chains.BaseSepolia]: ["USDT"],
});

/** Size of each chain's pending list at the 2026-10-28 audit. Lower it as rows gain provenance; never raise it. */
export const PROVENANCE_PENDING_AT_AUDIT: Readonly<Record<number, number>> = Object.freeze({
  [Chains.EthereumMainnet]: 67,
  [Chains.BaseMainnet]: 11,
  [Chains.Sepolia]: 1,
  [Chains.BaseSepolia]: 1,
});

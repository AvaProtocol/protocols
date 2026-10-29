/**
 * Token catalog coverage and provenance.
 *
 * Enforces the coverage target in scripts/token-catalog/coverage.ts and
 * the provenance pins in src/tokens/provenance/*.json. Offline: on-chain
 * reads are `yarn verify:tokens`. Policy: docs/TOKEN_CATALOG.md.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, it, expect } from "vitest";

import { Protocols, TOKEN_TRANSFER_CONSTRAINT, Tokens, type TokenChainEntry } from "../src";
import {
  CATALOG_CHAINS,
  CHAIN_LABEL,
  COVERAGE_CATEGORY,
  EXPLICIT_BASELINE,
  KNOWN_GAPS,
  PROVENANCE_PENDING,
  PROVENANCE_PENDING_AT_AUDIT,
  aaveCoreReserves,
} from "../scripts/token-catalog/coverage";
import { PROVENANCE_BY_CHAIN, TOKEN_ISSUANCE, provenanceFor } from "../scripts/token-catalog/provenance";
import { renderCoverageReport } from "../scripts/token-coverage-report";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISSUANCE_VALUES = new Set<string>(Object.values(TOKEN_ISSUANCE));
const CONSTRAINT_VALUES = new Set<string>(Object.values(TOKEN_TRANSFER_CONSTRAINT));

function catalogRows(chainId: number): Array<{ symbol: string; entry: TokenChainEntry }> {
  const rows: Array<{ symbol: string; entry: TokenChainEntry }> = [];
  for (const [symbol, byChain] of Object.entries(Tokens)) {
    const entry = (byChain as Record<number, TokenChainEntry | undefined>)[chainId];
    if (entry) rows.push({ symbol, entry });
  }
  return rows;
}

const sameAddress = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();

describe("coverage target", () => {
  for (const chainId of CATALOG_CHAINS) {
    const label = CHAIN_LABEL[chainId];
    const gaps = new Set(KNOWN_GAPS.filter((gap) => gap.chainId === chainId).map((gap) => gap.symbol));

    it(`${label}: every baseline asset is listed or recorded as a known gap`, () => {
      for (const { symbol } of EXPLICIT_BASELINE[chainId] ?? []) {
        const listed = Tokens[symbol]?.[chainId as keyof (typeof Tokens)[string]] !== undefined;
        expect(listed || gaps.has(symbol), `${label} ${symbol} is in the baseline but neither listed nor a known gap`).toBe(true);
      }
    });

    it(`${label}: every non-expiring Aave V3 Core reserve is listed by address or recorded as a known gap`, () => {
      const addresses = catalogRows(chainId).map(({ entry }) => entry.address);
      for (const reserve of aaveCoreReserves(chainId)) {
        const listed = addresses.some((address) => sameAddress(address, reserve.underlying));
        expect(listed || gaps.has(reserve.symbol), `${label} Aave reserve ${reserve.symbol} (${reserve.underlying})`).toBe(true);
      }
    });

    it(`${label}: known gaps are not already listed`, () => {
      for (const symbol of gaps) {
        const listed = Tokens[symbol]?.[chainId as keyof (typeof Tokens)[string]] !== undefined;
        expect(listed, `${label} ${symbol} is listed now; remove it from KNOWN_GAPS`).toBe(false);
      }
    });

    it(`${label}: the native wrapper is the one Protocols.wrapped.weth names`, () => {
      const wrapper = (EXPLICIT_BASELINE[chainId] ?? []).find((asset) => asset.category === COVERAGE_CATEGORY.nativeWrapper);
      const expected = Protocols.wrapped.weth[chainId as keyof typeof Protocols.wrapped.weth];
      expect(wrapper, `${label} has no native wrapper in its baseline`).toBeDefined();
      expect(expected, `${label} has no Protocols.wrapped.weth entry`).toBeDefined();
      const entry = Tokens[wrapper!.symbol]?.[chainId as keyof (typeof Tokens)[string]];
      expect(entry && sameAddress(entry.address, expected!), `${label} ${wrapper!.symbol}`).toBe(true);
    });
  }

  it("every known gap gives a reason", () => {
    for (const gap of KNOWN_GAPS) expect(gap.reason.trim().length, `${gap.chainId} ${gap.symbol}`).toBeGreaterThan(0);
  });
});

describe("provenance", () => {
  for (const [chainId, rows] of PROVENANCE_BY_CHAIN) {
    const label = CHAIN_LABEL[chainId];
    const catalog = new Map(catalogRows(chainId).map(({ symbol, entry }) => [symbol, entry]));

    it(`${label}: each provenance row pins an address the catalog lists under that symbol`, () => {
      const seen = new Set<string>();
      for (const row of rows) {
        expect(seen.has(row.symbol), `${label} ${row.symbol} has two provenance rows`).toBe(false);
        seen.add(row.symbol);
        const entry = catalog.get(row.symbol);
        expect(entry, `${label} provenance for ${row.symbol}, which the catalog does not list`).toBeDefined();
        expect(entry && sameAddress(entry.address, row.address), `${label} ${row.symbol}: catalog ${entry?.address}, provenance ${row.address}`).toBe(true);
      }
    });

    it(`${label}: provenance rows are complete`, () => {
      for (const row of rows) {
        const where = `${label} ${row.symbol}`;
        expect(ISSUANCE_VALUES.has(row.issuance), `${where} issuance "${row.issuance}"`).toBe(true);
        expect(row.issuer.trim().length, `${where} issuer`).toBeGreaterThan(0);
        expect(row.verifiedAt, `${where} verifiedAt`).toMatch(ISO_DATE);
        expect(row.sources.length + (row.references?.length ?? 0), `${where} cites no source`).toBeGreaterThan(0);
        for (const url of [...row.sources, ...(row.references ?? [])]) expect(url, where).toMatch(/^https:\/\//);
        if (row.issuance === TOKEN_ISSUANCE.bridged) expect(row.bridge?.trim().length, `${where} bridged without a bridge name`).toBeGreaterThan(0);
      }
    });

    it(`${label}: baseline assets cite an issuer or protocol source`, () => {
      const byChain = new Map(rows.map((row) => [row.symbol, row]));
      for (const { symbol } of EXPLICIT_BASELINE[chainId] ?? []) {
        if (!catalog.has(symbol)) continue;
        expect(byChain.get(symbol)?.sources.length ?? 0, `${label} ${symbol} needs a canonical source`).toBeGreaterThan(0);
      }
    });

    it(`${label}: every catalog row has provenance or is on the pre-audit pending list`, () => {
      const pinned = new Set(rows.map((row) => row.symbol));
      const pending = new Set(PROVENANCE_PENDING[chainId] ?? []);
      for (const symbol of catalog.keys()) {
        expect(pinned.has(symbol) || pending.has(symbol), `${label} ${symbol} has no provenance row`).toBe(true);
      }
      expect(pending.size, `${label} PROVENANCE_PENDING grew; new rows need a provenance row instead`).toBeLessThanOrEqual(
        PROVENANCE_PENDING_AT_AUDIT[chainId] ?? 0,
      );
      for (const symbol of pending) {
        expect(catalog.has(symbol), `${label} ${symbol} is pending but not listed; drop it from PROVENANCE_PENDING`).toBe(true);
        expect(pinned.has(symbol), `${label} ${symbol} has provenance now; drop it from PROVENANCE_PENDING`).toBe(false);
      }
    });
  }

  it("covers every catalog chain", () => {
    expect(PROVENANCE_BY_CHAIN.map(([chainId]) => chainId).sort()).toEqual([...CATALOG_CHAINS].sort());
    for (const chainId of CATALOG_CHAINS) expect(provenanceFor(chainId).length, CHAIN_LABEL[chainId]).toBeGreaterThan(0);
  });
});

describe("cross-registry consistency", () => {
  it("one address means one symbol, on every chain", () => {
    // lookupToken's cross-chain fallback returns the first match for an
    // address. That is only safe while an address never names two assets.
    const symbolByAddress = new Map<string, string>();
    for (const [symbol, byChain] of Object.entries(Tokens)) {
      for (const entry of Object.values(byChain)) {
        if (!entry) continue;
        const key = entry.address.toLowerCase();
        const existing = symbolByAddress.get(key);
        expect(existing === undefined || existing === symbol, `${entry.address} is both ${existing} and ${symbol}`).toBe(true);
        symbolByAddress.set(key, symbol);
      }
    }
  });

  it("protocol modules and the catalog agree on token addresses", () => {
    // `null` symbol = the chain's native wrapper. Uniswap's `tokens.WETH`
    // slot means "wrapped native" (WBNB on BNB Chain), like wrapped.weth.
    const pairs: Array<[string, Partial<Record<number, string>>, string | null]> = [
      ["lido.steth", Protocols.lido.steth, "stETH"],
      ["lido.wsteth", Protocols.lido.wsteth, "wstETH"],
      ["ethena.usde", Protocols.ethena.usde, "USDe"],
      ["ethena.susde", Protocols.ethena.susde, "sUSDe"],
      ["rocketPool.reth", Protocols.rocketPool.reth, "rETH"],
      ["sky.sdai", Protocols.sky.sdai, "sDAI"],
      ["fraxEther.frxeth", Protocols.fraxEther.frxeth, "frxETH"],
      ["fraxEther.sfrxeth", Protocols.fraxEther.sfrxeth, "sfrxETH"],
      ["uniswapV3.tokens.USDC", Protocols.uniswapV3.tokens.USDC, "USDC"],
      ["uniswapV3.tokens.WETH", Protocols.uniswapV3.tokens.WETH, null],
      ["wrapped.weth", Protocols.wrapped.weth, null],
    ];
    for (const [path, byChain, pairedSymbol] of pairs) {
      for (const [chainId, address] of Object.entries(byChain)) {
        if (!address || !CATALOG_CHAINS.includes(Number(chainId))) continue;
        const symbol =
          pairedSymbol ??
          (EXPLICIT_BASELINE[Number(chainId)] ?? []).find((asset) => asset.category === COVERAGE_CATEGORY.nativeWrapper)!.symbol;
        const entry = Tokens[symbol]?.[Number(chainId) as keyof (typeof Tokens)[string]];
        expect(entry, `Protocols.${path}[${chainId}] is not in Tokens.${symbol}`).toBeDefined();
        expect(entry && sameAddress(entry.address, address), `Protocols.${path}[${chainId}] ${address} vs Tokens.${symbol} ${entry?.address}`).toBe(true);
      }
    }
  });
});

describe("transfer constraints", () => {
  it("use known values, without repeats", () => {
    for (const [symbol, byChain] of Object.entries(Tokens)) {
      for (const [chainId, entry] of Object.entries(byChain)) {
        const constraints = entry?.transferConstraints;
        if (!constraints) continue;
        expect(constraints.length, `${symbol}[${chainId}] has an empty list; omit the field`).toBeGreaterThan(0);
        expect(new Set(constraints).size, `${symbol}[${chainId}] repeats a constraint`).toBe(constraints.length);
        for (const constraint of constraints) expect(CONSTRAINT_VALUES.has(constraint), `${symbol}[${chainId}] "${constraint}"`).toBe(true);
      }
    }
  });
});

describe("docs/TOKEN_COVERAGE.md", () => {
  it("matches the catalog (run `yarn report:tokens` after editing token data)", () => {
    const committed = readFileSync(fileURLToPath(new URL("../docs/TOKEN_COVERAGE.md", import.meta.url)), "utf8");
    expect(committed).toBe(renderCoverageReport());
  });
});

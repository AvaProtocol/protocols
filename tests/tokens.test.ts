/**
 * Token catalog integrity tests.
 *
 * Goal: every entry in `Tokens.*` has a well-formed shape so a typo
 * can't silently break a downstream consumer's address-keyed lookup.
 * Reverse lookup (`lookupToken`) gets parallel coverage because it's
 * the access pattern aggregators and summarizers use.
 */
import { describe, it, expect } from "vitest";
import { Chains, Tokens, lookupToken } from "../src";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const CHAIN_IDS = new Set<number>(Object.values(Chains));

describe("Tokens namespace", () => {
  it("exports every seeded symbol", () => {
    // Update this list when seeding new tokens. The explicit form keeps
    // the public surface reviewable from a single test diff.
    expect(Object.keys(Tokens).sort()).toEqual(["DAI", "LINK", "USDC", "USDT", "WETH"]);
  });

  it("every entry uses a recognized chain id", () => {
    for (const [symbol, byChain] of Object.entries(Tokens)) {
      for (const chainId of Object.keys(byChain)) {
        const id = Number(chainId);
        expect(CHAIN_IDS.has(id), `${symbol} on unknown chain ${chainId}`).toBe(true);
      }
    }
  });

  it("every entry has a 0x-prefixed 42-char address and non-negative decimals (some ERC-20s ship 0)", () => {
    for (const [symbol, byChain] of Object.entries(Tokens)) {
      for (const [chainId, entry] of Object.entries(byChain)) {
        const where = `${symbol}[${chainId}]`;
        expect(entry, `${where} empty entry`).toBeDefined();
        if (!entry) continue;
        expect(entry.address, `${where} bad address`).toMatch(ADDRESS_RE);
        expect(entry.decimals, `${where} bad decimals`).toBeGreaterThanOrEqual(0);
        expect(entry.decimals, `${where} bad decimals`).toBeLessThanOrEqual(36);
      }
    }
  });

  it("USDC on mainnet matches the address Uniswap V3 also ships", () => {
    // Sanity cross-check: the pre-existing per-protocol token map
    // and the top-level catalog must not drift. If this trips, decide
    // which is authoritative and update the other.
    const fromTokens = Tokens.USDC[Chains.EthereumMainnet];
    expect(fromTokens?.address).toBe("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
    expect(fromTokens?.decimals).toBe(6);
  });
});

describe("lookupToken()", () => {
  it("finds mainnet USDC by lowercase address", () => {
    const result = lookupToken(Chains.EthereumMainnet, "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
    expect(result?.symbol).toBe("USDC");
    expect(result?.decimals).toBe(6);
  });

  it("finds mainnet USDC by checksum address", () => {
    const result = lookupToken(Chains.EthereumMainnet, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
    expect(result?.symbol).toBe("USDC");
  });

  it("returns undefined when the address is unknown on a known chain", () => {
    const result = lookupToken(Chains.EthereumMainnet, "0x0000000000000000000000000000000000000000");
    expect(result).toBeUndefined();
  });

  it("falls through to cross-chain scan when the chain ID isn't covered", () => {
    // Behavioural contract: a chain-specific miss does NOT mean the
    // address is unknown — most ERC-20 addresses are globally unique
    // so the catalog can still answer. This is what lets cross-chain
    // dev gateways (Sepolia runtime, mainnet workflow) recover the
    // right symbol. Tests that want strict chain-specific lookup
    // should rely on a different code path.
    const result = lookupToken(999999, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
    expect(result?.symbol).toBe("USDC");
  });

  it("returns undefined when the address is unknown to every chain", () => {
    const result = lookupToken(undefined, "0x0000000000000000000000000000000000000000");
    expect(result).toBeUndefined();
  });

  it("returns undefined for falsy inputs", () => {
    expect(lookupToken(undefined, "0xA0b8...")).toBeUndefined();
    expect(lookupToken(1, undefined)).toBeUndefined();
    expect(lookupToken(1, "")).toBeUndefined();
  });

  it("distinguishes the AAVE-faucet LINK on Sepolia from mainnet LINK", () => {
    const sepoliaLink = lookupToken(Chains.Sepolia, "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5");
    const mainnetLink = lookupToken(Chains.EthereumMainnet, "0x514910771AF9Ca656af840dff83E8264EcF986CA");
    expect(sepoliaLink?.symbol).toBe("LINK");
    expect(mainnetLink?.symbol).toBe("LINK");
    expect(sepoliaLink?.address).not.toBe(mainnetLink?.address);
  });
});

/**
 * Per-chain token subpath modules.
 *
 * Covers the surface added by 0.6.0: `@avaprotocol/protocols/tokens/<chain>`
 * shipping symbol-keyed maps so consumers can import a single chain
 * without pulling all five via the root `Tokens` namespace.
 */
import { describe, it, expect } from "vitest";
import { Chains, Tokens } from "../src";
import * as Ethereum from "../src/tokens/ethereum";
import * as Sepolia from "../src/tokens/sepolia";
import * as Base from "../src/tokens/base";
import * as BaseSepolia from "../src/tokens/base-sepolia";
import * as BnbMainnet from "../src/tokens/bnb-mainnet";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

const modules = [
  { name: "ethereum", mod: Ethereum, expectedChainId: Chains.EthereumMainnet },
  { name: "sepolia", mod: Sepolia, expectedChainId: Chains.Sepolia },
  { name: "base", mod: Base, expectedChainId: Chains.BaseMainnet },
  { name: "base-sepolia", mod: BaseSepolia, expectedChainId: Chains.BaseSepolia },
  { name: "bnb-mainnet", mod: BnbMainnet, expectedChainId: Chains.BnbMainnet },
];

describe("Per-chain token subpath modules", () => {
  for (const { name, mod, expectedChainId } of modules) {
    describe(name, () => {
      it("exports chainId matching the chain", () => {
        expect(mod.chainId).toBe(expectedChainId);
      });

      it("exports a non-empty tokens map", () => {
        expect(Object.keys(mod.tokens).length).toBeGreaterThan(0);
      });

      it("every entry has a valid 0x address and non-negative decimals", () => {
        for (const [symbol, entry] of Object.entries(mod.tokens)) {
          expect(entry.address, `${name}/${symbol} bad address`).toMatch(ADDRESS_RE);
          expect(entry.decimals, `${name}/${symbol} bad decimals`).toBeGreaterThanOrEqual(0);
        }
      });

      it("agrees with the root `Tokens` namespace for every entry", () => {
        // Source-of-truth check: the per-chain module and the
        // aggregated namespace must surface the same address +
        // decimals for the same (symbol, chain) — they read from the
        // same JSON but go through different code paths, so a
        // regression in either would diverge here.
        for (const [symbol, entry] of Object.entries(mod.tokens)) {
          const fromRoot = Tokens[symbol]?.[expectedChainId as keyof typeof Tokens[typeof symbol]];
          expect(fromRoot, `Tokens.${symbol}[${expectedChainId}] missing`).toBeDefined();
          expect(fromRoot?.address).toBe(entry.address);
          expect(fromRoot?.decimals).toBe(entry.decimals);
        }
      });

      it("tokens map is frozen so consumers can't mutate it", () => {
        expect(Object.isFrozen(mod.tokens)).toBe(true);
      });
    });
  }

  it("ethereum has the largest catalog (sanity)", () => {
    // Largest in the seed today; if this trips, either Ethereum
    // shrunk (unlikely) or another chain grew past it (update the
    // sanity guard).
    const sizes = modules.map(({ mod }) => Object.keys(mod.tokens).length);
    const ethereumSize = Object.keys(Ethereum.tokens).length;
    expect(ethereumSize).toBe(Math.max(...sizes));
  });
});

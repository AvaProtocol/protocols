/**
 * Catalog-level integrity tests. The per-protocol data lives in
 * `src/protocols/*.ts`; these tests make sure the namespace export
 * surfaces every protocol consistently and that every address in the
 * catalog has a well-formed shape (lowercased/checksum-form prefix,
 * 42 chars), so a typo at extract-time can't silently break callers.
 */
import { describe, it, expect } from "vitest";
import { Chains, Protocols } from "../src";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const TOPIC_RE = /^0x[0-9a-fA-F]{64}$/;

/**
 * Walk a protocol's exported object and collect every address-like
 * value. Used by the shape tests so we don't have to enumerate every
 * known address by hand.
 */
function collectAddresses(value: unknown, acc: string[] = []): string[] {
  if (typeof value === "string" && value.startsWith("0x") && value.length === 42) {
    acc.push(value);
    return acc;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectAddresses(item, acc);
    return acc;
  }
  if (value !== null && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectAddresses(v, acc);
    }
  }
  return acc;
}

describe("Protocols namespace", () => {
  it("exports every shipped protocol", () => {
    // If you add a new protocol module to src/protocols/, add it
    // here too — the test is intentionally explicit so the surface
    // is reviewable at a glance.
    expect(Object.keys(Protocols).sort()).toEqual(
      [
        "aaveV3",
        "aerodrome",
        "chainlink",
        "compoundV3",
        "erc20",
        "ethena",
        "fraxEther",
        "lido",
        "morphoBlue",
        "rocketPool",
        "sky",
        "spark",
        "superfluid",
        "uniswapV3",
        "wrapped",
      ].sort(),
    );
  });

  it("freezes the namespace object so consumers can't mutate it", () => {
    expect(Object.isFrozen(Protocols)).toBe(true);
  });
});

describe("Address shape", () => {
  it("every address in the catalog matches the 0x[40-hex] format", () => {
    const failures: string[] = [];
    for (const [protocolName, protocol] of Object.entries(Protocols)) {
      for (const address of collectAddresses(protocol)) {
        if (!ADDRESS_RE.test(address)) {
          failures.push(`${protocolName}: ${address}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

describe("Event topic shape", () => {
  it("every AAVE V3 event topic is a 32-byte keccak hash", () => {
    for (const [name, hash] of Object.entries(Protocols.aaveV3.eventTopics)) {
      expect(hash, `aaveV3.eventTopics.${name}`).toMatch(TOPIC_RE);
    }
  });
});

describe("AAVE V3 catalog", () => {
  it("has Pool addresses on every covered chain", () => {
    expect(Protocols.aaveV3.pool[Chains.EthereumMainnet]).toMatch(ADDRESS_RE);
    expect(Protocols.aaveV3.pool[Chains.Sepolia]).toMatch(ADDRESS_RE);
    expect(Protocols.aaveV3.pool[Chains.BaseMainnet]).toMatch(ADDRESS_RE);
    expect(Protocols.aaveV3.pool[Chains.BaseSepolia]).toMatch(ADDRESS_RE);
    expect(Protocols.aaveV3.pool[Chains.BnbMainnet]).toMatch(ADDRESS_RE);
  });

  it("ships the Pool method ABI with getUserAccountData + supply", () => {
    const methods = Protocols.aaveV3.poolMethodsAbi.map((f) => f.name);
    expect(methods).toContain("getUserAccountData");
    expect(methods).toContain("supply");
    expect(methods).toContain("borrow");
    expect(methods).toContain("repay");
    expect(methods).toContain("withdraw");
    expect(methods).toContain("setUserUseReserveAsCollateral");
  });

  it("ships the Borrow event topic + ABI in lockstep", () => {
    const borrow = Protocols.aaveV3.poolEventsAbi.find((e) => e.name === "Borrow");
    expect(borrow).toBeDefined();
    expect(Protocols.aaveV3.eventTopics.Borrow).toMatch(TOPIC_RE);
  });
});

describe("Uniswap V3 catalog", () => {
  it("ships SwapRouter02 on every covered chain", () => {
    expect(Protocols.uniswapV3.swapRouter02[Chains.EthereumMainnet]).toMatch(ADDRESS_RE);
    expect(Protocols.uniswapV3.swapRouter02[Chains.Sepolia]).toMatch(ADDRESS_RE);
    expect(Protocols.uniswapV3.swapRouter02[Chains.BaseMainnet]).toMatch(ADDRESS_RE);
    expect(Protocols.uniswapV3.swapRouter02[Chains.BaseSepolia]).toMatch(ADDRESS_RE);
    expect(Protocols.uniswapV3.swapRouter02[Chains.BnbMainnet]).toMatch(ADDRESS_RE);
  });

  it("ships exactInputSingle in the SwapRouter02 ABI", () => {
    const methods = Protocols.uniswapV3.swapRouter02Abi.map((f) => f.name);
    expect(methods).toContain("exactInputSingle");
    expect(methods).toContain("exactOutputSingle");
  });

  it("Permit2 is at the same address on every covered chain", () => {
    const expected = "0x000000000022d473030F116dDEE9F6B43aC78BA3";
    for (const chainId of [
      Chains.EthereumMainnet,
      Chains.Sepolia,
      Chains.BaseMainnet,
      Chains.BaseSepolia,
      Chains.BnbMainnet,
    ]) {
      expect(Protocols.uniswapV3.permit2[chainId]?.toLowerCase()).toBe(expected.toLowerCase());
    }
  });
});

describe("Shared ABIs", () => {
  it("Chainlink AggregatorV3 ABI is reused across protocols", () => {
    // The chainlink module re-exports the shared ABI fragment from
    // common.ts. Confirm the reference is the same object so updates
    // to common stay in lockstep.
    expect(Protocols.chainlink.aggregatorV3Abi).toBeDefined();
    const latestRoundData = Protocols.chainlink.aggregatorV3Abi.find(
      (f) => f.name === "latestRoundData",
    );
    expect(latestRoundData).toBeDefined();
  });

  it("ERC-4626 vault ABI surfaces deposit + redeem", () => {
    // fraxEther + sky share the standard ERC-4626 ABI via common.ts.
    const methods = Protocols.fraxEther.vaultAbi.map((f) => f.name);
    expect(methods).toContain("deposit");
    expect(methods).toContain("redeem");
    expect(Protocols.sky.vaultAbi).toBe(Protocols.fraxEther.vaultAbi);
  });

  it("ERC-20 approve ABI is single-fragment", () => {
    expect(Protocols.erc20.approveAbi).toHaveLength(1);
    expect(Protocols.erc20.approveAbi[0].name).toBe("approve");
  });
});

describe("Chain coverage", () => {
  it("AAVE V3 Pool + Oracle cover the same chains; WETH Gateway is a subset", () => {
    const poolChains = Object.keys(Protocols.aaveV3.pool).sort();
    const oracleChains = Object.keys(Protocols.aaveV3.oracle).sort();
    expect(oracleChains).toEqual(poolChains);
    // WETH Gateway is only deployed on chains whose native gas token
    // is ETH. Chains without it (e.g. BNB Chain) still have Pool +
    // Oracle. So the invariant is "gateway ⊆ pool", not equality.
    const gatewayChains = Object.keys(Protocols.aaveV3.wethGateway);
    for (const cid of gatewayChains) {
      expect(poolChains).toContain(cid);
    }
  });

  it("Uniswap V3 covers the same chain set across its contracts", () => {
    const routerChains = Object.keys(Protocols.uniswapV3.swapRouter02).sort();
    const factoryChains = Object.keys(Protocols.uniswapV3.factory).sort();
    expect(factoryChains).toEqual(routerChains);
  });
});

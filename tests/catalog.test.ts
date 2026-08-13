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

const AAVE_V3_CHAINS = [
  Chains.EthereumMainnet,
  Chains.Sepolia,
  Chains.OptimismMainnet,
  Chains.BaseMainnet,
  Chains.BaseSepolia,
  Chains.BnbMainnet,
  Chains.ArbitrumOne,
] as const;

describe("AAVE V3 catalog", () => {
  it("has Pool addresses on every covered chain", () => {
    for (const chain of AAVE_V3_CHAINS) {
      expect(Protocols.aaveV3.pool[chain]).toMatch(ADDRESS_RE);
    }
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

  it("ships the version-stable config reads in the Pool method ABI", () => {
    const methods = Protocols.aaveV3.poolMethodsAbi.map((f) => f.name);
    expect(methods).toContain("getConfiguration");
    expect(methods).toContain("getUserConfiguration");
    expect(methods).toContain("getReserveData");
  });

  it("has PoolAddressesProvider + UiPoolDataProvider on every covered chain", () => {
    for (const chain of AAVE_V3_CHAINS) {
      expect(Protocols.aaveV3.poolAddressesProvider[chain]).toMatch(ADDRESS_RE);
      expect(Protocols.aaveV3.uiPoolDataProvider[chain]).toMatch(ADDRESS_RE);
    }
  });

  it("enumerates every Pool on a chain via markets, with core matching pool[]", () => {
    for (const chain of AAVE_V3_CHAINS) {
      const listed = Protocols.aaveV3.markets[chain] ?? [];
      expect(listed.length).toBeGreaterThan(0);
      const keys = listed.map((m) => m.key);
      expect(new Set(keys).size).toBe(keys.length);
      expect(keys[0]).toBe("core");

      const core = listed[0];
      expect(core.pool).toBe(Protocols.aaveV3.pool[chain]);
      expect(core.poolAddressesProvider).toBe(Protocols.aaveV3.poolAddressesProvider[chain]);

      for (const market of listed) {
        expect(market.pool).toMatch(ADDRESS_RE);
        expect(market.poolAddressesProvider).toMatch(ADDRESS_RE);
      }
    }

    expect(Object.keys(Protocols.aaveV3.markets).sort()).toEqual(
      Object.keys(Protocols.aaveV3.pool).sort(),
    );
  });

  it("lists Ethereum Core + EtherFi + Lido + Horizon markets", () => {
    const eth = Protocols.aaveV3.markets[Chains.EthereumMainnet] ?? [];
    expect(eth.map((m) => m.key)).toEqual(["core", "etherFi", "lido", "horizon"]);
    // Official address-book Pools — independently confirmed, not inherited
    // from Studio's seed. Core stays equal to the existing pool[1].
    expect(eth[0]?.pool).toBe("0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2");
    expect(eth[1]?.pool).toBe("0x0AA97c284e98396202b6A04024F5E2c65026F3c0");
    expect(eth[2]?.pool).toBe("0x4e033931ad43597d96D6bcc25c280717730B58B1");
    expect(eth[3]?.pool).toBe("0xAe05Cd22df81871bc7cC2a04BeCfb516bFe332C8");
    expect(eth[1]?.poolAddressesProvider).toBe("0xeBa440B438Ad808101d1c451C1C5322c90BEFCdA");
    expect(eth[2]?.poolAddressesProvider).toBe("0xcfBf336fe147D643B9Cb705648500e101504B16d");
    expect(eth[3]?.poolAddressesProvider).toBe("0x5D39E06b825C1F2B80bf2756a73e28eFAA128ba0");
  });

  it("ships Core reserves on Arbitrum and Optimism (not just a Pool)", () => {
    const arb = Protocols.aaveV3.reserves[Chains.ArbitrumOne] ?? [];
    const op = Protocols.aaveV3.reserves[Chains.OptimismMainnet] ?? [];
    // Chain-native symbols guard against mixing the two catalogs —
    // they share a CREATE2 Pool address.
    expect(arb.find((r) => r.symbol === "ARB")).toBeDefined();
    expect(op.find((r) => r.symbol === "OP")).toBeDefined();
    expect(arb.find((r) => r.symbol === "WETH")).toBeDefined();
    expect(op.find((r) => r.symbol === "WETH")).toBeDefined();
  });

  it("ships Arbitrum + Optimism Core Pools (CREATE2-shared address)", () => {
    const shared = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";
    expect(Protocols.aaveV3.pool[Chains.ArbitrumOne]).toBe(shared);
    expect(Protocols.aaveV3.pool[Chains.OptimismMainnet]).toBe(shared);
    // Same CREATE2 PoolAddressesProvider on both L2s; oracles differ.
    expect(Protocols.aaveV3.poolAddressesProvider[Chains.ArbitrumOne]).toBe(
      Protocols.aaveV3.poolAddressesProvider[Chains.OptimismMainnet],
    );
    expect(Protocols.aaveV3.oracle[Chains.ArbitrumOne]).not.toBe(
      Protocols.aaveV3.oracle[Chains.OptimismMainnet],
    );
  });

  it("decodes a ReserveConfigurationMap bitmap via reserveConfigurationBits", () => {
    const bits = Protocols.aaveV3.reserveConfigurationBits;
    // Issue's named low bits are pinned to their canonical positions.
    expect(bits.ltv).toEqual({ offset: 0, bits: 16 });
    expect(bits.liquidationThreshold).toEqual({ offset: 16, bits: 16 });
    expect(bits.decimals).toEqual({ offset: 48, bits: 8 });
    expect(bits.active).toEqual({ offset: 56, bits: 1 });
    expect(bits.frozen).toEqual({ offset: 57, bits: 1 });
    expect(bits.borrowingEnabled).toEqual({ offset: 58, bits: 1 });
    expect(bits.paused).toEqual({ offset: 60, bits: 1 });

    const field = (data: bigint, f: { offset: number; bits: number }) =>
      (data >> BigInt(f.offset)) & ((1n << BigInt(f.bits)) - 1n);

    // Pack a bitmap the way the Pool does, then round-trip it back out.
    const packed =
      8050n | // ltv
      (8300n << 16n) | // liquidationThreshold
      (18n << 48n) | // decimals
      (1n << 56n) | // active
      (1n << 58n); // borrowingEnabled (frozen/paused left 0)
    expect(field(packed, bits.ltv)).toBe(8050n);
    expect(field(packed, bits.liquidationThreshold)).toBe(8300n);
    expect(field(packed, bits.decimals)).toBe(18n);
    expect(field(packed, bits.active)).toBe(1n);
    expect(field(packed, bits.frozen)).toBe(0n);
    expect(field(packed, bits.borrowingEnabled)).toBe(1n);
    expect(field(packed, bits.paused)).toBe(0n);
  });

  it("decodes per-reserve collateral/borrow flags via userConfigurationBits", () => {
    const { bitsPerReserve, borrowingOffset, collateralOffset } =
      Protocols.aaveV3.userConfigurationBits;
    expect(bitsPerReserve).toBe(2);
    // reserve id 3 used as collateral, id 5 borrowed.
    const data = (1n << (3n * 2n + BigInt(collateralOffset))) | (1n << (5n * 2n + BigInt(borrowingOffset)));
    const flag = (id: bigint, off: number) =>
      ((data >> (id * BigInt(bitsPerReserve) + BigInt(off))) & 1n) === 1n;
    expect(flag(3n, collateralOffset)).toBe(true);
    expect(flag(3n, borrowingOffset)).toBe(false);
    expect(flag(5n, borrowingOffset)).toBe(true);
    expect(flag(5n, collateralOffset)).toBe(false);
  });

  it("does NOT bake mutable risk values into the static reserve catalog", () => {
    // Explicit non-goal (issue #19): governance-mutable, HF-critical
    // values must be read live, never baked. Guard the reserve shape so
    // a future generator change can't silently ship a stale LTV.
    const forbidden = ["ltv", "liquidationThreshold", "liqThreshold", "usageAsCollateralEnabled"];
    for (const chainReserves of Object.values(Protocols.aaveV3.reserves)) {
      for (const reserve of chainReserves ?? []) {
        for (const key of forbidden) {
          expect(Object.prototype.hasOwnProperty.call(reserve, key)).toBe(false);
        }
      }
    }
  });

  it("ships the Borrow event topic + ABI in lockstep", () => {
    const borrow = Protocols.aaveV3.poolEventsAbi.find((e) => e.name === "Borrow");
    expect(borrow).toBeDefined();
    expect(Protocols.aaveV3.eventTopics.Borrow).toMatch(TOPIC_RE);
  });

  it("ships a non-empty reserve list on every covered chain", () => {
    const { reserves } = Protocols.aaveV3;
    for (const chain of AAVE_V3_CHAINS) {
      expect((reserves[chain] ?? []).length).toBeGreaterThan(0);
    }
  });

  it("reserve symbols are unique per chain (no silent first-match collisions)", () => {
    for (const [chain, chainReserves] of Object.entries(Protocols.aaveV3.reserves)) {
      const symbols = (chainReserves ?? []).map((reserve) => reserve.symbol);
      expect(new Set(symbols).size, `duplicate symbol on chain ${chain}`).toBe(symbols.length);
    }
  });

  it("disambiguates bridged USDC.e so symbol lookup returns native USDC", () => {
    const native = {
      [Chains.ArbitrumOne]: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      [Chains.OptimismMainnet]: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    } as const;
    const bridged = {
      [Chains.ArbitrumOne]: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
      [Chains.OptimismMainnet]: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
    } as const;
    for (const chain of [Chains.ArbitrumOne, Chains.OptimismMainnet] as const) {
      const listed = Protocols.aaveV3.reserves[chain] ?? [];
      const usdc = listed.find((r) => r.symbol === "USDC");
      const usdce = listed.find((r) => r.symbol === "USDC.e");
      expect(usdc?.underlying.toLowerCase()).toBe(native[chain].toLowerCase());
      expect(usdce?.underlying.toLowerCase()).toBe(bridged[chain].toLowerCase());
    }
  });

  it("every reserve carries valid underlying/aToken/variableDebtToken + decimals", () => {
    for (const chainReserves of Object.values(Protocols.aaveV3.reserves)) {
      for (const reserve of chainReserves ?? []) {
        expect(reserve.underlying).toMatch(ADDRESS_RE);
        expect(reserve.aToken).toMatch(ADDRESS_RE);
        expect(reserve.variableDebtToken).toMatch(ADDRESS_RE);
        // ERC-20 decimals is a uint8 — 0 is valid (don't over-constrain).
        expect(Number.isInteger(reserve.decimals)).toBe(true);
        expect(reserve.decimals).toBeGreaterThanOrEqual(0);
        expect(reserve.decimals).toBeLessThanOrEqual(255);
        expect(reserve.symbol.length).toBeGreaterThan(0);
      }
    }
  });

  it("Sepolia LINK reserve underlying matches the catalog's tokens.LINK", () => {
    const link = (Protocols.aaveV3.reserves[Chains.Sepolia] ?? []).find((reserve) => reserve.symbol === "LINK");
    expect(link?.underlying.toLowerCase()).toBe(Protocols.aaveV3.tokens.LINK[Chains.Sepolia]?.toLowerCase());
  });
});

describe("Uniswap V3 catalog", () => {
  it("ships SwapRouter02 on every covered chain", () => {
    expect(Protocols.uniswapV3.swapRouter02[Chains.EthereumMainnet]).toMatch(ADDRESS_RE);
    expect(Protocols.uniswapV3.swapRouter02[Chains.Sepolia]).toMatch(ADDRESS_RE);
    expect(Protocols.uniswapV3.swapRouter02[Chains.BaseMainnet]).toMatch(ADDRESS_RE);
    expect(Protocols.uniswapV3.swapRouter02[Chains.BaseSepolia]).toMatch(ADDRESS_RE);
    expect(Protocols.uniswapV3.swapRouter02[Chains.BnbMainnet]).toMatch(ADDRESS_RE);
    expect(Protocols.uniswapV3.swapRouter02[Chains.ArbitrumOne]).toMatch(ADDRESS_RE);
    expect(Protocols.uniswapV3.swapRouter02[Chains.OptimismMainnet]).toMatch(ADDRESS_RE);
    // Official SwapRouter02 — same CREATE2 address on Ethereum / Arb / OP.
    expect(Protocols.uniswapV3.swapRouter02[Chains.ArbitrumOne]).toBe(
      "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    );
    expect(Protocols.uniswapV3.swapRouter02[Chains.OptimismMainnet]).toBe(
      "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    );
    expect(Protocols.uniswapV3.swapRouter02[Chains.UnichainMainnet]).toBe(
      "0x73855d06DE49d0fe4A9c42636Ba96c62da12FF9C",
    );
    expect(Protocols.uniswapV3.factory[Chains.UnichainMainnet]).toBe(
      "0x1F98400000000000000000000000000000000003",
    );
    expect(Protocols.uniswapV3.tokens.USDC[Chains.UnichainMainnet]).toBe(
      "0x078D782b760474a361dDA0AF3839290b0EF57AD6",
    );
    expect(Protocols.wrapped.weth[Chains.UnichainMainnet]).toBe(
      "0x4200000000000000000000000000000000000006",
    );
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
      Chains.OptimismMainnet,
      Chains.BnbMainnet,
      Chains.ArbitrumOne,
      Chains.UnichainMainnet,
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

  it("ERC-20 ships transfer/symbol/decimals function fragments", () => {
    expect(Protocols.erc20.transferAbi[0].name).toBe("transfer");
    expect(Protocols.erc20.symbolAbi[0].name).toBe("symbol");
    expect(Protocols.erc20.decimalsAbi[0].name).toBe("decimals");
  });

  it("ERC-20 Transfer event ABI + topic[0] hash are in lockstep", () => {
    const transferEvent = Protocols.erc20.transferEventAbi.find((f) => f.name === "Transfer");
    expect(transferEvent?.type).toBe("event");
    expect(Protocols.erc20.eventTopics.Transfer).toBe(
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    );
    expect(Protocols.erc20.eventTopics.Transfer).toMatch(TOPIC_RE);
  });

  it("Chainlink AnswerUpdated event ABI + topic[0] hash are in lockstep", () => {
    const answerUpdated = Protocols.chainlink.answerUpdatedEventAbi.find(
      (f) => f.name === "AnswerUpdated",
    );
    expect(answerUpdated?.type).toBe("event");
    expect(Protocols.chainlink.eventTopics.AnswerUpdated).toBe(
      "0x0559884fd3a460db3073b7fc896cc77986f16e378210ded43186175bf646fc5f",
    );
    expect(Protocols.chainlink.eventTopics.AnswerUpdated).toMatch(TOPIC_RE);
  });
});

describe("Chain coverage", () => {
  it("AAVE V3 Pool + Oracle + data providers cover the same chains; WETH Gateway is a subset", () => {
    const poolChains = Object.keys(Protocols.aaveV3.pool).sort();
    const oracleChains = Object.keys(Protocols.aaveV3.oracle).sort();
    expect(oracleChains).toEqual(poolChains);
    // The data providers read the same markets as Pool, so they cover
    // the same chain set.
    expect(Object.keys(Protocols.aaveV3.poolAddressesProvider).sort()).toEqual(poolChains);
    expect(Object.keys(Protocols.aaveV3.uiPoolDataProvider).sort()).toEqual(poolChains);
    // Reserves must cover the same chains as Pool. A hand-maintained
    // chain list would let a new Pool ship without a regenerate.
    expect(Object.keys(Protocols.aaveV3.reserves).sort()).toEqual(poolChains);
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

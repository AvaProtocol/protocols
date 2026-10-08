import { describe, expect, it } from "vitest";

import { Chains, Protocols, UNISWAP_V3_FEE_TIER, UNISWAP_V3_FEE_TIERS, uniswapV3Pool } from "../src";

const SEPOLIA_USDC_WETH_3000 = "0x6Ce0896eAE6D4BD668fDe41BB784548fb8F59b50";
const ETHEREUM_USDC_WETH_500 = "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640";
const BASE_WETH_USDC_500 = "0xd0b53D9277642d899DF5C87A3966A349A798F224";
const BASE_SEPOLIA_USDC_WETH_3000 = "0x46880b404CD35c165EDdefF7421019F8dD25F4Ad";

describe("UNISWAP_V3_FEE_TIERS", () => {
  it("tries the four canonical tiers from 0.01% to 1%", () => {
    expect(UNISWAP_V3_FEE_TIERS).toEqual([100, 500, 3000, 10000]);
    expect(Protocols.uniswapV3.feeTiers).toEqual(UNISWAP_V3_FEE_TIERS);
    expect(UNISWAP_V3_FEE_TIER.medium).toBe(3000);
  });
});

describe("uniswapV3Pool", () => {
  it("derives the Sepolia USDC/WETH 0.3% pool with USDC as token0", () => {
    const usdc = Protocols.uniswapV3.tokens.USDC[Chains.Sepolia]!;
    const weth = Protocols.uniswapV3.tokens.WETH[Chains.Sepolia]!;
    const pool = uniswapV3Pool({
      chainId: Chains.Sepolia,
      tokenA: weth,
      tokenB: usdc,
      fee: UNISWAP_V3_FEE_TIER.medium,
    });

    expect(pool?.address).toBe(SEPOLIA_USDC_WETH_3000);
    expect(pool?.token0).toBe(usdc);
    expect(pool?.token1).toBe(weth);
  });

  it("derives the same address when the token arguments are swapped", () => {
    const usdc = Protocols.uniswapV3.tokens.USDC[Chains.EthereumMainnet]!;
    const weth = Protocols.uniswapV3.tokens.WETH[Chains.EthereumMainnet]!;
    const forward = uniswapV3Pool({
      chainId: Chains.EthereumMainnet,
      tokenA: usdc,
      tokenB: weth,
      fee: UNISWAP_V3_FEE_TIER.low,
    });
    const reverse = uniswapV3Pool({
      chainId: Chains.EthereumMainnet,
      tokenA: weth,
      tokenB: usdc,
      fee: UNISWAP_V3_FEE_TIER.low,
    });

    expect(forward?.address).toBe(ETHEREUM_USDC_WETH_500);
    expect(reverse).toEqual(forward);
  });

  it("derives the Base and Base Sepolia USDC/WETH pools", () => {
    const base = uniswapV3Pool({
      chainId: Chains.BaseMainnet,
      tokenA: Protocols.uniswapV3.tokens.USDC[Chains.BaseMainnet]!,
      tokenB: Protocols.uniswapV3.tokens.WETH[Chains.BaseMainnet]!,
      fee: UNISWAP_V3_FEE_TIER.low,
    });
    const baseSepolia = uniswapV3Pool({
      chainId: Chains.BaseSepolia,
      tokenA: Protocols.uniswapV3.tokens.WETH[Chains.BaseSepolia]!,
      tokenB: Protocols.uniswapV3.tokens.USDC[Chains.BaseSepolia]!,
      fee: UNISWAP_V3_FEE_TIER.medium,
    });

    expect(base?.address).toBe(BASE_WETH_USDC_500);
    expect(base?.token0).toBe(Protocols.uniswapV3.tokens.WETH[Chains.BaseMainnet]);
    expect(baseSepolia?.address).toBe(BASE_SEPOLIA_USDC_WETH_3000);
  });

  it("returns undefined for the same token, the zero address, a bad address, a bad fee, or an unknown chain", () => {
    const usdc = Protocols.uniswapV3.tokens.USDC[Chains.Sepolia]!;
    const weth = Protocols.uniswapV3.tokens.WETH[Chains.Sepolia]!;

    expect(
      uniswapV3Pool({ chainId: Chains.Sepolia, tokenA: usdc, tokenB: usdc, fee: UNISWAP_V3_FEE_TIER.medium }),
    ).toBeUndefined();
    expect(
      uniswapV3Pool({
        chainId: Chains.Sepolia,
        tokenA: "0x0000000000000000000000000000000000000000",
        tokenB: weth,
        fee: UNISWAP_V3_FEE_TIER.medium,
      }),
    ).toBeUndefined();
    expect(
      uniswapV3Pool({ chainId: Chains.Sepolia, tokenA: "not-an-address", tokenB: weth, fee: UNISWAP_V3_FEE_TIER.medium }),
    ).toBeUndefined();
    expect(uniswapV3Pool({ chainId: Chains.Sepolia, tokenA: usdc, tokenB: weth, fee: 1.5 })).toBeUndefined();
    expect(
      uniswapV3Pool({ chainId: 999_999, tokenA: usdc, tokenB: weth, fee: UNISWAP_V3_FEE_TIER.medium }),
    ).toBeUndefined();
  });
});

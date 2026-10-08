// Canonical Uniswap v3 pool address for a token pair and fee.
//
// The factories in `uniswapV3.factory` deploy pools with CREATE2, so
// the address is fixed by (token0, token1, fee). token0 is the lower
// address. Argument order does not matter. This is a prediction: it
// does not check that the pool was deployed or that it has liquidity.

import { keccak_256 } from "@noble/hashes/sha3";

import { uniswapV3 } from "./uniswap-v3";

/** Canonical UniswapV3Pool creation-code hash. */
export const UNISWAP_V3_POOL_INIT_CODE_HASH =
  "0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54" as const;

const MAX_UINT24 = 0xffffff;
const INIT_CODE_HASH_BYTES = hexToBytes(UNISWAP_V3_POOL_INIT_CODE_HASH);

export type UniswapV3PoolAddress = {
  address: `0x${string}`;
  token0: `0x${string}`;
  token1: `0x${string}`;
};

/**
 * The Uniswap v3 pool for a token pair and fee, from the catalog factory.
 * Returns undefined when the chain has no factory, an address is invalid,
 * the two tokens are the same, or the fee is not a uint24.
 */
export function uniswapV3Pool(options: {
  chainId: number;
  tokenA: string;
  tokenB: string;
  fee: number;
}): UniswapV3PoolAddress | undefined {
  const factory = uniswapV3.factory[options.chainId];
  if (!factory) return undefined;
  if (!Number.isInteger(options.fee) || options.fee < 0 || options.fee > MAX_UINT24) return undefined;

  const tokenA = parseAddress(options.tokenA);
  const tokenB = parseAddress(options.tokenB);
  if (!tokenA || !tokenB) return undefined;
  if (tokenA.lower === tokenB.lower) return undefined;

  const [token0, token1] = tokenA.lower < tokenB.lower ? [tokenA, tokenB] : [tokenB, tokenA];
  const salt = keccak_256(concatBytes([pad32(token0.bytes), pad32(token1.bytes), uint256Bytes(options.fee)]));
  const preimage = concatBytes([new Uint8Array([0xff]), hexToBytes(factory), salt, INIT_CODE_HASH_BYTES]);
  const hash = keccak_256(preimage);
  const addressBytes = hash.slice(12);

  return {
    address: checksumAddress(bytesToHex(addressBytes)),
    token0: token0.checksum,
    token1: token1.checksum,
  };
}

type ParsedAddress = {
  lower: string;
  checksum: `0x${string}`;
  bytes: Uint8Array;
};

function parseAddress(value: string): ParsedAddress | undefined {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) return undefined;
  const lower = value.slice(2).toLowerCase();
  return {
    lower,
    checksum: checksumAddress(lower),
    bytes: hexToBytes(lower),
  };
}

/** EIP-55 checksum. `lowerHex` is 40 hex characters, no 0x prefix. */
function checksumAddress(lowerHex: string): `0x${string}` {
  const hash = bytesToHex(keccak_256(new TextEncoder().encode(lowerHex)));
  let out = "0x";
  for (let i = 0; i < lowerHex.length; i++) {
    const nibble = Number.parseInt(hash[i] ?? "0", 16);
    const ch = lowerHex[i] ?? "";
    out += nibble >= 8 ? ch.toUpperCase() : ch;
  }
  return out as `0x${string}`;
}

function uint256Bytes(value: number): Uint8Array {
  const out = new Uint8Array(32);
  let remaining = value;
  for (let i = 31; i >= 0 && remaining > 0; i--) {
    out[i] = remaining & 0xff;
    remaining = Math.floor(remaining / 256);
  }
  return out;
}

function pad32(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(32);
  out.set(bytes, 32 - bytes.length);
  return out;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const body = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(body.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(body.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

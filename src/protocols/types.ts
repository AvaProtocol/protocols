// Loose ABI fragment shape — matches both ethers/viem-style entries
// and the protobuf-flavoured form some consumers (gRPC bindings,
// OpenAPI-generated types) pass through. We intentionally don't
// narrow `inputs`/`outputs` further than `unknown[]`: callers may
// canonicalize the ABI shape differently downstream, so the catalog
// stays permissive.

export interface AbiFragment {
  readonly name?: string;
  readonly type: string;
  readonly stateMutability?: string;
  readonly anonymous?: boolean;
  readonly inputs?: readonly unknown[];
  readonly outputs?: readonly unknown[];
  // Permissive tail so `AbiFragment` satisfies the
  // `Record<string, unknown>` ABI param shape that ethers / viem /
  // ABI-coder libraries accept. Real ABI entries carry a handful of
  // vendor-specific keys (gas, signature, etc.) we don't enumerate.
  readonly [key: string]: unknown;
}

import { type ChainId } from "../chains";

/**
 * Per-chain address map. Use `ChainId` constants from `Chains.*` for
 * the keys at the call site; `Partial` because not every protocol
 * ships on every chain.
 */
export type AddressByChain = Partial<Record<ChainId, `0x${string}`>>;

/**
 * A single AAVE V3 reserve — the underlying asset plus the AAVE-issued
 * receipt tokens minted against it. Lets a UI present the list of tokens
 * a user can supply (the `underlying`) and the proof token they receive
 * (the `aToken`) without an on-chain round-trip.
 *
 * Generated from chain via `scripts/generate-aave-reserves.ts`
 * (Pool.getReservesList + Pool.getReserveData + ERC-20 metadata).
 */
export interface AaveV3Reserve {
  readonly symbol: string;
  /** The token the user supplies/borrows (ERC-20 underlying). */
  readonly underlying: `0x${string}`;
  /** aToken — the interest-bearing receipt minted on supply. */
  readonly aToken: `0x${string}`;
  /** Variable-rate debt token minted on borrow. */
  readonly variableDebtToken: `0x${string}`;
  /** Decimals of the underlying ERC-20. */
  readonly decimals: number;
}

/**
 * Per-chain AAVE V3 reserve list. `Partial` — not every chain is covered,
 * and the list is ordered by symbol for readable diffs.
 */
export type AaveV3ReservesByChain = Partial<Record<ChainId, readonly AaveV3Reserve[]>>;

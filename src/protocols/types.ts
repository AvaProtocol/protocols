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

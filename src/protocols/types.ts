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
  /**
   * Display / lookup symbol. Usually the on-chain ERC-20 `symbol()`,
   * except when two reserves on the same chain collide (bridged USDC.e
   * vs native Circle USDC both report `"USDC"`) — the generator then
   * disambiguates so a symbol lookup cannot silently pick the bridged
   * token. Prefer `underlying` when you need the contract identity.
   */
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

/**
 * Named AAVE V3 market on a chain. Ethereum hosts four (`core` /
 * `etherFi` / `lido` / `horizon`); every other covered chain is a
 * single `core` market. `aaveV3.pool[chainId]` always points at `core`.
 *
 * Closed on purpose: Aave adds markets (Horizon is recent). A new key
 * must be a type change so exhaustive consumers fail to compile
 * instead of silently ignoring the row. Do not widen this to `string`.
 */
export type AaveV3MarketKey = "core" | "etherFi" | "lido" | "horizon";

/**
 * One AAVE V3 market: the Pool to write against, plus the
 * PoolAddressesProvider that is the on-chain source of truth for that
 * Pool (`getPool()`). The static `pool` address is a cache of that
 * call — implementation upgrades do not move the proxy, but
 * `PoolAddressesProvider.setPool()` theoretically can.
 */
export interface AaveV3Market {
  readonly key: AaveV3MarketKey;
  readonly pool: `0x${string}`;
  readonly poolAddressesProvider: `0x${string}`;
}

/**
 * Per-chain list of every AAVE V3 market. `Partial` — same coverage as
 * `aaveV3.pool`. Ethereum lists four entries; other chains list one
 * (`core`).
 */
export type AaveV3MarketsByChain = Partial<Record<ChainId, readonly AaveV3Market[]>>;

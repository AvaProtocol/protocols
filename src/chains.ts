// Chain ID constants used as the keying convention across this
// catalog. Every per-protocol address map is keyed by these integer
// constants so callers can write `Protocols.aaveV3.pool[Chains.Sepolia]`
// instead of remembering magic numbers.
//
// IDs follow EIP-155. Add a new entry when extending the catalog to a
// chain — the catalog's per-protocol modules each declare which
// chains they cover with `Partial<Record<ChainId, ...>>`.

export const Chains = Object.freeze({
  EthereumMainnet: 1 as const,
  Sepolia: 11_155_111 as const,
  Holesky: 17_000 as const,
  BaseMainnet: 8453 as const,
  BaseSepolia: 84_532 as const,
  BnbMainnet: 56 as const,
});

export type ChainId = (typeof Chains)[keyof typeof Chains] | number;

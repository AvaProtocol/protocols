// Protocols — data-only DeFi catalog. Per-protocol per-chain contract
// addresses, ABI fragments, and event-topic hashes that template
// authors, partner SDKs, and on-chain interpreters need without
// re-deriving or duplicating the same constants across consumers.
//
// Each protocol module ships:
//   - Per-chain address maps keyed by `Chains.*` integer constants
//   - ABI fragments (just the methods + events consumers actually
//     touch — not full protocol ABIs)
//   - Event-topic hashes (keccak256 of canonical event signatures)
//   - Reference token addresses where relevant
//
// Scope: only the static, on-chain-public data. Higher-level UI
// metadata (per-action labels, descriptions, capabilities) belongs to
// each consumer's UX layer, not here. Keeps the package tree-shake-
// able and language-agnostic — the same JSON is reusable from a
// Python or Rust mirror.

export { aaveV3 } from "./aave-v3";
export { aerodrome } from "./aerodrome";
export { chainlink } from "./chainlink";
export { compoundV3 } from "./compound-v3";
export { erc20 } from "./erc20";
export { ethena } from "./ethena";
export { fraxEther } from "./frax-ether";
export { lido } from "./lido";
export { morphoBlue } from "./morpho";
export { rocketPool } from "./rocket-pool";
export { sky } from "./sky";
export { spark } from "./spark";
export { superfluid } from "./superfluid";
export { uniswapV3 } from "./uniswap-v3";
export { wrapped } from "./wrapped";
export { aggregatorV3Abi, erc4626VaultAbi } from "./common";
export type { AbiFragment, AddressByChain } from "./types";

import { aaveV3 } from "./aave-v3";
import { aerodrome } from "./aerodrome";
import { chainlink } from "./chainlink";
import { compoundV3 } from "./compound-v3";
import { erc20 } from "./erc20";
import { ethena } from "./ethena";
import { fraxEther } from "./frax-ether";
import { lido } from "./lido";
import { morphoBlue } from "./morpho";
import { rocketPool } from "./rocket-pool";
import { sky } from "./sky";
import { spark } from "./spark";
import { superfluid } from "./superfluid";
import { uniswapV3 } from "./uniswap-v3";
import { wrapped } from "./wrapped";

/**
 * Namespaced catalog handle:
 *
 *   import { Protocols, Chains } from "@avaprotocol/protocols";
 *   const pool = Protocols.aaveV3.pool[Chains.Sepolia];
 *   const abi  = Protocols.uniswapV3.swapRouter02Abi;
 *
 * Protocol property naming maps each protocol's canonical slug to a
 * lowerCamelCase property:
 *   aave-v3       → aaveV3
 *   compound-v3   → compoundV3
 *   frax-ether    → fraxEther
 *   morpho        → morphoBlue  (the singleton's product name)
 *   rocket-pool   → rocketPool
 *   uniswap-v3    → uniswapV3
 *   (others)      → same as slug, hyphen → camelCase
 */
export const Protocols = Object.freeze({
  aaveV3,
  aerodrome,
  chainlink,
  compoundV3,
  erc20,
  ethena,
  fraxEther,
  lido,
  morphoBlue,
  rocketPool,
  sky,
  spark,
  superfluid,
  uniswapV3,
  wrapped,
});

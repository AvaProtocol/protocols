// @avaprotocol/protocols — multi-chain catalog of DeFi protocol
// contract addresses, ABI fragments, and event topic hashes.
//
// Usage:
//
//   import { Protocols, Chains } from "@avaprotocol/protocols";
//
//   const pool = Protocols.aaveV3.pool[Chains.Sepolia];
//   const abi  = Protocols.uniswapV3.swapRouter02Abi;
//   const sig  = Protocols.aaveV3.eventTopics.Borrow;
//
// See README.md for the full list of supported protocols + chains.

export * from "./protocols";
export { Chains, type ChainId } from "./chains";

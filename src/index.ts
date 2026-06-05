// @avaprotocol/protocols — multi-chain catalog of DeFi protocol
// contract addresses, ABI fragments, event topic hashes, and ERC-20
// token metadata.
//
// Usage:
//
//   import { Protocols, Chains, Tokens, lookupToken } from "@avaprotocol/protocols";
//
//   const pool = Protocols.aaveV3.pool[Chains.Sepolia];
//   const abi  = Protocols.uniswapV3.swapRouter02Abi;
//   const sig  = Protocols.aaveV3.eventTopics.Borrow;
//   const usdc = Tokens.USDC[Chains.EthereumMainnet];
//   const meta = lookupToken(Chains.EthereumMainnet, "0xA0b8...");
//
// See README.md for the full list of supported protocols + chains.

export * from "./protocols";
export { Chains, type ChainId } from "./chains";
export { Tokens, lookupToken } from "./tokens";
export type { TokenByChain, TokenChainEntry, TokenLinks } from "./tokens";

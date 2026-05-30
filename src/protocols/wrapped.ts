// Wrapped native — the canonical wrapper of the chain's native gas
// token. On chains whose native is ETH (Mainnet, Sepolia, Base, Base
// Sepolia) this is the WETH9 (or OP-stack predeploy at 0x4200…0006)
// contract. On chains with a different native gas token, the field
// maps to the equivalent canonical wrapper — e.g. **WBNB** on BNB
// Chain. The field name stays `weth` so chain-agnostic consumers can
// write `Protocols.wrapped.weth[chainId]` without branching by chain.
//
// The bridged-from-Ethereum WETH on BNB
// (0x2170Ed0880ac9A755fd29B2688956BD959F933F8) is a different
// semantic — Binance-Peg ETH ERC-20, not the wrapped native — and is
// intentionally NOT mapped here. Templates that need it pass the
// address inline.

import { Chains } from "../chains";
import { type AbiFragment, type AddressByChain } from "./types";

const weth: AddressByChain = {
  [Chains.EthereumMainnet]: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  [Chains.Sepolia]: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
  [Chains.BaseMainnet]: "0x4200000000000000000000000000000000000006",
  [Chains.BaseSepolia]: "0x4200000000000000000000000000000000000006",
  // BNB Chain's native is BNB, not ETH — this entry is WBNB.
  [Chains.BnbMainnet]: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
};

/**
 * WETH9 ABI — `deposit` (payable wrap) + `withdraw` (unwrap) + the
 * standard ERC-20 surface callers rely on. `deposit` is payable with
 * no args — the wrap amount comes from `msg.value`, so any wallet UI
 * or contract-write builder must surface an editable `value` field.
 * The `stateMutability: "payable"` marker is what signals that.
 */
const wethAbi: readonly AbiFragment[] = Object.freeze([
  {
    inputs: [],
    name: "deposit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "wad", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "guy", type: "address" },
      { internalType: "uint256", name: "wad", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
]);

export const wrapped = Object.freeze({
  weth,
  wethAbi,
});

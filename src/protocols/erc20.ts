// Minimal ERC-20 ABI fragments and event topic hashes that templates
// routinely need but don't belong to any one protocol. Tests across
// the SDK and aggregator all re-derive these — the catalog centralizes
// them so consumers can drop the inline copies.
//
// Covers: approve / transfer / symbol / decimals function fragments,
// the Transfer(address,address,uint256) event ABI + topic, and a
// pre-computed keccak256 for topics[0] filtering.

import { type AbiFragment } from "./types";

const approveAbi: readonly AbiFragment[] = Object.freeze([
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
]);

const transferAbi: readonly AbiFragment[] = Object.freeze([
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
]);

const symbolAbi: readonly AbiFragment[] = Object.freeze([
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
]);

const decimalsAbi: readonly AbiFragment[] = Object.freeze([
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
]);

/**
 * Standard ERC-20 Transfer event ABI — used by `eventTrigger` queries
 * to decode the indexed `from` / `to` and the value payload.
 */
const transferEventAbi: readonly AbiFragment[] = Object.freeze([
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      { indexed: false, internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "Transfer",
    type: "event",
  },
]);

/**
 * Pre-computed keccak256 of canonical ERC-20 event signatures. Match
 * `topics[0]` on `eventTrigger` queries against these.
 */
const eventTopics = Object.freeze({
  Transfer: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
} as const);

export const erc20 = Object.freeze({
  approveAbi,
  transferAbi,
  symbolAbi,
  decimalsAbi,
  transferEventAbi,
  eventTopics,
});

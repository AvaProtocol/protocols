// Chainlink Data Feeds — AggregatorV3Interface price oracles.
//
// The ABI for every Chainlink Data Feed is the same (AggregatorV3
// Interface), so it lives in `./common.ts` as `aggregatorV3Abi` and
// every feed entry below reuses it. The catalog ships ETH/USD +
// BTC/USD on mainnet plus ETH/USD on Sepolia by default. Extend
// with additional feeds (LINK/USD, EUR/USD, etc.) as needed.
//
// Canonical feed addresses:
//   https://docs.chain.link/data-feeds/price-feeds/addresses

import { Chains } from "../chains";
import { aggregatorV3Abi } from "./common";
import { type AddressByChain } from "./types";

const ethUsdFeed: AddressByChain = {
  [Chains.EthereumMainnet]: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
  [Chains.Sepolia]: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
  [Chains.BnbMainnet]: "0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e",
};

const btcUsdFeed: AddressByChain = {
  [Chains.EthereumMainnet]: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c",
  [Chains.BnbMainnet]: "0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf",
};

/**
 * BNB/USD feed — only meaningful on BNB Chain (where BNB is the
 * native gas token). The catalog ships this so templates on BNB can
 * read native-asset prices the same way ETH-based chains read ETH/USD.
 */
const bnbUsdFeed: AddressByChain = {
  [Chains.BnbMainnet]: "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE",
};

export const chainlink = Object.freeze({
  ethUsdFeed,
  btcUsdFeed,
  bnbUsdFeed,
  /** Shared AggregatorV3 ABI — works for any Chainlink feed. */
  aggregatorV3Abi,
});

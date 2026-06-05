// Top-level token catalog. Mirrors `Protocols.*` in shape but is
// keyed by ERC-20 symbol — tokens cross protocol boundaries (USDC
// is touched by every DEX, lending market, and template), so they
// don't belong nested under any single protocol module.
//
// Pre-existing per-protocol token addresses under
// `Protocols.{name}.tokens.{SYMBOL}` continue to work for backward
// compatibility — those carry only the address, not the wider
// metadata shipped here.
//
// Lookup patterns:
//   import { Tokens, Chains, lookupToken } from "@avaprotocol/protocols";
//
//   // By symbol + chain
//   const usdc = Tokens.USDC[Chains.EthereumMainnet];
//
//   // By contract address (reverse lookup)
//   const meta = lookupToken(Chains.EthereumMainnet, "0xA0b86991...");

import { Chains } from "../chains";
import { type TokenByChain, type TokenChainEntry } from "./types";

export type { TokenByChain, TokenChainEntry, TokenLinks } from "./types";

const USDC: TokenByChain = {
  [Chains.EthereumMainnet]: {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    name: "USD Coin",
    description: "Fully-reserved USD stablecoin issued by Circle.",
    website: "https://www.circle.com/usdc",
    explorer: "https://etherscan.io/token/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    logoUrl: "https://raw.githubusercontent.com/AvaProtocol/protocols/main/logos/ethereum/USDC.png",
    links: {
      coingecko: "https://www.coingecko.com/en/coins/usd-coin",
      coinmarketcap: "https://coinmarketcap.com/currencies/usd-coin/",
    },
  },
  [Chains.BaseMainnet]: {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    decimals: 6,
    name: "USD Coin",
    explorer: "https://basescan.org/token/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  [Chains.Sepolia]: {
    address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    decimals: 6,
    name: "USD Coin (Sepolia)",
    explorer: "https://sepolia.etherscan.io/token/0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  },
  [Chains.BaseSepolia]: {
    address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    decimals: 6,
    name: "USD Coin (Base Sepolia)",
    explorer: "https://sepolia.basescan.org/token/0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  },
  [Chains.BnbMainnet]: {
    address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    decimals: 18,
    name: "Binance-Peg USD Coin",
    explorer: "https://bscscan.com/token/0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  },
};

const USDT: TokenByChain = {
  [Chains.EthereumMainnet]: {
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    name: "Tether USD",
    description: "USD-pegged stablecoin issued by Tether.",
    website: "https://tether.to",
    explorer: "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    logoUrl: "https://raw.githubusercontent.com/AvaProtocol/protocols/main/logos/ethereum/USDT.png",
    links: {
      coingecko: "https://www.coingecko.com/en/coins/tether",
      coinmarketcap: "https://coinmarketcap.com/currencies/tether/",
    },
  },
  [Chains.BnbMainnet]: {
    address: "0x55d398326f99059fF775485246999027B3197955",
    decimals: 18,
    name: "Binance-Peg Tether USD",
    explorer: "https://bscscan.com/token/0x55d398326f99059fF775485246999027B3197955",
  },
};

const WETH: TokenByChain = {
  [Chains.EthereumMainnet]: {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18,
    name: "Wrapped Ether",
    description: "ERC-20 wrapper around native ETH, 1:1 backed.",
    explorer: "https://etherscan.io/token/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    logoUrl: "https://raw.githubusercontent.com/AvaProtocol/protocols/main/logos/ethereum/WETH.png",
    links: {
      coingecko: "https://www.coingecko.com/en/coins/weth",
    },
  },
  [Chains.Sepolia]: {
    address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    decimals: 18,
    name: "Wrapped Ether (Sepolia)",
    explorer: "https://sepolia.etherscan.io/token/0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
  },
  [Chains.BaseMainnet]: {
    address: "0x4200000000000000000000000000000000000006",
    decimals: 18,
    name: "Wrapped Ether",
    explorer: "https://basescan.org/token/0x4200000000000000000000000000000000000006",
  },
  [Chains.BaseSepolia]: {
    address: "0x4200000000000000000000000000000000000006",
    decimals: 18,
    name: "Wrapped Ether (Base Sepolia)",
    explorer: "https://sepolia.basescan.org/token/0x4200000000000000000000000000000000000006",
  },
};

const DAI: TokenByChain = {
  [Chains.EthereumMainnet]: {
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    decimals: 18,
    name: "Dai Stablecoin",
    description: "Decentralized USD-pegged stablecoin issued by MakerDAO.",
    website: "https://makerdao.com",
    explorer: "https://etherscan.io/token/0x6B175474E89094C44Da98b954EedeAC495271d0F",
    logoUrl: "https://raw.githubusercontent.com/AvaProtocol/protocols/main/logos/ethereum/DAI.png",
    links: {
      coingecko: "https://www.coingecko.com/en/coins/dai",
      coinmarketcap: "https://coinmarketcap.com/currencies/multi-collateral-dai/",
    },
  },
  [Chains.BaseMainnet]: {
    address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    decimals: 18,
    name: "Dai Stablecoin",
    explorer: "https://basescan.org/token/0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
  },
};

const LINK: TokenByChain = {
  [Chains.EthereumMainnet]: {
    address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    decimals: 18,
    name: "ChainLink Token",
    description: "Native token of the Chainlink decentralized oracle network.",
    website: "https://chain.link",
    explorer: "https://etherscan.io/token/0x514910771AF9Ca656af840dff83E8264EcF986CA",
    logoUrl: "https://raw.githubusercontent.com/AvaProtocol/protocols/main/logos/ethereum/LINK.png",
    links: {
      coingecko: "https://www.coingecko.com/en/coins/chainlink",
      coinmarketcap: "https://coinmarketcap.com/currencies/chainlink/",
    },
  },
  [Chains.Sepolia]: {
    // AAVE V3 faucet-mintable LINK on Sepolia — NOT canonical Chainlink LINK.
    // Templates targeting the AAVE Sepolia market need this address; the real
    // Chainlink LINK on Sepolia is at 0x779877A7B0D9E8603169DdbD7836e478b4624789.
    address: "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5",
    decimals: 18,
    name: "ChainLink Token (AAVE Sepolia faucet)",
    explorer: "https://sepolia.etherscan.io/token/0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5",
  },
};

/**
 * Symbol → per-chain entry. Frozen at module load. New tokens are
 * added by appending a `const` here and including it in the export.
 *
 * Symbol keys are the canonical uppercase ERC-20 ticker (USDC, not
 * usdc/Usdc). The catalog is intentionally not case-insensitive at
 * this level — callers needing a fuzzy lookup should normalize at
 * their own boundary.
 */
export const Tokens = Object.freeze({
  USDC,
  USDT,
  WETH,
  DAI,
  LINK,
}) satisfies Readonly<Record<string, TokenByChain>>;

/**
 * Reverse lookup: given a chain ID and a contract address, find the
 * token entry plus its symbol. Address matching is case-insensitive
 * so callers can pass checksum or lowercase without normalizing
 * upstream. Returns `undefined` when the chain isn't covered, when
 * the address isn't registered on that chain, or when either argument
 * is missing/falsy.
 *
 * Typical use: aggregator payloads ship `tokenSymbol="UNKNOWN"` for
 * tokens whose chain-specific RPC enrichment failed; consumers can
 * fall through to `lookupToken(chainId, contractAddress)` and recover
 * the symbol + decimals from this catalog.
 */
export function lookupToken(
  chainId: number | undefined,
  address: string | undefined,
): (TokenChainEntry & { symbol: string }) | undefined {
  if (!chainId || !address) return undefined;
  const target = address.toLowerCase();
  for (const [symbol, byChain] of Object.entries(Tokens)) {
    const entry = (byChain as TokenByChain)[chainId as keyof TokenByChain];
    if (entry && entry.address.toLowerCase() === target) {
      return { symbol, ...entry };
    }
  }
  return undefined;
}

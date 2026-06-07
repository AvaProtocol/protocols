// Per-chain token catalog — BNB Smart Chain mainnet.
//
// Available via the subpath export:
//   import { tokens, chainId } from "@avaprotocol/protocols/tokens/bnb-mainnet";
//   const usdc = tokens.USDC?.address;
//
// Consumers that only need one chain's tokens get this single file in
// their bundle instead of all five chains' worth of data via the root
// `Tokens` namespace.

import data from "./data/bnb-mainnet.json" with { type: "json" };
import { Chains } from "../chains";
import { buildChainTokenMap, type TokenDataRow } from "./per-chain";
import type { TokenChainEntry } from "./types";

export const chainId = Chains.BnbMainnet;

export const tokens: Readonly<Record<string, TokenChainEntry>> = buildChainTokenMap(
  data as ReadonlyArray<TokenDataRow>,
  "src/tokens/data/bnb-mainnet.json",
);

export default tokens;

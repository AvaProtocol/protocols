// Token catalog types. Each ERC-20 symbol gets a per-chain map of
// `TokenChainEntry` records, mirroring the `AddressByChain` pattern
// used by `src/protocols/*` but carrying the additional metadata that
// non-protocol-specific consumers (UIs, summarizers, indexers) all
// re-derive today.
//
// Scope intentionally narrow:
//   - Identity   — address, symbol, name, decimals
//   - Reference  — explorer, website, optional links
//   - Display    — logoUrl (always a URL, never a bundled binary)
//   - Transfers  — transferConstraints (behaviour a batch transfer must handle)
//
// Provenance (canonical source links, verification dates, native vs.
// bridged) lives in `src/tokens/provenance/*.json`. Tests read it; no
// module imports it, so the build does not ship it.
//
// Excluded by design:
//   - status / tags / research — vestigial from upstream tokenlists,
//     no consumer in this monorepo reads them.
//   - Logo PNG files — keep the package binary-free so backend
//     consumers don't carry render-only assets in node_modules.

import { type ChainId } from "../chains";

/**
 * External reference links for a token. All fields optional — the
 * catalog only records what's actually known per token. Add new keys
 * here when adding a category we want to surface; consumers ignore
 * unknown keys harmlessly.
 *
 * Keys follow the names used by upstream catalogs (Studio's
 * `app/lib/erc20/*.json` in particular) so the port is mechanical.
 * `x` is the renamed Twitter; we deliberately use the current name
 * rather than carrying a `twitter` alias.
 */
export interface TokenLinks {
  readonly github?: string;
  readonly x?: string;
  readonly coingecko?: string;
  readonly coinmarketcap?: string;
  readonly reddit?: string;
  readonly blog?: string;
  readonly whitepaper?: string;
  readonly facebook?: string;
  readonly discord?: string;
  readonly telegram?: string;
  readonly medium?: string;
  readonly docs?: string;
  readonly forum?: string;
  readonly youtube?: string;
}

/**
 * Token behaviour that makes a plain `transfer(to, amount)` to an
 * arbitrary address revert or deliver a different amount. Recorded so
 * a consumer that batches transfers (a wallet sweep, a payout) can
 * warn or validate before it builds the batch.
 *
 * Listing a token without constraints means only that none is known.
 * It is not a promise that every transfer succeeds: issuer freezes,
 * pauses and sanctions blocklists apply to most fiat-backed tokens and
 * are deliberately not recorded here. Preparation should still
 * simulate the actual transfers. See docs/TOKEN_CATALOG.md.
 */
export const TOKEN_TRANSFER_CONSTRAINT = Object.freeze({
  /**
   * The recipient must be on the issuer's allowlist (KYC or qualified
   * access). A transfer to an address the issuer has not onboarded
   * reverts, including the holder's own new wallet.
   */
  permissionedRecipient: "permissionedRecipient",
  /**
   * Balances are share-based and change without transfers. A transfer
   * of the full balance can leave 1–2 wei behind, and the amount
   * received can differ from the amount requested by rounding.
   */
  rebasing: "rebasing",
  /** The token takes a fee on transfer; the recipient receives less than the amount sent. */
  feeOnTransfer: "feeOnTransfer",
} as const);

export type TokenTransferConstraint = (typeof TOKEN_TRANSFER_CONSTRAINT)[keyof typeof TOKEN_TRANSFER_CONSTRAINT];

/**
 * Per-chain token deployment record. `address` and `decimals` are
 * required because they're the universal lookup primitives every
 * consumer needs. All other fields are optional metadata.
 *
 * `name` is per-chain because some tokens use different display names
 * on different deployments (e.g. AAVE's faucet-LINK on Sepolia is
 * "ChainLink Token" vs. "Chainlink" on mainnet). When the chains
 * agree, the same string is fine to repeat.
 *
 * `logoUrl` is a fully qualified URL — typically a GitHub Raw or CDN
 * link. Studio renders local PNGs by resolving symbol+chain itself
 * and ignores this field; backend consumers may surface the URL
 * directly in summaries or skip it.
 */
export interface TokenChainEntry {
  readonly address: `0x${string}`;
  readonly decimals: number;
  readonly name?: string;
  readonly description?: string;
  readonly website?: string;
  readonly explorer?: string;
  readonly logoUrl?: string;
  readonly links?: TokenLinks;
  /**
   * Known transfer behaviour on this deployment. Absent when none is
   * known. A recognized holding with constraints is still a legitimate
   * holding: show it, and let transfer preparation decide whether a
   * given transfer works.
   */
  readonly transferConstraints?: readonly TokenTransferConstraint[];
}

/**
 * Map of `ChainId → TokenChainEntry`. `Partial` because no token is
 * deployed on every chain in the catalog.
 */
export type TokenByChain = Partial<Record<ChainId, TokenChainEntry>>;

/**
 * Token catalog provenance: where each catalog row's address comes from.
 *
 * One JSON file per catalog chain under `src/tokens/provenance/`, next to
 * the `src/tokens/data/` file it describes. No module under `src/`
 * imports these files, so the build does not ship them; the coverage
 * test and the report script read them.
 *
 * A provenance row pins one catalog row's address to the sources that
 * vouch for it. `tests/token-coverage.test.ts` fails when the two
 * disagree, so moving an address means updating its sources too.
 *
 * See docs/TOKEN_CATALOG.md for the inclusion policy.
 */

import ethereum from "../../src/tokens/provenance/ethereum.json" with { type: "json" };
import base from "../../src/tokens/provenance/base.json" with { type: "json" };
import bnbMainnet from "../../src/tokens/provenance/bnb-mainnet.json" with { type: "json" };
import sepolia from "../../src/tokens/provenance/sepolia.json" with { type: "json" };
import baseSepolia from "../../src/tokens/provenance/base-sepolia.json" with { type: "json" };
import { Chains } from "../../src/chains";

/** How the token came to exist on this chain. */
export const TOKEN_ISSUANCE = Object.freeze({
  /** Minted on this chain by the asset's issuer or protocol (including its canonical wrapper of the native coin). */
  native: "native",
  /** A representation of an asset native elsewhere, minted by a bridge or a third party. `bridge` names it. */
  bridged: "bridged",
  /** A testnet deployment. `issuer` says who deployed it; it may not be the mainnet issuer. */
  test: "test",
} as const);

export type TokenIssuance = (typeof TOKEN_ISSUANCE)[keyof typeof TOKEN_ISSUANCE];

export interface TokenProvenanceRow {
  readonly symbol: string;
  readonly address: string;
  readonly issuance: TokenIssuance;
  /** The organisation that publishes the address (issuer, protocol, or bridge operator). */
  readonly issuer: string;
  /** Present when `issuance` is `bridged`: the bridge or operator (e.g. "Binance-Peg", "Base standard bridge"). */
  readonly bridge?: string;
  /** Superseded by a newer deployment or no longer issued. Holdings still exist, so the row stays. */
  readonly legacy?: boolean;
  /** Issuer or protocol pages (or official repositories) that list this exact address on this chain. */
  readonly sources: readonly string[];
  /** Secondary evidence: maintained token lists, explorer pages, deployer matches. */
  readonly references?: readonly string[];
  /** ISO date (YYYY-MM-DD) the sources and the on-chain read were last checked. */
  readonly verifiedAt: string;
  readonly notes?: string;
}

/** Catalog chains with a provenance file, in report order. */
export const PROVENANCE_BY_CHAIN: ReadonlyArray<readonly [number, readonly TokenProvenanceRow[]]> = [
  [Chains.EthereumMainnet, ethereum as readonly TokenProvenanceRow[]],
  [Chains.BaseMainnet, base as readonly TokenProvenanceRow[]],
  [Chains.BnbMainnet, bnbMainnet as readonly TokenProvenanceRow[]],
  [Chains.Sepolia, sepolia as readonly TokenProvenanceRow[]],
  [Chains.BaseSepolia, baseSepolia as readonly TokenProvenanceRow[]],
];

export function provenanceFor(chainId: number): readonly TokenProvenanceRow[] {
  return PROVENANCE_BY_CHAIN.find(([id]) => id === chainId)?.[1] ?? [];
}

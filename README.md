# @avaprotocol/protocols

[![npm](https://img.shields.io/npm/v/@avaprotocol/protocols?color=blue)](https://www.npmjs.com/package/@avaprotocol/protocols)
[![CI](https://github.com/AvaProtocol/protocols/actions/workflows/ci.yml/badge.svg)](https://github.com/AvaProtocol/protocols/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Multi-chain catalog of DeFi protocol contract addresses, ABI fragments, and event topic hashes. Curated for callers who need a canonical reference without re-deriving constants or re-vendoring protocol SDKs.

```ts
import { Protocols, Chains } from "@avaprotocol/protocols";

const pool = Protocols.aaveV3.pool[Chains.Sepolia];
// → "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951"

const abi  = Protocols.uniswapV3.swapRouter02Abi;
// → readonly AbiFragment[] with exactInputSingle + exactOutputSingle

const sig  = Protocols.aaveV3.eventTopics.Borrow;
// → keccak256("Borrow(address,address,address,uint256,uint8,uint256,uint16)")
```

## What's covered

| Protocol | Contracts | Chains |
|---|---|---|
| **AAVE V3** | Pool, Oracle, WETH Gateway + Pool methods/events ABI + topics | Mainnet, Sepolia, Base, Base Sepolia, **BNB** (no WETH Gateway on BNB) |
| **Aerodrome** | Router | Base |
| **Chainlink** | ETH/USD + BTC/USD + BNB/USD feeds + AggregatorV3 ABI | Mainnet, Sepolia, **BNB** (BNB/USD is BNB-only) |
| **Compound V3** | USDC Comet market | Mainnet, Base |
| **Ethena** | USDe, sUSDe vault + custom (cooldown-aware) ABI | Mainnet |
| **Frax Ether** | frxETH, sfrxETH vault + standard ERC-4626 ABI | Mainnet |
| **Lido** | stETH, wstETH + L1 wrap/unwrap/rate ABI | Mainnet, Base (wstETH bridged) |
| **Morpho Blue** | Singleton + MarketParams-tuple supply/borrow/position ABI | Mainnet, Base |
| **Rocket Pool** | rETH + L1 burn/rate/value ABI | Mainnet, Base (bridged) |
| **Sky (sDAI)** | sDAI vault + standard ERC-4626 ABI | Mainnet |
| **Spark** | SparkLend Pool (AAVE V3 fork — reuse AAVE Pool ABI) | Mainnet |
| **Superfluid** | CFAv1Forwarder + setFlowrate/createFlow ABI | Mainnet, Base, **BNB** |
| **Uniswap V3** | SwapRouter02, QuoterV2, Permit2, Factory, NFT Position Manager, Universal Router + ABIs | Mainnet, Sepolia, Base, Base Sepolia, **BNB** |
| **Wrapped Ether** | Canonical wrapper of native gas + WETH9 ABI (WBNB on BNB) | Mainnet, Sepolia, Base, Base Sepolia, **BNB** |
| **ERC-20** | Standard `approve` ABI fragment | n/a |

Shared ABIs (consumed by multiple protocol modules):

- `aggregatorV3Abi` — any Chainlink-compatible price feed
- `erc4626VaultAbi` — standard ERC-4626 vault (used by Frax Ether sfrxETH, Sky sDAI)

## Install

```sh
yarn add @avaprotocol/protocols
# or
npm install @avaprotocol/protocols
# or
pnpm add @avaprotocol/protocols
```

Works with Node 18+, modern bundlers, and any TypeScript 4.7+ consumer. Ships dual CJS + ESM with full `.d.ts`.

## Usage patterns

### Pin an address by chain

```ts
import { Protocols, Chains } from "@avaprotocol/protocols";

const linkOnSepolia = Protocols.aaveV3.tokens.LINK[Chains.Sepolia]!;
// "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5"
```

`Partial<Record<ChainId, …>>` is the catalog's keying convention — every protocol declares which chains it covers. Use the non-null assertion (`!`) only when you're sure the chain is covered, or guard with `if`.

### Compose a contract write

```ts
import { Protocols, Chains } from "@avaprotocol/protocols";

await wallet.contractWrite({
  contractAddress: Protocols.aaveV3.pool[Chains.Sepolia]!,
  contractAbi: Protocols.aaveV3.poolMethodsAbi,
  methodCalls: [
    {
      methodName: "supply",
      methodParams: [
        Protocols.aaveV3.tokens.LINK[Chains.Sepolia]!,
        "100000000000000000",   // 0.1 LINK
        wallet.address,
        "0",                    // referralCode
      ],
    },
  ],
});
```

### Filter on an event topic

```ts
import { Protocols } from "@avaprotocol/protocols";

const filter = {
  address: Protocols.aaveV3.pool[Chains.Sepolia],
  topics: [
    Protocols.aaveV3.eventTopics.Borrow,
    null,            // any reserve
    padAddress(eoa), // onBehalfOf = my EOA
  ],
};
```

### Address lookups by `(chainId, address)`

For consumers that need to *recognize* an address rather than look it up by name (e.g. transaction interpreters), iterate the registry directly:

```ts
import { Protocols, Chains } from "@avaprotocol/protocols";

function isAaveV3Pool(chainId: number, address: string): boolean {
  const expected = Protocols.aaveV3.pool[chainId];
  return !!expected && expected.toLowerCase() === address.toLowerCase();
}
```

(A first-class reverse-lookup helper may ship later; the data shape already supports it.)

## Design

Three principles drive what's in vs. what's out:

1. **Static, on-chain-public data only.** Addresses, ABI fragments, event topic hashes, well-known token references. No private/embargoed protocol addresses; no RPC URLs, API keys, or credentials.
2. **No UI metadata.** Per-action labels, descriptions, slugs, capability tags belong to each consumer's UX layer. This keeps the package tree-shakeable, language-agnostic, and reusable across web UIs, server-side indexers, partner SDKs, and CLI tooling.
3. **Curated ABI fragments, not full ABIs.** Each protocol module ships only the methods + events callers routinely touch (e.g., AAVE Pool's `supply`/`borrow`/`repay`/`withdraw` + the 5 monitorable events, not the full ~80-method ABI). Keeps the bundle small and the API surface reviewable. Need a method not in the catalog? Open a PR — adding one fragment is a small diff.

## Comparison with adjacent projects

| Project | Scope | This catalog's delta |
|---|---|---|
| [`@bgd-labs/aave-address-book`](https://github.com/bgd-labs/aave-address-book) | AAVE-only, exhaustive | Spans 14+ protocols. Borrows the shape + governance model. |
| [`@uniswap/sdk-core`](https://github.com/Uniswap/sdk-core) | Uniswap-only, addresses + math primitives | We ship Uniswap as one entry; don't duplicate the math. |
| [`blockchain-addressbook`](https://github.com/beefyfinance/address-book) | Multi-protocol, Beefy-opinionated | Includes ABI fragments + event topics; not Beefy-vault-shaped. |
| [Uniswap TokenLists](https://tokenlists.org/) | Tokens only, standardized schema | Complementary — we ship protocol contracts; you bring your own token list. |

There's no equivalent multi-protocol + multi-chain + addresses + ABIs + topics package in the npm ecosystem today, so this fills a gap. See `tests/catalog.test.ts` for shape guarantees.

## Adding a new protocol

1. Create `src/protocols/<protocol>.ts` with the per-chain address maps, ABI fragments, and event topics following the existing modules as templates (`aave-v3.ts` is the most complete example).
2. Wire it through `src/protocols/index.ts` — add the import, the re-export, and the entry in the `Protocols.*` namespace.
3. Add the entry to the supported-protocols table in this README + to the `it("exports every shipped protocol", ...)` test.
4. Open a PR — CI runs typecheck + tests + build + tarball verification across Node 18/20/22.

Address verification: link to the canonical source (Etherscan-verified deployment, protocol docs, official address book). PRs that don't cite a source for the addresses won't merge.

## Versioning

Semver. Until `1.0.0`, breaking changes can land in minor versions (`0.x`), but address corrections are always patches.

- **Patch (`0.1.x`)** — address corrections, bug fixes, doc-only changes.
- **Minor (`0.x.0`)** — new protocols, new chains, additive ABI fragments.
- **Major (`x.0.0`)** — renames, restructures, breaking removals.

The `dev` npm tag tracks the latest pre-release; `latest` stays on stable.

## License

MIT — see [LICENSE](LICENSE).

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
| **AAVE V3** | Pool, Oracle, WETH Gateway, PoolAddressesProvider, UiPoolDataProvider + Pool methods/events ABI (incl. config reads) + reserve/user config bit layouts + topics | Mainnet, Sepolia, Base, Base Sepolia, **BNB** (no WETH Gateway on BNB) |
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

### Read a reserve's risk config (health-factor math)

Risk parameters (`ltv`, `liquidationThreshold`, `active`/`frozen`/`paused`, …) are **governance-mutable** — the catalog deliberately does **not** bake their values into the static `reserves` list. Ship the address to read from, not the value; the live read stays in the consumer. Decode the on-chain bitmap with the exported bit layout, which is version-stable across every deployed AAVE V3 market:

```ts
import { Protocols, Chains } from "@avaprotocol/protocols";

// Pool.getConfiguration(asset) → ReserveConfigurationMap { data: uint256 }
const raw = BigInt(configData); // the `data` field of the returned struct
const { ltv, liquidationThreshold, decimals } = Protocols.aaveV3.reserveConfigurationBits;
const field = (f: { offset: number; bits: number }) =>
  (raw >> BigInt(f.offset)) & ((1n << BigInt(f.bits)) - 1n);

const ltvBps = Number(field(ltv));                  // e.g. 8050 = 80.50%
const liqThresholdBps = Number(field(liquidationThreshold));
const tokenDecimals = Number(field(decimals));
```

For a whole-market sweep in one round-trip, use `Protocols.aaveV3.uiPoolDataProvider[chainId]` with `PoolAddressesProvider` — note the SDK ships the **addresses** but not the periphery return-struct ABI, which is version-specific per chain; pair it with a version-aware ABI (e.g. `@bgd-labs/aave-address-book`). `Protocols.aaveV3.poolMethodsAbi` carries the version-stable `getConfiguration` / `getUserConfiguration` / `getReserveData` reads for the per-asset path on any chain.

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

## Tokens sidecar (for non-TS consumers)

`yarn build` writes a per-chain JSON file under `dist/tokens/` alongside the JS + d.ts outputs:

```
dist/tokens/
├── ethereum.json       (chain 1)
├── sepolia.json        (chain 11155111)
├── base.json           (chain 8453)
├── base-sepolia.json   (chain 84532)
├── bnb-mainnet.json    (chain 56)
└── holesky.json        (chain 17000)
```

Each file is a stable-sorted array of `{ id, name, symbol, decimals }` entries — the same schema the EigenLayer-AVS Go aggregator already consumes under `token_whitelist/*.json`, so a Go service can pick up the catalog without depending on the TS toolchain. `id` is the lowercased address (matching Go's read-side normalization). Metadata fields TS consumers use (`description`, `website`, `logoUrl`, `links`) are intentionally omitted; TS callers import the `Tokens` namespace from source instead.

### When to run it

- **Automatically** — `yarn build` invokes `yarn build:tokens-sidecar` as its last step, so any release publishes a fresh sidecar in the npm tarball.
- **Standalone** — `yarn build:tokens-sidecar` when you've edited `src/tokens/` and want to inspect the generated JSON without rebuilding declarations + JS.

### Adding a new chain

The script throws fast if the catalog grows a token on a chain that isn't registered in `CHAIN_FILE_NAMES` inside `scripts/build-tokens-sidecar.ts`:

```
[tokens-sidecar] no file name registered for chain <id>.
Add it to CHAIN_FILE_NAMES in scripts/build-tokens-sidecar.ts.
```

Fix is one line — append `[Chains.NewChain]: "newchain-mainnet"` to the map. The error message points at the exact file so this can't silently ship an incomplete sidecar.

### Consuming the sidecar (Go example)

```go
// EigenLayer-AVS already does this for its checked-in
// token_whitelist/*.json; the dist/tokens/*.json from this package
// match the same schema.
type tokenEntry struct {
    ID       string `json:"id"`
    Name     string `json:"name"`
    Symbol   string `json:"symbol"`
    Decimals int    `json:"decimals"`
}

raw, err := os.ReadFile("path/to/dist/tokens/sepolia.json")
// ... json.Unmarshal(raw, &entries) ...
```

## Releasing

This package uses [changesets](https://github.com/changesets/changesets) for versioning. The day-to-day flow:

```bash
# 1. Make your code changes on a feature branch.
yarn changeset                   # interactive prompt; pick bump level + write the changelog entry
git add .changeset && git commit -m "..."
git push                         # open PR as normal
```

When the PR merges to `main`, the `Release` workflow (`.github/workflows/release.yml`) either:

- Opens (or updates) a "Version Packages" PR that runs `yarn changeset version` — bumps `package.json` + writes `CHANGELOG.md`. Review and merge that PR.
- Or, if there are no pending changesets, runs `yarn release` (`yarn build && yarn changeset publish`) — which publishes to npm with the right dist-tag automatically (stable → `latest`, pre-release → its identifier).

### Publishing manually (escape hatch)

If you need to publish without the GitHub Action — e.g. an emergency release from a machine that has `npm login` credentials:

```bash
yarn build                        # produces dist/ + tokens sidecar
npm whoami                        # verify logged in
npm publish --access public       # for stable versions; goes to `latest`
# or for a pre-release:
npm publish --access public --tag dev
```

`prepublishOnly: yarn build` runs the build chain automatically if you forget, so even `npm publish` alone is safe.

## Versioning

Semver. Until `1.0.0`, breaking changes can land in minor versions (`0.x`), but address corrections are always patches.

- **Patch (`0.1.x`)** — address corrections, bug fixes, doc-only changes.
- **Minor (`0.x.0`)** — new protocols, new chains, additive ABI fragments.
- **Major (`x.0.0`)** — renames, restructures, breaking removals.

The `dev` npm tag tracks the latest pre-release; `latest` stays on stable.

## License

MIT — see [LICENSE](LICENSE).

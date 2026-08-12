# @avaprotocol/protocols

## 0.10.0

### Minor Changes

- 0e9a255: Add Uniswap V3 (SwapRouter02 / QuoterV2 / Factory / NFT Position Manager / Permit2 / Universal Router) plus `wrapped.weth` and native Circle USDC on Arbitrum One (42161) and Optimism (10). Addresses from the official Uniswap deployment pages. This unblocks `SessionPolicyActions.uniswapV3Swap(chainId)` in the SDK — that helper reads `swapRouter02[chainId]` and refuses unknown chains.

## 0.9.0

### Minor Changes

- 88ec8f2: Ship AAVE V3 Pool coverage for writes (issue #23).

  - Add Arbitrum One (42161) and Optimism (10) to `Chains` and to the AAVE V3 `pool` / `oracle` / `poolAddressesProvider` / `uiPoolDataProvider` / `wethGateway` maps. Addresses from `@aave-dao/aave-address-book` (`AaveV3Arbitrum`, `AaveV3Optimism`).
  - Add `aaveV3.markets` — every Pool on a chain, not just the canonical one. Ethereum lists Core / EtherFi / Lido / Horizon; every other covered chain is a single `core` row. Each row carries `pool` plus `poolAddressesProvider` (the on-chain `getPool()` escape hatch). `aaveV3.pool[chainId]` stays Core so existing consumers do not break.
  - Document that the static Pool map is a deliberate cache, not an assumption of immutability.
  - Regenerate `aaveV3.reserves` so Arbitrum and Optimism ship a Core reserve list (underlyings / aTokens / decimals). Without this a consumer can resolve a Pool and still get an empty supply-token picker.
  - Guard the next regenerate: a test now asserts `reserves` covers the same chain set as `pool`. Bridged USDC.e on Arb/OP is labeled `USDC.e` (on-chain `symbol()` is still `"USDC"`) so a symbol lookup cannot silently resolve to the bridged token.

  Non-goal (unchanged): `aaveV3.reserves` stays Core-only. Non-Core Ethereum markets (EtherFi / Lido / Horizon) list different reserves; scoping those is a separate issue.

## 0.8.0

### Minor Changes

- b8bcb3f: Ship AAVE V3 reserve-config read surface (issue #19, the scale optimization).

  - Add `aaveV3.poolAddressesProvider` and `aaveV3.uiPoolDataProvider` per-chain address maps (Mainnet, Sepolia, Base, Base Sepolia, BNB). Each `PoolAddressesProvider` was verified on-chain — `getPool()` returns the catalog's existing `pool` address — and each `UiPoolDataProvider` verified as deployed bytecode.
  - Extend `aaveV3.poolMethodsAbi` with the version-stable Pool config reads: `getConfiguration(asset)`, `getUserConfiguration(user)`, and `getReserveData(asset)` (`ReserveDataLegacy`). These cover a health-factor / liquidation solver's per-reserve risk config, a user's collateral/borrow flags, and the indices needed to scale balances — on every chain, with no periphery-version pinning.
  - Export `aaveV3.reserveConfigurationBits` and `aaveV3.userConfigurationBits` — the `ReserveConfigurationMap` / `UserConfigurationMap` bit layouts — so consumers decode the on-chain bitmaps without hardcoding offsets. Only the version-stable low bits (0–167) are exported; higher bits shift across deployed V3 versions and are intentionally omitted.

  Non-goal (unchanged): governance-mutable, HF-critical values (`ltv` / `liquidationThreshold` / `usageAsCollateralEnabled`) are **not** baked into the static `AaveV3Reserve` catalog — the catalog ships the address to read from, not the values. The `UiPoolDataProvider` address is shipped without its return-struct ABI on purpose: that tuple is periphery-version-specific and already differs across covered chains (Ethereum/Base/BNB/Base Sepolia return the v3.3 layout, Sepolia an earlier one), so pair the address with a version-aware ABI at the call site.

## 0.7.1

### Patch Changes

- 0124250: Guard `buildTokensFromData` against a duplicate `chainId` in `PER_CHAIN`.

  If the same chain were listed twice (a copy-paste in the array, or two chain modules reporting the same `chainId`), the flatten would silently overwrite the first chain's entries and produce a wrong `Tokens.SYMBOL[chainId]` map with no error at module load. It now throws fast pointing at the duplicate.

## 0.7.0

### Minor Changes

- 88236bb: Add AAVE V3 reserve catalog (`aaveV3.reserves`).

  Per-chain list of every AAVE V3 reserve as `{ symbol, underlying, aToken, variableDebtToken, decimals }`, generated from chain via `Pool.getReservesList` + `Pool.getReserveData` (`yarn generate:aave-reserves`). Covers Ethereum, Base, BNB, Sepolia, and Base Sepolia. Lets consumers build AAVE supply-token pickers (underlying → aToken receipt) without an on-chain round-trip. Adds the `AaveV3Reserve` / `AaveV3ReservesByChain` types.

## 0.6.0

### Minor Changes

- f81f84b: Per-chain token subpath exports + new ERC-20 / Chainlink ABI fragments and event topics.

  **Subpath exports.** Each chain's token catalog is now importable on its own — consumers that only need one chain's tokens get just that file in their bundle instead of all five chains' worth via the root `Tokens` namespace:

  ```ts
  import { tokens, chainId } from "@avaprotocol/protocols/tokens/sepolia";
  const usdc = tokens.USDC?.address;
  ```

  Available subpaths: `./tokens/ethereum`, `./tokens/sepolia`, `./tokens/base`, `./tokens/base-sepolia`, `./tokens/bnb-mainnet`. Each module exports `chainId` and a frozen, symbol-keyed `tokens` map of the existing `TokenChainEntry` shape.

  The root `import { Tokens } from "@avaprotocol/protocols"` keeps working unchanged — the per-chain modules are additive.

  **`sideEffects: false`** declared in `package.json` so bundlers can tree-shake unused protocol modules.

  **ERC-20 additions** (`Protocols.erc20`):

  - `transferAbi` — single-fragment ABI for `transfer(address,uint256)`
  - `symbolAbi` — single-fragment ABI for `symbol()`
  - `decimalsAbi` — single-fragment ABI for `decimals()`
  - `transferEventAbi` — single-fragment event ABI for `Transfer(address indexed, address indexed, uint256)`
  - `eventTopics.Transfer` — pre-computed keccak256 of the canonical Transfer event signature

  **Chainlink additions** (`Protocols.chainlink`):

  - `answerUpdatedEventAbi` — single-fragment event ABI for `AnswerUpdated(int256 indexed, uint256 indexed, uint256)`
  - `eventTopics.AnswerUpdated` — pre-computed keccak256 of the canonical AnswerUpdated event signature

  These let downstream consumers (templates, SDK tests, summarizers) drop hand-rolled ABI fragments and topic hashes that were re-derived across repos.

## 0.5.0

### Minor Changes

- eaa22cb: Backfill the mainnet token catalog from `EigenLayer-AVS/token_whitelist/ethereum.json`. Adds 74 mainnet tokens (`AAVE` is already in via Studio; the new ones are tokens the AVS aggregator's existing whitelist tracked but Studio's catalog never carried — `APE`, `ATH`, `AXS`, `BGB`, `BNB`, `BUIDL`, `Bonk`, `BTT`, `cbBTC`, `Cake`, `CRO`, `DEXE`, `eETH`, `ETHFI`, `FDUSD`, `FLOKI`, and 58 more).

  Catalog now totals 139 entries across 5 chains: ethereum (30 → **104**), sepolia (6), base (23), base-sepolia (4), bnb-mainnet (2).

  `src/tokens/data/` is now the _union_ of Studio's app/lib/erc20 catalog and AVS's token_whitelist — captured by two complementary port scripts:

  - `yarn port:studio` — pulls Studio's rich metadata (description, website, explorer, links) and **wins on existing entries** so per-token descriptions stay up to date.
  - `yarn port:avs` — pulls AVS's broader coverage and **preserves existing entries** so Studio's richer rows aren't overwritten by AVS's barebones rows.

  Both scripts are idempotent over an already-ported tree.

## 0.4.1

### Patch Changes

- 9460f61: `lookupToken` now walks per-protocol `tokens` tables (`Protocols.aaveV3.tokens.LINK`, `Protocols.uniswapV3.tokens.WETH`, etc.) as a third resolution pass after the top-level `Tokens` catalog scan. Covers token addresses that ship alongside a specific protocol but don't appear in the top-level catalog — most notably the AAVE-V3 Sepolia faucet LINK (`0xf8Fb37…0EBE5`), which is the address AAVE templates actually use on Sepolia even though the canonical Chainlink LINK (`0x779877…4789`) lives elsewhere.

  When the symbol resolved from a per-protocol map also appears in `Tokens` on some chain, decimals/name are lifted from there; otherwise decimals default to 18 (true for every per-protocol token currently shipped).

  Fixes a regression introduced by 0.4.0's Studio seed where `Tokens.LINK[Sepolia]` switched to the canonical Chainlink address, leaving consumers unable to recover the symbol for the AAVE template's faucet address.

## 0.4.0

### Minor Changes

- 2ea828e: Restructure the token catalog from inline TypeScript objects into per-chain JSON
  data files (`src/tokens/data/<chain>.json`) and port Studio's curated catalogs
  into the new format. Catalog grew from 15 → 65 entries across 5 chains:
  ethereum (5 → 30), sepolia (3 → 6), base (3 → 23), base-sepolia (2 → 4), and
  bnb-mainnet (unchanged at 2).

  Notable behaviour change worth flagging for consumers: `Tokens.LINK[Sepolia]`
  now resolves to the canonical Sepolia ChainLink Token (`0x779877…4789`) instead
  of the AAVE-V3 faucet variant. The AAVE-V3 faucet LINK still lives at
  `Protocols.aaveV3.tokens.LINK[Chains.Sepolia]` for template consumers — that
  path is unchanged.

  New: `yarn port:studio` helper for future re-syncs from upstream Studio.

  `buildTokensFromData` now throws on duplicate `(symbol, chainId)` rows instead
  of silently overwriting.

  `TokenLinks` extended with the link types Studio's catalog uses (`x`,
  `facebook`, `discord`, `telegram`, `medium`, `docs`, `forum`, `youtube`) and
  drops the now-obsolete `twitter` alias (Studio standardized on `x`).

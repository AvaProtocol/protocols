# @avaprotocol/protocols

## 1.2.0

### Minor Changes

- 0562978: Add the BNB Chain baseline to the token catalog: WBNB, Binance-Peg BTCB and ETH, FDUSD, USD1, USDe, sUSDe, Cake, wstETH, slisBNB, LBTC, SolvBTC, XVS, LINK, and BNBx (legacy: Stader discontinued it). Each address was checked against the issuer's or BNB Chain's published list and on-chain.

  `lookupToken(56, WBNB)` now returns `WBNB`. Before, it fell through to `Protocols.uniswapV3.tokens.WETH`, whose BNB Chain entry holds WBNB, and answered with symbol `"WETH"`. BNB Chain's `ETH` symbol is the Binance-Peg ERC-20, not native ETH.

- 0562978: Fill the Ethereum and Base token-catalog gaps found by the coverage audit (#38).

  - Ethereum: RLUSD, USDG, GHO, cbETH, sDAI, crvUSD, LUSD, USDtb, eUSDe, SKY, BAL, 1INCH, FXS, KNC, STG, ETHx, ezETH, tETH, frxETH, sfrxETH, FBTC, eBTC, BTC.b, mUSD and syrupUSDT.
  - Base: RLUSD (`0x8d58C0C60B8D6b88Fa98B291a646dB34d0F98258`, Ripple's L2 address), WBTC, GHO, LBTC, tBTC, weETH, ezETH, wrsETH, syrupUSDC, USDS, sUSDS, USDe and sUSDe.

  Every Aave V3 Core reserve on Ethereum, Base and BNB Chain (except expiring Pendle PTs) is now in `Tokens`, so `lookupToken` recognizes them without the per-protocol fallback.

- b377e71: Add Circle EURC to the Ethereum, Base, Sepolia and Base Sepolia token catalogs. Addresses follow https://developers.circle.com/stablecoins/eurc-contract-addresses.
- 0562978: Rename Ethereum `Tokens["SolvBTC.BBN"]` to `Tokens.xSolvBTC` (`0xd9D920AA40f578ab794426F5C90F6C731D159DEf`). Solv rebranded the token: the contract's `name()` and `symbol()` both return `xSolvBTC`. The address and decimals are unchanged; `lookupToken` and the Ethereum sidecar (`dist/tokens/ethereum.json`) now return `xSolvBTC` for it.

  Code that reads `Tokens["SolvBTC.BBN"]` must switch to `Tokens.xSolvBTC`.

- 0562978: Record transfer constraints on token rows and pin catalog addresses to their sources.

  - `TokenChainEntry.transferConstraints` lists behaviour that makes a plain `transfer` to an arbitrary address revert or deliver a different amount. Values come from the new `TOKEN_TRANSFER_CONSTRAINT`: `permissionedRecipient` (OUSG, BUIDL, USYC), `rebasing` (stETH, eETH) and `feeOnTransfer` (none listed). No constraints means none is known, not that every transfer succeeds.
  - Provenance for each row (canonical sources, native/bridged/test, verification date) lives in `src/tokens/provenance/*.json`. Tests read it; the package does not ship it.
  - `tests/token-coverage.test.ts` enforces a defined coverage target per chain, address agreement between provenance, `Tokens` and protocol modules, and one symbol per address across chains.
  - `docs/TOKEN_CATALOG.md` documents the inclusion and maintenance policy and how consumers should separate recognizing a holding from deciding whether it can be transferred. `docs/TOKEN_COVERAGE.md` is the generated per-chain matrix (`yarn report:tokens`).

### Patch Changes

- 0562978: Correct Base Sepolia `USDT` (`0xCE8565457Cca0fC7542608A2c78610Ed7bC66C8C`) to 18 decimals. The row said 6, but the contract's `decimals()` returns 18, so amounts formatted from the catalog were off by 10^12. The contract is an unverified third-party test token, not a Tether deployment. Add `yarn verify:tokens`, a read-only check of every catalog row's code, `decimals()` and `symbol()` against the chain.

## 1.1.0

### Minor Changes

- 1a6a8da: Add `uniswapV3Pool({ chainId, tokenA, tokenB, fee })`, which derives the canonical Uniswap v3 pool address and token order from the catalog factory. `UNISWAP_V3_FEE_TIERS` is the list of fee tiers to try (100, 500, 3000, 10000). The address is a CREATE2 prediction: callers still check `getPool` and `liquidity()` before offering a pool.

## 1.0.0

### Major Changes

- c74d262: Remove `Chains.Holesky` (17000). EigenLayer has sunset Holesky and Ava Protocol's testnet AVS moved to Sepolia, so the constant no longer names a chain anything in this catalog targets.

  Nothing in the catalog covered it: no protocol module and no token declared a 17000 entry, so `dist/tokens/holesky.json` was never actually emitted despite the sidecar's filename map and README listing it. The removal drops the constant, its sidecar filename entry, and both doc references.

  **Breaking:** `Chains.Holesky` no longer exists. Callers referencing it fail to compile. There is no replacement — use `Chains.Sepolia` (11155111) for testnet work.

### Minor Changes

- 3df9da0: Add Polygon PoS (137) and Hyperliquid EVM (999) to `Chains`, and map `wrapped.weth` to the canonical native wrappers: WPOL `0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270` (legacy WMATIC) and WHYPE `0x5555555555555555555555555555555555555555`. No Uniswap/AAVE on HyperEVM in this change; Polygon protocol maps are a follow-up.

## 0.12.0

### Minor Changes

- ce25af5: Add Robinhood Chain (4663) Uniswap V3 (SwapRouter02 / QuoterV2 / Factory / NFT Position Manager / Permit2 / Universal Router) plus `wrapped.weth`. Addresses from the official Uniswap Robinhood deployment page and Robinhood token-contracts docs. No AAVE; no Circle USDC (the chain's day-one stable is USDG).

## 0.11.0

### Minor Changes

- 70c52bf: Add Unichain (130) Uniswap V3 (SwapRouter02 / QuoterV2 / Factory / NFT Position Manager / Permit2 / Universal Router) plus `wrapped.weth` and native Circle USDC. Addresses from the official Uniswap Unichain deployment page and Circle USDC docs.

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

---
"@avaprotocol/protocols": minor
---

Ship AAVE V3 reserve-config read surface (issue #19, the scale optimization).

- Add `aaveV3.poolAddressesProvider` and `aaveV3.uiPoolDataProvider` per-chain address maps (Mainnet, Sepolia, Base, Base Sepolia, BNB). Each `PoolAddressesProvider` was verified on-chain — `getPool()` returns the catalog's existing `pool` address — and each `UiPoolDataProvider` verified as deployed bytecode.
- Extend `aaveV3.poolMethodsAbi` with the version-stable Pool config reads: `getConfiguration(asset)`, `getUserConfiguration(user)`, and `getReserveData(asset)` (`ReserveDataLegacy`). These cover a health-factor / liquidation solver's per-reserve risk config, a user's collateral/borrow flags, and the indices needed to scale balances — on every chain, with no periphery-version pinning.
- Export `aaveV3.reserveConfigurationBits` and `aaveV3.userConfigurationBits` — the `ReserveConfigurationMap` / `UserConfigurationMap` bit layouts — so consumers decode the on-chain bitmaps without hardcoding offsets. Only the version-stable low bits (0–167) are exported; higher bits shift across deployed V3 versions and are intentionally omitted.

Non-goal (unchanged): governance-mutable, HF-critical values (`ltv` / `liquidationThreshold` / `usageAsCollateralEnabled`) are **not** baked into the static `AaveV3Reserve` catalog — the catalog ships the address to read from, not the values. The `UiPoolDataProvider` address is shipped without its return-struct ABI on purpose: that tuple is periphery-version-specific and already differs across covered chains (Ethereum/Base/BNB/Base Sepolia return the v3.3 layout, Sepolia an earlier one), so pair the address with a version-aware ABI at the call site.

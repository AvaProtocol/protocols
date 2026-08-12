---
"@avaprotocol/protocols": minor
---

Ship AAVE V3 Pool coverage for writes (issue #23).

- Add Arbitrum One (42161) and Optimism (10) to `Chains` and to the AAVE V3 `pool` / `oracle` / `poolAddressesProvider` / `uiPoolDataProvider` / `wethGateway` maps. Addresses from `@aave-dao/aave-address-book` (`AaveV3Arbitrum`, `AaveV3Optimism`).
- Add `aaveV3.markets` — every Pool on a chain, not just the canonical one. Ethereum lists Core / EtherFi / Lido / Horizon; every other covered chain is a single `core` row. Each row carries `pool` plus `poolAddressesProvider` (the on-chain `getPool()` escape hatch). `aaveV3.pool[chainId]` stays Core so existing consumers do not break.
- Document that the static Pool map is a deliberate cache, not an assumption of immutability.
- Regenerate `aaveV3.reserves` so Arbitrum and Optimism ship a Core reserve list (underlyings / aTokens / decimals). Without this a consumer can resolve a Pool and still get an empty supply-token picker.

Non-goal (unchanged): `aaveV3.reserves` stays Core-only. Non-Core Ethereum markets (EtherFi / Lido / Horizon) list different reserves; scoping those is a separate issue.

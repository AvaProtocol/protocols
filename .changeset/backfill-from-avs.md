---
"@avaprotocol/protocols": minor
---

Backfill the mainnet token catalog from `EigenLayer-AVS/token_whitelist/ethereum.json`. Adds 74 mainnet tokens (`AAVE` is already in via Studio; the new ones are tokens the AVS aggregator's existing whitelist tracked but Studio's catalog never carried — `APE`, `ATH`, `AXS`, `BGB`, `BNB`, `BUIDL`, `Bonk`, `BTT`, `cbBTC`, `Cake`, `CRO`, `DEXE`, `eETH`, `ETHFI`, `FDUSD`, `FLOKI`, and 58 more).

Catalog now totals 139 entries across 5 chains: ethereum (30 → **104**), sepolia (6), base (23), base-sepolia (4), bnb-mainnet (2).

`src/tokens/data/` is now the *union* of Studio's app/lib/erc20 catalog and AVS's token_whitelist — captured by two complementary port scripts:

- `yarn port:studio` — pulls Studio's rich metadata (description, website, explorer, links) and **wins on existing entries** so per-token descriptions stay up to date.
- `yarn port:avs` — pulls AVS's broader coverage and **preserves existing entries** so Studio's richer rows aren't overwritten by AVS's barebones rows.

Both scripts are idempotent over an already-ported tree.

---
"@avaprotocol/protocols": minor
---

Restructure the token catalog from inline TypeScript objects into per-chain JSON
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

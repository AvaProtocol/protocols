---
"@avaprotocol/protocols": major
---

Remove `Chains.Holesky` (17000). EigenLayer has sunset Holesky and Ava Protocol's testnet AVS moved to Sepolia, so the constant no longer names a chain anything in this catalog targets.

Nothing in the catalog covered it: no protocol module and no token declared a 17000 entry, so `dist/tokens/holesky.json` was never actually emitted despite the sidecar's filename map and README listing it. The removal drops the constant, its sidecar filename entry, and both doc references.

**Breaking:** `Chains.Holesky` no longer exists. Callers referencing it fail to compile. There is no replacement — use `Chains.Sepolia` (11155111) for testnet work.

---
"@avaprotocol/protocols": minor
---

Record transfer constraints on token rows and pin catalog addresses to their sources.

- `TokenChainEntry.transferConstraints` lists behaviour that makes a plain `transfer` to an arbitrary address revert or deliver a different amount. Values come from the new `TOKEN_TRANSFER_CONSTRAINT`: `permissionedRecipient` (OUSG, BUIDL, USYC), `rebasing` (stETH, eETH) and `feeOnTransfer` (none listed). No constraints means none is known, not that every transfer succeeds.
- Provenance for each row (canonical sources, native/bridged/test, verification date) lives in `src/tokens/provenance/*.json`. Tests read it; the package does not ship it.
- `tests/token-coverage.test.ts` enforces a defined coverage target per chain, address agreement between provenance, `Tokens` and protocol modules, and one symbol per address across chains.
- `docs/TOKEN_CATALOG.md` documents the inclusion and maintenance policy and how consumers should separate recognizing a holding from deciding whether it can be transferred. `docs/TOKEN_COVERAGE.md` is the generated per-chain matrix (`yarn report:tokens`).

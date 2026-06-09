---
"@avaprotocol/protocols": patch
---

Guard `buildTokensFromData` against a duplicate `chainId` in `PER_CHAIN`.

If the same chain were listed twice (a copy-paste in the array, or two chain modules reporting the same `chainId`), the flatten would silently overwrite the first chain's entries and produce a wrong `Tokens.SYMBOL[chainId]` map with no error at module load. It now throws fast pointing at the duplicate.

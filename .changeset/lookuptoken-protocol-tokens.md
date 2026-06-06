---
"@avaprotocol/protocols": patch
---

`lookupToken` now walks per-protocol `tokens` tables (`Protocols.aaveV3.tokens.LINK`, `Protocols.uniswapV3.tokens.WETH`, etc.) as a third resolution pass after the top-level `Tokens` catalog scan. Covers token addresses that ship alongside a specific protocol but don't appear in the top-level catalog — most notably the AAVE-V3 Sepolia faucet LINK (`0xf8Fb37…0EBE5`), which is the address AAVE templates actually use on Sepolia even though the canonical Chainlink LINK (`0x779877…4789`) lives elsewhere.

When the symbol resolved from a per-protocol map also appears in `Tokens` on some chain, decimals/name are lifted from there; otherwise decimals default to 18 (true for every per-protocol token currently shipped).

Fixes a regression introduced by 0.4.0's Studio seed where `Tokens.LINK[Sepolia]` switched to the canonical Chainlink address, leaving consumers unable to recover the symbol for the AAVE template's faucet address.

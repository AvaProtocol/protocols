---
"@avaprotocol/protocols": minor
---

Rename Ethereum `Tokens["SolvBTC.BBN"]` to `Tokens.xSolvBTC` (`0xd9D920AA40f578ab794426F5C90F6C731D159DEf`). Solv rebranded the token: the contract's `name()` and `symbol()` both return `xSolvBTC`. The address and decimals are unchanged; `lookupToken` and the Ethereum sidecar (`dist/tokens/ethereum.json`) now return `xSolvBTC` for it.

Code that reads `Tokens["SolvBTC.BBN"]` must switch to `Tokens.xSolvBTC`.

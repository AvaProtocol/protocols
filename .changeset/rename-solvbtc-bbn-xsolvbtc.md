---
"@avaprotocol/protocols": major
---

Rename Ethereum `Tokens["SolvBTC.BBN"]` to `Tokens.xSolvBTC` (`0xd9D920AA40f578ab794426F5C90F6C731D159DEf`). Solv rebranded the token: the contract's `name()` and `symbol()` both return `xSolvBTC`. The address and decimals are unchanged, and `lookupToken` now returns symbol and name `xSolvBTC` for it.

BREAKING CHANGE: `Tokens["SolvBTC.BBN"]` no longer exists, and the Ethereum sidecar (`dist/tokens/ethereum.json`) carries `xSolvBTC` for this address. Callers keying on the old symbol must switch to `xSolvBTC`.

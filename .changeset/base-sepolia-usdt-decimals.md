---
"@avaprotocol/protocols": patch
---

Correct Base Sepolia `USDT` (`0xCE8565457Cca0fC7542608A2c78610Ed7bC66C8C`) to 18 decimals. The row said 6, but the contract's `decimals()` returns 18, so amounts formatted from the catalog were off by 10^12. The contract is an unverified third-party test token, not a Tether deployment. Add `yarn verify:tokens`, a read-only check of every catalog row's code, `decimals()` and `symbol()` against the chain.

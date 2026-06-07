---
"@avaprotocol/protocols": minor
---

Add AAVE V3 reserve catalog (`aaveV3.reserves`).

Per-chain list of every AAVE V3 reserve as `{ symbol, underlying, aToken, variableDebtToken, decimals }`, generated from chain via `Pool.getReservesList` + `Pool.getReserveData` (`yarn generate:aave-reserves`). Covers Ethereum, Base, BNB, Sepolia, and Base Sepolia. Lets consumers build AAVE supply-token pickers (underlying → aToken receipt) without an on-chain round-trip. Adds the `AaveV3Reserve` / `AaveV3ReservesByChain` types.

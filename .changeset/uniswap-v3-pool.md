---
"@avaprotocol/protocols": minor
---

Add `uniswapV3Pool({ chainId, tokenA, tokenB, fee })`, which derives the canonical Uniswap v3 pool address and token order from the catalog factory. `UNISWAP_V3_FEE_TIERS` is the list of fee tiers to try (100, 500, 3000, 10000). The address is a CREATE2 prediction: callers still check `getPool` and `liquidity()` before offering a pool.

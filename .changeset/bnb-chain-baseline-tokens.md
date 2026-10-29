---
"@avaprotocol/protocols": minor
---

Add the BNB Chain baseline to the token catalog: WBNB, Binance-Peg BTCB and ETH, FDUSD, USD1, USDe, sUSDe, Cake, wstETH, slisBNB, LBTC, SolvBTC, XVS, LINK, and BNBx (legacy: Stader discontinued it). Each address was checked against the issuer's or BNB Chain's published list and on-chain.

`lookupToken(56, WBNB)` now returns `WBNB`. Before, it fell through to `Protocols.uniswapV3.tokens.WETH`, whose BNB Chain entry holds WBNB, and answered with symbol `"WETH"`. BNB Chain's `ETH` symbol is the Binance-Peg ERC-20, not native ETH.

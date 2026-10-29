---
"@avaprotocol/protocols": minor
---

Fill the Ethereum and Base token-catalog gaps found by the coverage audit (#38).

- Ethereum: RLUSD, USDG, GHO, cbETH, sDAI, crvUSD, LUSD, USDtb, eUSDe, SKY, BAL, 1INCH, FXS, KNC, STG, ETHx, ezETH, tETH, frxETH, sfrxETH, FBTC, eBTC, BTC.b, mUSD and syrupUSDT.
- Base: RLUSD (`0x8d58C0C60B8D6b88Fa98B291a646dB34d0F98258`, Ripple's L2 address), WBTC, GHO, LBTC, tBTC, weETH, ezETH, wrsETH, syrupUSDC, USDS, sUSDS, USDe and sUSDe.

Every Aave V3 Core reserve on Ethereum, Base and BNB Chain (except expiring Pendle PTs) is now in `Tokens`, so `lookupToken` recognizes them without the per-protocol fallback.

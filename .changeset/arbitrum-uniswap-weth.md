---
"@avaprotocol/protocols": minor
---

Add Uniswap V3 (SwapRouter02 / QuoterV2 / Factory / NFT Position Manager / Permit2 / Universal Router) plus `wrapped.weth` and native Circle USDC on Arbitrum One (42161) and Optimism (10). Addresses from the official Uniswap deployment pages. This unblocks `SessionPolicyActions.uniswapV3Swap(chainId)` in the SDK — that helper reads `swapRouter02[chainId]` and refuses unknown chains.

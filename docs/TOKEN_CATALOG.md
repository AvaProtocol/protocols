# Token catalog

`Tokens` (and the per-chain `@avaprotocol/protocols/tokens/<chain>` modules) answers one question: **is this contract the asset it claims to be, on this chain?** A listed row is a verified identity — address, decimals, symbol, and who issues it. It is not an investment endorsement, and it is not a promise that every transfer of the token succeeds.

The per-chain coverage matrix is generated: [TOKEN_COVERAGE.md](./TOKEN_COVERAGE.md).

## Coverage target

"All common tokens" cannot be tested, so the catalog promises an explicit list instead. It lives in `scripts/token-catalog/coverage.ts`, and `tests/token-coverage.test.ts` fails when a target asset is neither listed nor recorded as a known gap.

For each supported mainnet (Ethereum, Base, BNB Chain):

1. **Native wrapper** — the canonical wrapper of the native coin, the address `Protocols.wrapped.weth[chainId]` names (WETH, WBNB).
2. **Fiat stablecoins** — USDC, EURC, USDT, DAI, USDS, USDe, PYUSD, RLUSD, USDG, FDUSD and USD1, on each chain where the issuer itself publishes an address. Where the widely used variant is bridged (Binance-Peg USDC/USDT on BNB Chain, bridged USDT on Base), the bridged variant is listed and labelled as such.
3. **BTC representations** — WBTC, cbBTC, tBTC, LBTC (BTCB on BNB Chain), where the issuer publishes an address and the deployment has supply.
4. **Liquid staking** — stETH/wstETH, rETH, cbETH, weETH (slisBNB on BNB Chain), where the issuer publishes an address.
5. **Established DeFi assets** — every Aave V3 Core reserve on the chain, matched by address, except expiring Pendle principal tokens; plus the chain's main DEX governance token (UNI, AERO, Cake). Aave governance lists only liquid, vetted assets, and `Protocols.aaveV3.reserves` is regenerated from chain, so a new Aave listing surfaces as a coverage failure.

For testnets (Sepolia, Base Sepolia):

6. **Verified test deployments only** — WETH, Circle's test USDC and EURC, and Chainlink's LINK. A mainnet asset does not imply a test token. Protocol faucet tokens (Aave's test USDC/DAI/WBTC…) collide with issuer test tokens by symbol and stay in their protocol module.

Out of scope on purpose: native coins (ETH, BNB) — they are not ERC-20 contracts and consumers handle them separately; expiring tokens (Pendle PTs); assets whose issuer stopped issuing and that see no use (BUSD). Chains in `Chains` without a token file (Optimism, Arbitrum, Unichain, Polygon, Hyperliquid, Robinhood) carry protocol addresses only; adding one means a new data file, a provenance file, and a coverage target.

Assets outside the target may still be listed — the catalog also carries rows ported from Studio's earlier lists — but only the target is promised.

## Adding or changing a row

1. **Find a canonical source.** The issuer's or protocol's own address page, official docs, or official repository, listing this exact address on this chain. Explorer labels, CoinGecko and aggregator lists (PancakeSwap, Uniswap, Superchain) are secondary evidence: record them, but do not rely on them alone. Symbol and name are not evidence. A match found through `lookupToken`'s cross-chain fallback is not evidence either: the same 20 bytes can be a different contract, or nothing, on another chain.
2. **Check the chain.** Put the candidate in a JSON array of `{ chainId, symbol, address, decimals }` and run `yarn verify:tokens --rows candidates.json`. It reads code, `decimals()` and `symbol()`; a decimals mismatch fails. A malformed row, or one on a chain without a catalog file, fails the run before anything is read.
3. **Classify the deployment.** Native (minted on this chain by the issuer), bridged (name the bridge or operator — "Binance-Peg", "Base standard bridge", "LayerZero OFT"), or test (name who deployed it). Mark superseded deployments `legacy`.
4. **Check transfers.** Read the issuer's docs for allowlists, rebasing and transfer fees. Where useful, simulate a full-balance `transfer` from a current holder to a fresh address with `eth_call` and a state override — read-only, no signatures — and compare what was sent with what arrived. Record any constraint in `transferConstraints` (below).
5. **Edit three files.** The row in `src/tokens/data/<chain>.json`, its provenance in `src/tokens/provenance/<chain>.json` (sources, references, `verifiedAt`, notes), and the regenerated matrix (`yarn report:tokens`). Add a changeset.

Symbols follow the issuer's on-chain casing (`stETH`, `Cake`, `cbBTC`). A symbol appears once per chain. An address names one asset on every chain where it appears, because `lookupToken` falls back across chains; the test enforces this.

Symbol keys are API: consumers index `Tokens` by them, and the sidecar carries them. When an issuer rebrands on-chain, follow it (Ethereum `SolvBTC.BBN` became `xSolvBTC`), ship the rename as a major changeset, and record the old symbol in the provenance notes.

## Maintenance

- **Before a release**, run `yarn verify:tokens`. It needs network access, so it is not part of `yarn test`. A scheduled CI job running it weekly would catch address drift between releases; it is proposed, not yet added.
- **After regenerating Aave reserves** (`yarn generate:aave-reserves`), the coverage test lists any new Core reserve. Add it, or record a known gap with a reason.
- **`KNOWN_GAPS`** in `scripts/token-catalog/coverage.ts` is the explicit list of target assets not yet listed. The test fails when a gap is filled but still listed.
- **`PROVENANCE_PENDING`** lists rows that predate provenance tracking. It may only shrink: a new row needs a provenance row, and a pending row that gains provenance must leave the list.
- **Removing a row** breaks consumers that key on it. Prefer marking it `legacy` in provenance; remove only addresses that are wrong.

## Transfer constraints

`TokenChainEntry.transferConstraints` (values in `TOKEN_TRANSFER_CONSTRAINT`) records behaviour that makes a plain `transfer(to, amount)` to an arbitrary address revert or deliver a different amount:

| Constraint | Meaning | Listed today |
|---|---|---|
| `permissionedRecipient` | The recipient must be on the issuer's allowlist (KYC, qualified access). A transfer to a fresh address reverts — including the holder's own new wallet. | OUSG, BUIDL, USYC (Ethereum) |
| `rebasing` | Share-based balances. A full-balance transfer can leave 1–2 wei behind, and the amount received can differ from the amount requested by rounding. | stETH, eETH (Ethereum) |
| `feeOnTransfer` | The recipient receives less than the amount sent. | none (FLOKI taxes only trades through registered exchange pools; wallet-to-wallet transfers are free) |

What is deliberately not recorded: issuer freezes, pauses and sanctions blocklists. Almost every fiat-backed token has them, so flagging them would flag everything and tell a consumer nothing.

No constraints means none is known — not that every transfer succeeds.

## Guidance for consumers

**Recognition is not transfer eligibility.** Use the catalog to recognize holdings: name, decimals, logo, value. Decide whether a transfer works when you prepare it, by simulating the actual transfers.

- **Show recognized holdings, including constrained ones.** A wallet holding OUSG holds OUSG. Do not hide it because it has extra transfer rules.
- **Flag, then validate.** For a batch (Studio's Sweep), surface `transferConstraints` on the selection step, and let preparation simulate each transfer to the chosen recipient. A `permissionedRecipient` token to an address the issuer has not onboarded will revert; exclude it from the atomic batch with an explanation rather than failing the whole batch.
- **Rebasing tokens:** read the balance at preparation time, and expect 1–2 wei to remain after a "full" transfer. Do not treat that dust as a failure.
- **A symbol is not an identity.** BNB Chain's `ETH` is the Binance-Peg ERC-20, not native ETH. Sepolia's `USDT` is Aave's faucet token, not Tether's. Never infer "native coin" from a symbol; key everything on `(chainId, address)`.
- **Pass the chain.** `lookupToken(chainId, address)` checks that chain first. Its cross-chain fallback exists for dev gateways whose runtime chain differs from the workflow's; do not treat a fallback match as proof of what the contract is on your chain.
- **Unlisted is not unsafe.** The catalog promises its coverage target, nothing more. Show unknown ERC-20s as unrecognized rather than dropping them.

## Audit record — 2026-10-28 (issue #38)

Starting point: PR #37's head, 143 rows (Ethereum 105, Base 24, BNB Chain 2, Sepolia 7, Base Sepolia 5).

**Method.** Every row was read on-chain (`yarn verify:tokens`). Each proposed addition was checked against the issuer's or protocol's published address page and on-chain before it was added. Transfer behaviour was checked two ways: issuer documentation and verified contract source, and a read-only `eth_call` that installs a probe at a current holder's address (state override) and simulates a full-balance `transfer` to a fresh address. Every mainnet row was simulated except seven for which public endpoints showed no externally owned holder: Base BAL and WBTC; BNB Chain wstETH, sUSDe, XVS, LBTC and LINK. No transaction was sent and nothing was signed.

**Findings, fixed here**

- Base Sepolia `USDT` said 6 decimals; the contract returns 18. It is an unverified third-party test token (40 holders), not Tether's. EigenLayer-AVS embeds the same wrong value in `core/taskengine/tokenwhitelist/base-sepolia.json`; its drift check against the sidecar should flag it once this ships.
- `lookupToken(56, WBNB)` returned symbol `"WETH"` through `Protocols.uniswapV3.tokens.WETH`, whose BNB Chain entry holds WBNB. WBNB is now catalogued.
- BNB Chain listed two tokens; it now covers its baseline (17 rows).
- 25 Ethereum and 13 Base rows added, including RLUSD on both chains. Every Aave V3 Core reserve on the three mainnets is now in `Tokens` by address.
- Ethereum `SolvBTC.BBN` is now `xSolvBTC`. Solv rebranded the token: the contract's `name()` and `symbol()` both return `xSolvBTC`, and Solv's repository names this address xSolvBTC. The old key no longer exists.

**Findings, recorded**

- Sepolia `USDT` is Aave V3's faucet token, not Tether's (Tether publishes no Sepolia USDT). Sepolia `UNI` was deployed by mainnet UNI's deployer. Sepolia `DAI` and Base Sepolia `USDT` have no attributable issuer; they stay listed, marked pending.
- PAXG no longer charges a transfer fee: its current implementation (PaxosTokenV2, `0x7da4…a543`) has no fee logic and `feeRate()` reverts.
- USDtb's current implementation has a blocklist and pause only; the old whitelist transfer state is deprecated. USDY's allowlist contract returns true for every address. LsETH's allowlist gates deposits and redemptions, not transfers. Maple's syrupUSDC has no transfer permission set today. Issuers can change all of these by upgrade, which is why consumers must still simulate.
- Legacy or winding down, kept for existing holdings: MKR (superseded by SKY), Base USDbC (bridged USDC from before native USDC), BNBx (Stader discontinued BNB staking), and — on secondary evidence only — cmETH (minting reportedly disabled 2026-05-07), legacy FRAX, Ethereum's 2017 ERC-20 BNB, and Wrapped TON (its bridge reportedly closed 2026-09-01).
- Base `weETH`: the Superchain token list carries a different address (`0x4c94…5EFA`) that ether.fi does not list. The catalog follows ether.fi.

**Remaining gaps.** `KNOWN_GAPS` is empty: every target asset is listed. Outside the target, and not listed:

- WBTC on BNB Chain: BitGo lists `0x3966…a86f` with zero supply. The PancakeSwap list's `0x0555…2B9c` is not on BitGo's list.
- SolvBTC on Base (`0x3B86…931f`, from Solv's deploy script) and MORPHO on Ethereum: not yet verified.
- Aave's non-Core Ethereum markets (EtherFi, Lido, Horizon) list reserves the target does not cover.
- Chains without a token file: Optimism, Arbitrum, Unichain, Polygon, Hyperliquid, Robinhood.
- 80 pre-audit rows still lack a recorded canonical source (`PROVENANCE_PENDING`: Ethereum 67, Base 11, Sepolia 1, Base Sepolia 1). Among them, OUSG, BUIDL and USYC carry transfer constraints.

**Follow-ups proposed**

- A weekly CI job running `yarn verify:tokens`, opening an issue on drift.
- Work down `PROVENANCE_PENDING`, starting with the stablecoins and RWA tokens (USDY, USD0, TUSD, OUSG, BUIDL, USYC) and the Base standard-bridge tokens, whose bridge pointers are already confirmed on-chain.
- Studio: after the release, drop the EURC compatibility rows in `app/lib/erc20/catalog.ts` (studio#2028), and surface `transferConstraints` on the Sweep selection step.


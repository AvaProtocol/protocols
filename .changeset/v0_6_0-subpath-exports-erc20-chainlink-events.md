---
"@avaprotocol/protocols": minor
---

Per-chain token subpath exports + new ERC-20 / Chainlink ABI fragments and event topics.

**Subpath exports.** Each chain's token catalog is now importable on its own — consumers that only need one chain's tokens get just that file in their bundle instead of all five chains' worth via the root `Tokens` namespace:

```ts
import { tokens, chainId } from "@avaprotocol/protocols/tokens/sepolia";
const usdc = tokens.USDC?.address;
```

Available subpaths: `./tokens/ethereum`, `./tokens/sepolia`, `./tokens/base`, `./tokens/base-sepolia`, `./tokens/bnb-mainnet`. Each module exports `chainId` and a frozen, symbol-keyed `tokens` map of the existing `TokenChainEntry` shape.

The root `import { Tokens } from "@avaprotocol/protocols"` keeps working unchanged — the per-chain modules are additive.

**`sideEffects: false`** declared in `package.json` so bundlers can tree-shake unused protocol modules.

**ERC-20 additions** (`Protocols.erc20`):

- `transferAbi` — single-fragment ABI for `transfer(address,uint256)`
- `symbolAbi` — single-fragment ABI for `symbol()`
- `decimalsAbi` — single-fragment ABI for `decimals()`
- `transferEventAbi` — single-fragment event ABI for `Transfer(address indexed, address indexed, uint256)`
- `eventTopics.Transfer` — pre-computed keccak256 of the canonical Transfer event signature

**Chainlink additions** (`Protocols.chainlink`):

- `answerUpdatedEventAbi` — single-fragment event ABI for `AnswerUpdated(int256 indexed, uint256 indexed, uint256)`
- `eventTopics.AnswerUpdated` — pre-computed keccak256 of the canonical AnswerUpdated event signature

These let downstream consumers (templates, SDK tests, summarizers) drop hand-rolled ABI fragments and topic hashes that were re-derived across repos.

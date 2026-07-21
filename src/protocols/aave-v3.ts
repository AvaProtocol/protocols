// AAVE V3 — Pool / Oracle / WETH Gateway / PoolAddressesProvider /
// UiPoolDataProvider addresses per supported chain, the Pool ABI
// fragments (events + the read/write methods callers actually touch,
// including the per-reserve / per-user config reads), the
// ReserveConfigurationMap / UserConfigurationMap bit layouts, and
// event-topic hashes.
//
// Pool is the single entry point templates target (supply, borrow,
// repay, withdraw, getUserAccountData, setUserUseReserveAsCollateral)
// and the contract whose events templates filter on (`Supply`,
// `Borrow`, etc.).
//
// Address source: AAVE V3 deployment registries
// (https://github.com/bgd-labs/aave-address-book). When AAVE
// redeploys on a new chain, mirror the canonical address book.

import { Chains } from "../chains";
import { type AbiFragment, type AddressByChain } from "./types";
import { aaveV3Reserves } from "./aave-v3-reserves";

/**
 * AAVE V3 Pool addresses per chain. The Pool is the single entry point
 * for supply / borrow / repay / withdraw / liquidationCall and is the
 * contract whose events templates filter on (`Supply`, `Borrow`, etc.).
 */
const pool: AddressByChain = {
  [Chains.EthereumMainnet]: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
  [Chains.Sepolia]: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
  [Chains.BaseMainnet]: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
  [Chains.BaseSepolia]: "0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27",
  [Chains.BnbMainnet]: "0x6807dc923806fE8Fd134338EABCA509979a7e0cB",
};

/**
 * Aave Oracle — the price feed used by Pool to value collateral and
 * debt. Templates that derive health-factor-equivalent metrics off
 * chain can hit this directly to avoid a Pool round-trip.
 */
const oracle: AddressByChain = {
  [Chains.EthereumMainnet]: "0x54586bE62E3c3580375aE3723C145253060Ca0C2",
  [Chains.Sepolia]: "0x2da88497588bf89281816106C7259e31AF45a663",
  [Chains.BaseMainnet]: "0x2Cc0Fc26eD4563A5ce5e8bdcfe1A2878676Ae156",
  [Chains.BaseSepolia]: "0x943b0dE18d4abf4eF02A85912F8fc07684C141dF",
  [Chains.BnbMainnet]: "0x39bc1bfDa2130d6Bb6DBEfd366939b4c7aa7C697",
};

/**
 * WETH gateway — wraps native ETH supplies so Pool can hold WETH as
 * the reserve. Templates that supply native ETH (rather than an
 * already-wrapped token) go through here instead of Pool directly.
 *
 * Only present on chains whose native gas token is ETH. Absent on
 * BNB Chain (native is BNB; the equivalent there would be a "WBNB
 * gateway" but AAVE V3 doesn't deploy one).
 */
const wethGateway: AddressByChain = {
  [Chains.EthereumMainnet]: "0xd01607c3C5eCABa394D8be377a08590149325722",
  [Chains.Sepolia]: "0x387d311e47e80b498169e6fb51d3193167d89F7D",
  [Chains.BaseMainnet]: "0xa0d9C1E9E48Ca30c8d8C3B5D69FF5dc1f6DFfC24",
  [Chains.BaseSepolia]: "0x0568130e794429D2eEBC4dafE18f25Ff1a1ed8b6",
};

/**
 * PoolAddressesProvider — the per-market registry that resolves the
 * Pool, Oracle, ACL, etc. It's the handle you pass to the
 * `UiPoolDataProvider` reads below (`getReservesData(provider)` /
 * `getUserReservesData(provider, user)`) and the canonical "which
 * market" identifier. Verified on-chain: `getPool()` on each of these
 * returns exactly the `pool` address above.
 */
const poolAddressesProvider: AddressByChain = {
  [Chains.EthereumMainnet]: "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e",
  [Chains.Sepolia]: "0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A",
  [Chains.BaseMainnet]: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
  [Chains.BaseSepolia]: "0xE4C23309117Aa30342BFaae6c95c6478e0A4Ad00",
  [Chains.BnbMainnet]: "0xff75B6da14FfbbfD355Daf7a2731456b3562Ba6D",
};

/**
 * UiPoolDataProvider — the periphery aggregator the Aave UI uses to read
 * a whole market's per-reserve risk config + prices in one call
 * (`getReservesData(provider)`) and a user's per-reserve supply/debt in
 * another (`getUserReservesData(provider, user)`). This is the scale
 * optimization: one round-trip for the full market instead of N Pool
 * reads.
 *
 * We ship the ADDRESS but intentionally NOT a return-struct ABI. The
 * `AggregatedReserveData` / `UserReserveData` tuples this contract
 * returns are periphery-version-specific and already differ across the
 * chains we cover — e.g. Ethereum / Base / BNB / Base Sepolia currently
 * return the v3.3 layout while Sepolia returns an earlier one. AAVE
 * upgrades this periphery contract per chain independently of the Pool,
 * so a single baked tuple would silently fail to decode on some markets
 * and drift over time. Pair this address with a version-aware ABI at the
 * call site (e.g. `@bgd-labs/aave-address-book`). For a
 * version-independent read, use the `Pool` config reads below instead
 * (`getConfiguration` / `getUserConfiguration` / `getReserveData`), whose
 * ABIs are stable across deployments.
 */
const uiPoolDataProvider: AddressByChain = {
  [Chains.EthereumMainnet]: "0x2dAd8162A989cd99D673dE4425Bb2298Db1E1aA2",
  [Chains.Sepolia]: "0x69529987FA4A075D0C00B0128fa848dc9ebbE9CE",
  [Chains.BaseMainnet]: "0x0C6BC4a12039788be08F87e87Cff87FEDbd1D386",
  [Chains.BaseSepolia]: "0x3cB7B00B6C09B71998124196691e8bF2694De863",
  [Chains.BnbMainnet]: "0x68100bD5345eA474D93577127C11F39FF8463e93",
};

/**
 * Pre-computed keccak256 of the canonical event signatures. Cheaper
 * than recomputing per-call and stable across deployments. Match
 * topics[0] on `eventTrigger` queries against these.
 */
const eventTopics = Object.freeze({
  Supply: "0x2b627736bca15cd5381dcf80b0bf11fd197d01a037c52b927a881a10fb73ba61",
  Withdraw: "0x3115d1449a7b732c986cba18244e897a450f61e1bb8d589cd2e69e6c8924f9f7",
  Borrow: "0xb3d084820fb1a9decffb176436bd02558d15fac9b0ddfed8c465bc7359d7dce0",
  Repay: "0xa534c8dbe71f871f9f3530e97a74601fea17b426cae02e1c5aee42c96c784051",
  LiquidationCall: "0xe413a321e8681d831f4dbccbca790d2952b56f977908e45be37335533e005286",
} as const);

/**
 * Pool event ABI — Supply / Withdraw / Borrow / Repay / LiquidationCall.
 * Used by `eventTrigger` queries to decode topic data so downstream
 * nodes can reference `reserve`, `amount`, `onBehalfOf`, etc. by name.
 */
const poolEventsAbi: readonly AbiFragment[] = Object.freeze([
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "reserve", type: "address" },
      { indexed: false, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "address", name: "onBehalfOf", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: true, internalType: "uint16", name: "referralCode", type: "uint16" },
    ],
    name: "Supply",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "reserve", type: "address" },
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "Withdraw",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "reserve", type: "address" },
      { indexed: false, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "address", name: "onBehalfOf", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "uint8", name: "interestRateMode", type: "uint8" },
      { indexed: false, internalType: "uint256", name: "borrowRate", type: "uint256" },
      { indexed: true, internalType: "uint16", name: "referralCode", type: "uint16" },
    ],
    name: "Borrow",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "reserve", type: "address" },
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "address", name: "repayer", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "bool", name: "useATokens", type: "bool" },
    ],
    name: "Repay",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "collateralAsset", type: "address" },
      { indexed: true, internalType: "address", name: "debtAsset", type: "address" },
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "debtToCover", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "liquidatedCollateralAmount", type: "uint256" },
      { indexed: false, internalType: "address", name: "liquidator", type: "address" },
      { indexed: false, internalType: "bool", name: "receiveAToken", type: "bool" },
    ],
    name: "LiquidationCall",
    type: "event",
  },
]);

/**
 * Pool method ABI — the read + write surface templates routinely call:
 * `getUserAccountData` (account health), `supply`, `borrow`, `repay`,
 * `withdraw`, `setUserUseReserveAsCollateral`, and the per-reserve /
 * per-user config reads a liquidation/health-factor solver needs
 * (`getConfiguration`, `getUserConfiguration`, `getReserveData`). Raw ABI
 * so any `contractRead`/`contractWrite` consumer can plug it in directly.
 *
 * The three config reads are the version-independent path to per-reserve
 * risk config (LTV, liq. threshold, active/frozen/paused, …) and a user's
 * collateral/borrow flags: `getConfiguration` / `getUserConfiguration`
 * each return a single `uint256` bitmap, and `getReserveData` returns the
 * (ABI-stable) `ReserveDataLegacy` struct carrying the config bitmap plus
 * the liquidity / variable-borrow indices needed to scale a user's
 * balances. Decode the bitmaps with `reserveConfigurationBits` /
 * `userConfigurationBits` below. Prefer these over `uiPoolDataProvider`
 * when you need one asset's config on any chain without pinning a
 * periphery version.
 */
const poolMethodsAbi: readonly AbiFragment[] = Object.freeze([
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserAccountData",
    outputs: [
      { internalType: "uint256", name: "totalCollateralBase", type: "uint256" },
      { internalType: "uint256", name: "totalDebtBase", type: "uint256" },
      { internalType: "uint256", name: "availableBorrowsBase", type: "uint256" },
      { internalType: "uint256", name: "currentLiquidationThreshold", type: "uint256" },
      { internalType: "uint256", name: "ltv", type: "uint256" },
      { internalType: "uint256", name: "healthFactor", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "asset", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address", name: "onBehalfOf", type: "address" },
      { internalType: "uint16", name: "referralCode", type: "uint16" },
    ],
    name: "supply",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "asset", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "interestRateMode", type: "uint256" },
      { internalType: "uint16", name: "referralCode", type: "uint16" },
      { internalType: "address", name: "onBehalfOf", type: "address" },
    ],
    name: "borrow",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "asset", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "interestRateMode", type: "uint256" },
      { internalType: "address", name: "onBehalfOf", type: "address" },
    ],
    name: "repay",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "asset", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
    ],
    name: "withdraw",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "asset", type: "address" },
      { internalType: "bool", name: "useAsCollateral", type: "bool" },
    ],
    name: "setUserUseReserveAsCollateral",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    // Returns the reserve's ReserveConfigurationMap — a single uint256
    // bitmap. Decode with `reserveConfigurationBits`.
    inputs: [{ internalType: "address", name: "asset", type: "address" }],
    name: "getConfiguration",
    outputs: [
      {
        components: [{ internalType: "uint256", name: "data", type: "uint256" }],
        internalType: "struct DataTypes.ReserveConfigurationMap",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    // Returns the user's UserConfigurationMap — a single uint256 bitmap
    // packing, per reserve index, an is-borrowing and a
    // use-as-collateral flag. Decode with `userConfigurationBits`.
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserConfiguration",
    outputs: [
      {
        components: [{ internalType: "uint256", name: "data", type: "uint256" }],
        internalType: "struct DataTypes.UserConfigurationMap",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    // ReserveDataLegacy — kept ABI-stable across V3 versions for
    // back-compat. Carries the config bitmap (`configuration.data`), the
    // liquidity / variable-borrow indices (to scale a user's aToken /
    // debt balances to underlying), and the reserve's aToken /
    // variable-debt token addresses + `id` (its index in the user
    // configuration bitmap).
    inputs: [{ internalType: "address", name: "asset", type: "address" }],
    name: "getReserveData",
    outputs: [
      {
        components: [
          {
            components: [{ internalType: "uint256", name: "data", type: "uint256" }],
            internalType: "struct DataTypes.ReserveConfigurationMap",
            name: "configuration",
            type: "tuple",
          },
          { internalType: "uint128", name: "liquidityIndex", type: "uint128" },
          { internalType: "uint128", name: "currentLiquidityRate", type: "uint128" },
          { internalType: "uint128", name: "variableBorrowIndex", type: "uint128" },
          { internalType: "uint128", name: "currentVariableBorrowRate", type: "uint128" },
          { internalType: "uint128", name: "currentStableBorrowRate", type: "uint128" },
          { internalType: "uint40", name: "lastUpdateTimestamp", type: "uint40" },
          { internalType: "uint16", name: "id", type: "uint16" },
          { internalType: "address", name: "aTokenAddress", type: "address" },
          { internalType: "address", name: "stableDebtTokenAddress", type: "address" },
          { internalType: "address", name: "variableDebtTokenAddress", type: "address" },
          { internalType: "address", name: "interestRateStrategyAddress", type: "address" },
          { internalType: "uint128", name: "accruedToTreasury", type: "uint128" },
          { internalType: "uint128", name: "unbacked", type: "uint128" },
          { internalType: "uint128", name: "isolationModeTotalDebt", type: "uint128" },
        ],
        internalType: "struct DataTypes.ReserveDataLegacy",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
]);

/**
 * Bit layout of the AAVE V3 `ReserveConfigurationMap.data` bitmap
 * (the `uint256` returned by `Pool.getConfiguration(asset)` and carried
 * as `getReserveData(asset).configuration.data`). Each entry is
 * `{ offset, bits }` — the low bit index and field width — so a consumer
 * decodes a field with:
 *
 *   const raw = BigInt(configData);
 *   const { offset, bits } = aaveV3.reserveConfigurationBits.ltv;
 *   const ltv = Number((raw >> BigInt(offset)) & ((1n << BigInt(bits)) - 1n));
 *
 * Single-bit flags (`bits: 1`) decode to 0/1. `ltv` /
 * `liquidationThreshold` / `liquidationBonus` / `reserveFactor` /
 * `liquidationProtocolFee` are in basis points (1e4 = 100%); `decimals`
 * is the underlying's ERC-20 decimals.
 *
 * Only the version-stable low bits (0–167) are exported. Higher bits
 * (stable-rate flag, isolation/siloed flags, eMode category, debt
 * ceiling, unbacked mint cap, virtual-accounting flag, …) sit at
 * positions that have shifted or changed meaning between deployed AAVE
 * V3 versions — and our covered chains run different versions
 * concurrently — so baking them here would risk a wrong decode. Read
 * those from the market's own contracts if needed. These low bits are
 * the health-factor-relevant fields and are identical across every V3
 * deployment (cross-checked on-chain against `UiPoolDataProvider`).
 */
const reserveConfigurationBits = Object.freeze({
  ltv: { offset: 0, bits: 16 },
  liquidationThreshold: { offset: 16, bits: 16 },
  liquidationBonus: { offset: 32, bits: 16 },
  decimals: { offset: 48, bits: 8 },
  active: { offset: 56, bits: 1 },
  frozen: { offset: 57, bits: 1 },
  borrowingEnabled: { offset: 58, bits: 1 },
  paused: { offset: 60, bits: 1 },
  flashLoanEnabled: { offset: 63, bits: 1 },
  reserveFactor: { offset: 64, bits: 16 },
  borrowCap: { offset: 80, bits: 36 },
  supplyCap: { offset: 116, bits: 36 },
  liquidationProtocolFee: { offset: 152, bits: 16 },
} as const);

/**
 * Bit layout of the AAVE V3 `UserConfigurationMap.data` bitmap (the
 * `uint256` returned by `Pool.getUserConfiguration(user)`). Two bits per
 * reserve, indexed by the reserve's `id` (its position in
 * `Pool.getReservesList()` / `getReserveData(asset).id`):
 *
 *   const raw = BigInt(userConfigData);
 *   const base = BigInt(id) * BigInt(aaveV3.userConfigurationBits.bitsPerReserve);
 *   const isBorrowing =
 *     ((raw >> (base + BigInt(aaveV3.userConfigurationBits.borrowingOffset))) & 1n) === 1n;
 *   const usedAsCollateral =
 *     ((raw >> (base + BigInt(aaveV3.userConfigurationBits.collateralOffset))) & 1n) === 1n;
 *
 * This is the source of `usageAsCollateralEnabled` per reserve for a
 * given user. Stable across all V3 versions.
 */
const userConfigurationBits = Object.freeze({
  bitsPerReserve: 2,
  borrowingOffset: 0,
  collateralOffset: 1,
} as const);

/**
 * Per-chain reserve token addresses for the assets AAVE V3 markets
 * keep available across chains. Mainly used by template tests that
 * need a known faucet-mintable token to drive supply/borrow flows
 * against the live testnet markets. Extend per chain as more reserves
 * become test-relevant.
 *
 * NOTE: the Sepolia LINK here is AAVE's *faucet-mintable test token*
 * wired into the Sepolia market, not mainnet ChainLink LINK.
 */
const tokens = Object.freeze({
  LINK: {
    [Chains.Sepolia]: "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5",
  } satisfies AddressByChain,
});

/**
 * Reserve catalog for the covered chains: each chain's AAVE V3 reserves as
 * `{ symbol, underlying, aToken, variableDebtToken, decimals }`. This is a
 * `Partial` map — chains without an AAVE V3 market (or not yet generated) are
 * simply absent, so look up defensively. Drives supply-token pickers (the
 * `underlying` is what users supply; `aToken` is the receipt they get).
 * Generated from chain — see `scripts/generate-aave-reserves.ts` /
 * `aave-v3-reserves.ts`.
 */
const reserves = aaveV3Reserves;

export const aaveV3 = Object.freeze({
  pool,
  oracle,
  wethGateway,
  poolAddressesProvider,
  uiPoolDataProvider,
  eventTopics,
  poolEventsAbi,
  poolMethodsAbi,
  reserveConfigurationBits,
  userConfigurationBits,
  tokens,
  reserves,
});

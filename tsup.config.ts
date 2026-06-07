import { defineConfig } from "tsup";

// Multi-entry build so per-chain token modules ship as their own
// bundle artifacts and can be reached via the package's subpath
// exports (`@avaprotocol/protocols/tokens/sepolia`, etc.). Consumers
// that only want one chain's tokens get just that file in their
// bundle instead of all five chains' worth via the root `Tokens`
// namespace.
//
// Type declarations are emitted separately by `tsc -p
// tsconfig.build.json` (`build:declarations`) so `dts: false` here.
export default defineConfig({
  entry: [
    "src/index.ts",
    "src/tokens/ethereum.ts",
    "src/tokens/sepolia.ts",
    "src/tokens/base.ts",
    "src/tokens/base-sepolia.ts",
    "src/tokens/bnb-mainnet.ts",
  ],
  format: ["cjs", "esm"],
  target: "es2020",
  dts: false,
  splitting: false,
  clean: false,
  sourcemap: false,
});

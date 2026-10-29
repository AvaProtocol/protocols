/**
 * `yarn verify:tokens` input handling. Offline: the on-chain checks need
 * network access and are not run here.
 *
 * The property under test: a run that exits 0 checked every candidate
 * row. A row the run would skip must fail it instead.
 */
import { describe, it, expect } from "vitest";

import { Chains } from "../src";
import { parseArgs, parseCandidateRows } from "../scripts/verify-tokens";

const WBNB = { chainId: Chains.BnbMainnet, symbol: "WBNB", address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", decimals: 18 };
const RLUSD = { chainId: Chains.EthereumMainnet, symbol: "RLUSD", address: "0x8292Bb45bf1Ee4d140127049757C2E0fF06317eD", decimals: 18 };

describe("parseCandidateRows()", () => {
  it("accepts well-formed rows on catalog chains", () => {
    expect(parseCandidateRows([WBNB, RLUSD])).toEqual([WBNB, RLUSD]);
    expect(parseCandidateRows([WBNB], Chains.BnbMainnet)).toEqual([WBNB]);
  });

  it("rejects a row on a chain without a catalog file, instead of skipping it", () => {
    // Before: `0 rows checked, 0 with errors`, exit 0.
    expect(() => parseCandidateRows([{ ...RLUSD, chainId: Chains.ArbitrumOne }])).toThrow(/chainId 42161 is not a catalog chain/);
  });

  it("rejects a row without a chainId", () => {
    const { chainId: _omitted, ...withoutChain } = RLUSD;
    expect(() => parseCandidateRows([withoutChain])).toThrow(/chainId undefined is not a catalog chain/);
  });

  it("rejects a row on another chain than --chain", () => {
    expect(() => parseCandidateRows([WBNB, RLUSD], Chains.BnbMainnet)).toThrow(/row 1 \(RLUSD\): chainId 1, but --chain 56/);
  });

  it("reports every bad row in mixed input, and checks none", () => {
    const input = [WBNB, { ...RLUSD, chainId: Chains.ArbitrumOne }, { ...RLUSD, chainId: Chains.OptimismMainnet }];
    expect(() => parseCandidateRows(input)).toThrow(/2 problem\(s\), nothing checked:\n {2}row 1 .*\n {2}row 2 /);
  });

  it("rejects malformed rows", () => {
    expect(() => parseCandidateRows([{ ...WBNB, symbol: "" }])).toThrow(/symbol missing/);
    expect(() => parseCandidateRows([{ ...WBNB, address: "0x1234" }])).toThrow(/is not an address/);
    // Base RLUSD with the wrong checksum casing an earlier draft carried.
    expect(() => parseCandidateRows([{ ...WBNB, address: "0x8d58C0C60B8D6b88Fa98B291a646Db34d0F98258" }])).toThrow(/bad EIP-55 checksum/);
    expect(() => parseCandidateRows([{ ...WBNB, decimals: 6.5 }])).toThrow(/decimals 6.5/);
    expect(() => parseCandidateRows([{ ...WBNB, decimals: "18" }])).toThrow(/decimals "18"/);
    expect(() => parseCandidateRows([null])).toThrow(/row 0: not an object/);
  });

  it("rejects input that is not a non-empty array", () => {
    expect(() => parseCandidateRows(WBNB)).toThrow(/expected a JSON array/);
    expect(() => parseCandidateRows([])).toThrow(/the file has no rows/);
  });
});

describe("parseArgs()", () => {
  it("parses the documented flags", () => {
    expect(parseArgs([])).toEqual({ chain: undefined, json: false, rowsFile: undefined });
    expect(parseArgs(["--chain", "56", "--json", "--rows", "new.json"])).toEqual({ chain: 56, json: true, rowsFile: "new.json" });
  });

  it("rejects --rows without a file, instead of checking the whole catalog", () => {
    expect(() => parseArgs(["--rows"])).toThrow(/--rows needs a value/);
    expect(() => parseArgs(["--rows", "--json"])).toThrow(/--rows needs a value/);
  });

  it("rejects an unknown flag, such as a mistyped --rows", () => {
    expect(() => parseArgs(["--row", "new.json"])).toThrow(/unknown argument --row/);
  });
});

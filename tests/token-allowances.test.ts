import { describe, it, expect, vi } from "vitest";
import { verifyAllowance } from "../scripts/verify-tokens";

const address = "0x3333333333333333333333333333333333333333";
const blockTag = 123;

describe("catalog allowance interface verification", () => {
  it.each(["00", "ff"])("accepts a 32-byte allowance, including nonzero %s", async (byte) => {
    const caller = { call: vi.fn().mockResolvedValue(`0x${byte.repeat(32)}`) };
    expect(await verifyAllowance({ caller, address, blockTag })).toBeUndefined();
    expect(caller.call).toHaveBeenCalledTimes(1);
    expect(caller.call).toHaveBeenCalledWith({
      to: address,
      data: `0xdd62ed3e${"1".repeat(40).padStart(64, "0")}${"2".repeat(40).padStart(64, "0")}`,
      blockTag,
    });
  });

  it.each([0, 1, 31, 33, 64])("rejects a %i-byte return without treating it as zero", async (bytes) => {
    const caller = { call: vi.fn().mockResolvedValue(`0x${"00".repeat(bytes)}`) };
    expect(await verifyAllowance({ caller, address, blockTag })).toBe(`allowance() returned ${bytes} bytes (expected 32)`);
  });

  it.each(["0xzz", "0x0", "not hex"])("rejects malformed RPC data %s", async (result) => {
    expect(await verifyAllowance({ caller: { call: vi.fn().mockResolvedValue(result) }, address, blockTag }))
      .toBe("allowance() returned invalid hex");
  });

  it.each(["execution reverted", "RPC unavailable at https://rpc.example/secret-key", "request timed out"])(
    "fails on %s without printing the provider exception",
    async (message) => {
      const caller = { call: vi.fn().mockRejectedValue(new Error(message)) };
      expect(await verifyAllowance({ caller, address, blockTag })).toBe("allowance() read failed");
    },
  );
});

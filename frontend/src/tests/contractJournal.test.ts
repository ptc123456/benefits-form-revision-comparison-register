import { beforeEach, describe, expect, it, vi } from "vitest";

const { client } = vi.hoisted(() => ({
  client: {
    connect: vi.fn(),
    getTransaction: vi.fn(),
    readContract: vi.fn(),
  },
}));

vi.mock("genlayer-js", () => ({ createClient: vi.fn(() => client) }));
vi.mock("genlayer-js/chains", () => ({ studionet: {} }));
vi.mock("genlayer-js/types", () => ({
  ExecutionResult: { FINISHED_WITH_RETURN: "FINISHED_WITH_RETURN" },
  TransactionHashVariant: { LATEST_FINAL: "latest-final" },
  TransactionStatus: { FINALIZED: "FINALIZED" },
}));

vi.stubEnv("VITE_CONTRACT_ADDRESS", "0x2222222222222222222222222222222222222222");
const { hasPendingJournal, readCase, reconcilePending } = await import("../lib/contract");

const OWNER = "0x1111111111111111111111111111111111111111";
const HASH = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const provider = {
  request: vi.fn(async ({ method }: { method: string }) => method === "eth_chainId" ? "0xf22f" : [OWNER]),
};

describe("pending transaction reconciliation", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    client.connect.mockResolvedValue(undefined);
  });

  it("moves a definitive UNDETERMINED transaction to failed history and unlocks retry", async () => {
    sessionStorage.setItem("formline.pending", JSON.stringify({ hash: HASH, functionName: "assess", caseId: "case-1", owner: OWNER }));
    client.getTransaction.mockResolvedValue({ statusName: "UNDETERMINED" });

    const result = await reconcilePending(OWNER, provider);

    expect(result).toMatchObject({ hash: HASH, functionName: "assess", status: "UNDETERMINED", verified: false });
    expect(hasPendingJournal()).toBe(false);
    expect(JSON.parse(sessionStorage.getItem("formline.failed") || "[]")[0]).toMatchObject({ hash: HASH, status: "UNDETERMINED" });
  });

  it("does not accept FROZEN as a successful assess readback", async () => {
    sessionStorage.setItem("formline.pending", JSON.stringify({ hash: HASH, functionName: "assess", caseId: "case-1", owner: OWNER }));
    client.getTransaction.mockResolvedValue({ statusName: "FINALIZED", txExecutionResultName: "FINISHED_WITH_RETURN" });
    client.readContract.mockResolvedValue(JSON.stringify({ case_id: "case-1", owner: OWNER, state: "FROZEN" }));

    await expect(reconcilePending(OWNER, provider)).rejects.toThrow("expected ASSESSED or UNRESOLVED");
    expect(hasPendingJournal()).toBe(true);
  });

  it("clears a finalized pending write from a known authoritative readback", async () => {
    sessionStorage.setItem("formline.pending", JSON.stringify({ hash: HASH, functionName: "create_case", caseId: "case-1", owner: OWNER, programId: "benefits-demo" }));
    client.getTransaction.mockResolvedValue({ statusName: "FINALIZED", txExecutionResultName: "FINISHED_WITH_RETURN" });

    const result = await reconcilePending(OWNER, provider, {
      case_id: "case-1",
      owner: OWNER,
      state: "DRAFT",
      program_id: "benefits-demo",
    } as never);

    expect(result).toMatchObject({ hash: HASH, functionName: "create_case", verified: true });
    expect(hasPendingJournal()).toBe(false);
    expect(client.readContract).not.toHaveBeenCalled();
  });

  it("accepts the current Studionet validator receipt shape", async () => {
    sessionStorage.setItem("formline.pending", JSON.stringify({ hash: HASH, functionName: "create_case", caseId: "case-1", owner: OWNER, programId: "benefits-demo" }));
    client.getTransaction.mockResolvedValue({
      statusName: "FINALIZED",
      result_name: "MAJORITY_AGREE",
      consensus_data: { validators: [{ execution_result: "SUCCESS", result: "encoded-return" }] },
    });

    const result = await reconcilePending(OWNER, provider, {
      case_id: "case-1",
      owner: OWNER,
      state: "DRAFT",
      program_id: "benefits-demo",
    } as never);

    expect(result).toMatchObject({ verified: true, status: "FINALIZED" });
    expect(hasPendingJournal()).toBe(false);
  });

  it("retries an empty case readback before returning the authoritative record", async () => {
    client.readContract.mockResolvedValueOnce("").mockResolvedValueOnce(JSON.stringify({ case_id: "case-1", owner: OWNER, state: "FROZEN" }));

    await expect(readCase("case-1")).resolves.toMatchObject({ case_id: "case-1", state: "FROZEN" });
    expect(client.readContract).toHaveBeenCalledTimes(2);
    expect(client.readContract).toHaveBeenLastCalledWith(expect.objectContaining({ transactionHashVariant: "latest-final" }));
  });

  it("keeps bounded retrying through delayed post-finality visibility", async () => {
    client.readContract
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce(JSON.stringify({ case_id: "case-1", owner: OWNER, state: "DRAFT" }));

    await expect(readCase("case-1")).resolves.toMatchObject({ case_id: "case-1", state: "DRAFT" });
    expect(client.readContract).toHaveBeenCalledTimes(5);
  }, 30000);
});

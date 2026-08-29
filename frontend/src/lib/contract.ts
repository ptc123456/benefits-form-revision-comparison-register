import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";
import type { Eip1193Provider } from "./walletProviders";

export type CaseRecord = {
  case_id: string;
  owner: string;
  program_id: string;
  old_url: string;
  new_url: string;
  state: string;
  outcome: string;
  reason: string;
  statuses: Record<string, number>;
  old_revision_id: string;
  new_revision_id: string;
  old_deadline: string;
  new_deadline: string;
  required_fields_added: string[];
  required_fields_removed: string[];
  required_attachments_added: string[];
  required_attachments_removed: string[];
  deadline_changed: boolean;
  evidence_digest: string;
  retry_count: number;
};

type AnyClient = ReturnType<typeof createClient>;
type TxHash = `0x${string}` & { length: 66 };

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || "") as `0x${string}`;
export const readClient = createClient({ chain: studionet });
let volatilePendingHash = "";
let writeInFlight = false;

function requireAddress(): `0x${string}` {
  if (!/^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS)) {
    throw new Error("Set VITE_CONTRACT_ADDRESS to the deployed Studionet contract address.");
  }
  return CONTRACT_ADDRESS;
}

function parseCase(value: unknown): CaseRecord {
  if (typeof value !== "string") throw new Error("The contract returned a non-text case record.");
  return JSON.parse(value) as CaseRecord;
}

export async function readCase(caseId: string): Promise<CaseRecord> {
  const result = await readClient.readContract({ address: requireAddress(), functionName: "get_case", args: [caseId] });
  return parseCase(result);
}

export async function readCaseCount(): Promise<string> {
  const result = await readClient.readContract({ address: requireAddress(), functionName: "get_case_count", args: [] });
  return String(result);
}

function writeClient(address: string, provider: Eip1193Provider): AnyClient {
  return createClient({ chain: studionet, account: address as `0x${string}`, provider });
}

async function waitForVerifiedWrite(client: AnyClient, hash: TxHash): Promise<void> {
  const deadline = Date.now() + 12 * 60 * 1000;
  while (Date.now() < deadline) {
    const transaction = await client.getTransaction({ hash });
    const status = String((transaction as { statusName?: string; status?: string }).statusName ?? transaction.status ?? "").toUpperCase();
    const typed = transaction as {
      txExecutionResultName?: string;
      consensus_data?: { leader_receipt?: Array<{ mode?: string; execution_result?: string; result?: { status?: string } }> };
    };
    const leader = typed.consensus_data?.leader_receipt?.find((receipt) => receipt.mode === "leader");
    const execution = String(
      typed.txExecutionResultName ??
      (leader?.execution_result === "SUCCESS" && leader.result?.status === "return" ? ExecutionResult.FINISHED_WITH_RETURN : ""),
    ).toUpperCase();
    if (status === String(TransactionStatus.FINALIZED).toUpperCase()) {
      if (execution !== String(ExecutionResult.FINISHED_WITH_RETURN).toUpperCase()) {
        throw new Error(`Transaction finalized with execution result ${execution}.`);
      }
      return;
    }
    if (status === "UNDETERMINED" || status === "CANCELED") throw new Error(`Transaction ended with status ${status}.`);
    await new Promise((resolve) => window.setTimeout(resolve, 5000));
  }
  throw new Error("Timed out while waiting for GenLayer finality; keep the transaction hash for reconciliation.");
}

function proveJournalStorage(): void {
  const key = "formline.storage-probe";
  const value = String(Date.now());
  sessionStorage.setItem(key, value);
  if (sessionStorage.getItem(key) !== value) throw new Error("Browser storage cannot be verified; no transaction was sent.");
  sessionStorage.removeItem(key);
}

async function write(address: string, provider: Eip1193Provider, functionName: string, args: string[], verify: () => Promise<void>): Promise<string> {
  if (writeInFlight) throw new Error("A transaction is already awaiting verification.");
  proveJournalStorage();
  writeInFlight = true;
  const client = writeClient(address, provider);
  try {
    await client.connect("studionet");
    const hash = await client.writeContract({ address: requireAddress(), functionName, args, value: BigInt(0) }) as TxHash;
    volatilePendingHash = hash;
    sessionStorage.setItem("formline.pending", JSON.stringify({ hash, functionName, caseId: args[0] || "" }));
    await waitForVerifiedWrite(client, hash);
    await verify();
    sessionStorage.removeItem("formline.pending");
    volatilePendingHash = "";
    writeInFlight = false;
    return hash;
  } catch (error) {
    const hash = volatilePendingHash;
    if (!hash) writeInFlight = false;
    throw new Error(`${error instanceof Error ? error.message : String(error)}${hash ? ` Hash: ${hash}` : ""}`);
  }
}

export const actions = {
  create: (address: string, provider: Eip1193Provider, programId: string, oldUrl: string, newUrl: string) => write(address, provider, "create_case", [programId, oldUrl, newUrl], async () => { await readCaseCount(); }),
  freeze: (address: string, provider: Eip1193Provider, caseId: string) => write(address, provider, "freeze_case", [caseId], async () => { await readCase(caseId); }),
  assess: (address: string, provider: Eip1193Provider, caseId: string) => write(address, provider, "assess", [caseId], async () => { await readCase(caseId); }),
  retry: (address: string, provider: Eip1193Provider, caseId: string) => write(address, provider, "retry_unresolved", [caseId], async () => { await readCase(caseId); }),
};

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";
import type { Eip1193Provider } from "./walletProviders";

export type CaseRecord = {
  case_id: string;
  owner: string;
  assessor: string;
  case_nonce: string;
  program_id: string;
  old_url: string;
  new_url: string;
  state: string;
  outcome: string;
  reason: string;
  statuses: Record<string, number>;
  old_revision_id: string;
  new_revision_id: string;
  frozen_old_revision_id: string;
  frozen_new_revision_id: string;
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
type PendingJournal = {
  hash: TxHash;
  functionName: string;
  caseId: string;
  owner: string;
  programId?: string;
  oldUrl?: string;
  newUrl?: string;
  oldRevisionId?: string;
  newRevisionId?: string;
};

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

export async function readCaseId(owner: string, caseNonce: string): Promise<string> {
  const result = await readClient.readContract({ address: requireAddress(), functionName: "get_case_id", args: [owner, caseNonce] });
  if (typeof result !== "string" || !result) throw new Error("The contract returned no deterministic case identity.");
  return result;
}

export async function readCaseCount(): Promise<string> {
  const result = await readClient.readContract({ address: requireAddress(), functionName: "get_case_count", args: [] });
  return String(result);
}

function writeClient(address: string, provider: Eip1193Provider): AnyClient {
  return createClient({ chain: studionet, account: address as `0x${string}`, provider });
}

async function verifyCurrentSession(address: string, provider: Eip1193Provider): Promise<void> {
  const [chainId, accounts] = await Promise.all([
    provider.request({ method: "eth_chainId" }),
    provider.request({ method: "eth_accounts" }),
  ]);
  if (String(chainId).toLowerCase() !== "0xf22f") throw new Error("Selected wallet is no longer on GenLayer Studionet.");
  const active = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "";
  if (!active || active.toLowerCase() !== address.toLowerCase()) throw new Error("Selected wallet account changed; reconnect before signing.");
}

function assertCase(record: CaseRecord, expected: { caseId: string; owner: string; state?: string | string[]; programId?: string; oldUrl?: string; newUrl?: string; oldRevisionId?: string; newRevisionId?: string }): void {
  const states = expected.state ? (Array.isArray(expected.state) ? expected.state : [expected.state]) : [];
  if (record.case_id !== expected.caseId || record.owner.toLowerCase() !== expected.owner.toLowerCase()) throw new Error("Authoritative readback returned a different case or owner.");
  if (states.length && !states.includes(record.state)) throw new Error(`Authoritative readback returned state ${record.state}, expected ${states.join(" or ")}.`);
  if (expected.programId && record.program_id !== expected.programId) throw new Error("Authoritative readback returned a different program.");
  if (expected.oldUrl && record.old_url !== expected.oldUrl) throw new Error("Authoritative readback returned a different old source.");
  if (expected.newUrl && record.new_url !== expected.newUrl) throw new Error("Authoritative readback returned a different new source.");
  if (expected.oldRevisionId && record.frozen_old_revision_id !== expected.oldRevisionId) throw new Error("Authoritative readback returned a different frozen old revision.");
  if (expected.newRevisionId && record.frozen_new_revision_id !== expected.newRevisionId) throw new Error("Authoritative readback returned a different frozen new revision.");
}

type WriteTerminal = { status: string; execution: string };

async function waitForVerifiedWrite(client: AnyClient, hash: TxHash): Promise<WriteTerminal> {
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
    if (status === String(TransactionStatus.FINALIZED).toUpperCase()) return { status, execution };
    if (status === "UNDETERMINED" || status === "CANCELED") return { status, execution };
    await new Promise((resolve) => window.setTimeout(resolve, 5000));
  }
  throw new Error("Timed out while waiting for GenLayer finality; keep the transaction hash for reconciliation.");
}

function rememberFailedTransaction(pending: PendingJournal, terminal: WriteTerminal): void {
  let history: unknown[] = [];
  try {
    const parsed = JSON.parse(sessionStorage.getItem("formline.failed") || "[]");
    if (Array.isArray(parsed)) history = parsed;
  } catch { /* replace malformed local history */ }
  history.unshift({ ...pending, status: terminal.status, execution: terminal.execution, failedAt: new Date().toISOString() });
  sessionStorage.setItem("formline.failed", JSON.stringify(history.slice(0, 8)));
  sessionStorage.removeItem("formline.pending");
  volatilePendingHash = "";
  writeInFlight = false;
}

function proveJournalStorage(): void {
  const key = "formline.storage-probe";
  const value = String(Date.now());
  sessionStorage.setItem(key, value);
  if (sessionStorage.getItem(key) !== value) throw new Error("Browser storage cannot be verified; no transaction was sent.");
  sessionStorage.removeItem(key);
}

async function write(address: string, provider: Eip1193Provider, functionName: string, args: string[], pending: Omit<PendingJournal, "hash" | "functionName">, verify: () => Promise<void>): Promise<string> {
  if (writeInFlight) throw new Error("A transaction is already awaiting verification.");
  proveJournalStorage();
  writeInFlight = true;
  const client = writeClient(address, provider);
  try {
    await client.connect("studionet");
    await verifyCurrentSession(address, provider);
    const hash = await client.writeContract({ address: requireAddress(), functionName, args, value: BigInt(0) }) as TxHash;
    volatilePendingHash = hash;
    sessionStorage.setItem("formline.pending", JSON.stringify({ ...pending, hash, functionName }));
    const terminal = await waitForVerifiedWrite(client, hash);
    if (terminal.status !== String(TransactionStatus.FINALIZED).toUpperCase() || terminal.execution !== String(ExecutionResult.FINISHED_WITH_RETURN).toUpperCase()) {
      rememberFailedTransaction({ ...pending, hash, functionName }, terminal);
      throw new Error(`Transaction ended with status ${terminal.status} and execution ${terminal.execution}. Retry from the unchanged case state. Hash: ${hash}`);
    }
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
  create: async (address: string, provider: Eip1193Provider, programId: string, oldUrl: string, newUrl: string, caseNonce: string) => {
    const caseId = await readCaseId(address, caseNonce);
    return write(address, provider, "create_case", [programId, oldUrl, newUrl, caseNonce], { caseId, owner: address, programId, oldUrl, newUrl }, async () => {
      assertCase(await readCase(caseId), { caseId, owner: address, state: "DRAFT", programId, oldUrl, newUrl });
    });
  },
  freeze: (address: string, provider: Eip1193Provider, caseId: string, oldRevisionId: string, newRevisionId: string) => write(address, provider, "freeze_case", [caseId, oldRevisionId, newRevisionId], { caseId, owner: address, oldRevisionId, newRevisionId }, async () => {
    assertCase(await readCase(caseId), { caseId, owner: address, state: "FROZEN", oldRevisionId, newRevisionId });
  }),
  assess: (address: string, provider: Eip1193Provider, caseId: string) => write(address, provider, "assess", [caseId], { caseId, owner: address }, async () => {
    assertCase(await readCase(caseId), { caseId, owner: address, state: ["ASSESSED", "UNRESOLVED"] });
  }),
  retry: (address: string, provider: Eip1193Provider, caseId: string) => write(address, provider, "retry_unresolved", [caseId], { caseId, owner: address }, async () => {
    assertCase(await readCase(caseId), { caseId, owner: address, state: ["ASSESSED", "UNRESOLVED"] });
  }),
};

function pendingJournal(): PendingJournal | null {
  const raw = sessionStorage.getItem("formline.pending");
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingJournal>;
    if (typeof value.hash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(value.hash) || typeof value.caseId !== "string" || typeof value.owner !== "string") return null;
    return value as PendingJournal;
  } catch {
    return null;
  }
}

export function hasPendingJournal(): boolean { return pendingJournal() !== null; }

export async function reconcilePending(address: string, provider: Eip1193Provider): Promise<{ hash: string; caseId: string; functionName: string; status: string; verified: boolean }> {
  const pending = pendingJournal();
  if (!pending) throw new Error("No valid pending transaction journal was found.");
  const client = writeClient(address, provider);
  try {
    await client.connect("studionet");
    await verifyCurrentSession(address, provider);
    const terminal = await waitForVerifiedWrite(client, pending.hash);
    const finalized = terminal.status === String(TransactionStatus.FINALIZED).toUpperCase();
    const succeeded = finalized && terminal.execution === String(ExecutionResult.FINISHED_WITH_RETURN).toUpperCase();
    if (!succeeded) {
      rememberFailedTransaction(pending, terminal);
      return { hash: pending.hash, caseId: pending.caseId, functionName: pending.functionName, status: terminal.status, verified: false };
    }
    assertCase(await readCase(pending.caseId), {
      caseId: pending.caseId,
      owner: address,
      state: pending.functionName === "create_case" ? "DRAFT" : pending.functionName === "freeze_case" ? "FROZEN" : ["ASSESSED", "UNRESOLVED"],
      programId: pending.programId,
      oldUrl: pending.oldUrl,
      newUrl: pending.newUrl,
      oldRevisionId: pending.oldRevisionId,
      newRevisionId: pending.newRevisionId,
    });
    sessionStorage.removeItem("formline.pending");
    volatilePendingHash = "";
    writeInFlight = false;
    return { hash: pending.hash, caseId: pending.caseId, functionName: pending.functionName, status: terminal.status, verified: true };
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)} Hash: ${pending.hash}`);
  }
}

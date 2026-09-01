import { useEffect, useState } from "react";
import { DecisionCard } from "./components/DecisionCard";
import { Header } from "./components/Header";
import { HeroBanner } from "./components/HeroBanner";
import { NotificationToast } from "./components/NotificationToast";
import { RegisterCard } from "./components/RegisterCard";
import { StepNav } from "./components/StepNav";
import { WorkflowCard } from "./components/WorkflowCard";
import {
  actions,
  hasPendingJournal,
  readCase,
  readCaseCount,
  readCaseId,
  reconcilePending,
  type CaseRecord,
} from "./lib/contract";
import {
  connectProvider,
  discoverWalletProviders,
  type WalletProvider,
} from "./lib/walletProviders";
import { userErrorMessage } from "./lib/userErrors";

const emptyCase: CaseRecord = {
  case_id: "",
  owner: "",
  assessor: "",
  case_nonce: "",
  program_id: "",
  old_url: "",
  new_url: "",
  state: "",
  outcome: "",
  reason: "",
  statuses: {},
  old_revision_id: "",
  new_revision_id: "",
  old_deadline: "",
  new_deadline: "",
  required_fields_added: [],
  required_fields_removed: [],
  frozen_old_revision_id: "",
  frozen_new_revision_id: "",
  required_attachments_added: [],
  required_attachments_removed: [],
  deadline_changed: false,
  evidence_digest: "",
  retry_count: 0,
};

export function App() {
  const [wallets, setWallets] = useState<WalletProvider[]>([]);
  const [wallet, setWallet] = useState<WalletProvider | null>(null);
  const [address, setAddress] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const [programId, setProgramId] = useState("BENEFITS-2026");
  const [oldUrl, setOldUrl] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [oldRevisionId, setOldRevisionId] = useState("");
  const [newRevisionId, setNewRevisionId] = useState("");
  const [caseId, setCaseId] = useState("");
  const [record, setRecord] = useState<CaseRecord>(emptyCase);
  const [caseCount, setCaseCount] = useState("—");

  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [pending, setPending] = useState(false);

  // Discover EIP-6963 wallet providers on mount
  useEffect(() => {
    discoverWalletProviders()
      .then((found) => {
        setWallets(found);
      })
      .catch(() => setWallets([]));
  }, []);

  // Check initial case count on mount
  useEffect(() => {
    readCaseCount()
      .then(setCaseCount)
      .catch(() => setCaseCount("—"));
  }, []);

  // Check session storage for pending journal or failed transaction on mount
  useEffect(() => {
    const raw = sessionStorage.getItem("formline.pending");
    if (raw) {
      try {
        const pendingData = JSON.parse(raw) as { hash?: unknown; functionName?: unknown };
        if (typeof pendingData.hash === "string" && pendingData.hash) {
          setTxHash(pendingData.hash);
          setPending(true);
          setNotice(
            `Pending ${
              typeof pendingData.functionName === "string" ? pendingData.functionName : "transaction"
            } found after reload. Reconcile this hash before retrying.`
          );
        }
      } catch {
        sessionStorage.removeItem("formline.pending");
      }
      return;
    }
    try {
      const failed = JSON.parse(sessionStorage.getItem("formline.failed") || "[]") as Array<{
        hash?: unknown;
        status?: unknown;
        functionName?: unknown;
      }>;
      const latest = failed[0];
      if (typeof latest?.hash === "string") {
        setTxHash(latest.hash);
        setNotice(
          `Previous ${
            typeof latest.functionName === "string" ? latest.functionName : "transaction"
          } ended ${String(latest.status || "without finality")}. Hash retained; inspect it before retrying.`
        );
      }
    } catch {
      sessionStorage.removeItem("formline.failed");
    }
  }, []);

  // Listen to provider events (accountsChanged, chainChanged, disconnect)
  useEffect(() => {
    if (!wallet?.provider.on) return;
    const onAccounts = (...args: unknown[]) => {
      const accounts = args[0];
      const next = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "";
      setAddress(next);
      if (!next) {
        setNotice("Wallet disconnected. Select and connect your signer again.");
      }
    };
    const onChain = () => {
      setAddress("");
      setError("Network changed. Reconnect your selected wallet on GenLayer Studionet.");
    };
    const onDisconnect = () => {
      setAddress("");
      setNotice("Wallet disconnected. Choose a wallet to reconnect.");
    };
    wallet.provider.on("accountsChanged", onAccounts);
    wallet.provider.on("chainChanged", onChain);
    wallet.provider.on("disconnect", onDisconnect);
    return () => {
      wallet.provider.removeListener?.("accountsChanged", onAccounts);
      wallet.provider.removeListener?.("chainChanged", onChain);
      wallet.provider.removeListener?.("disconnect", onDisconnect);
    };
  }, [wallet]);

  // Connect action
  const connect = async (chosenWallet?: WalletProvider) => {
    setError("");
    if (!wallets.length) {
      setError("No supported wallet was found. Install MetaMask, OKX Wallet, or Rabby, then reload.");
      return;
    }
    const selected = chosenWallet || wallet;
    if (!selected) {
      setError("Choose a wallet to continue.");
      return;
    }
    setIsConnecting(true);
    try {
      const connectedAddress = await connectProvider(selected);
      setWallet(selected);
      setAddress(connectedAddress);
      setNotice(`Connected with ${selected.info.name} on Studionet.`);
    } catch (cause) {
      setError(userErrorMessage(cause));
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress("");
    setNotice("Wallet disconnected.");
  };

  // Transaction execution runner
  async function run(
    label: string,
    action: () => Promise<string | void>,
    after?: () => Promise<void>
  ) {
    setBusy(label);
    setError("");
    setNotice("");
    try {
      const hash = await action();
      if (typeof hash === "string") {
        setTxHash(hash);
        setPending(false);
      }
      if (after) await after();
      setNotice(
        hash
          ? `Finalized and verified on Studionet: ${hash}`
          : `${label} completed and read back successfully.`
      );
    } catch (cause) {
      const message = userErrorMessage(cause);
      const hash = message.match(/Hash:\s(0x[a-fA-F0-9]{64})/)?.[1];
      if (hash) setTxHash(hash);
      setPending(hasPendingJournal());
      setError(message);
    } finally {
      setBusy("");
    }
  }

  // Register Pair (Step 01)
  async function registerPair() {
    if (!wallet || !address) return;
    const caseNonce = crypto.randomUUID().replaceAll("-", "");
    await run(
      "Register form pair",
      () => actions.create(address, wallet.provider, programId, oldUrl, newUrl, caseNonce),
      async () => {
        const createdCaseId = await readCaseId(address, caseNonce);
        setCaseId(createdCaseId);
        setRecord(await readCase(createdCaseId));
        setCaseCount(await readCaseCount());
      }
    );
  }

  // Freeze Case
  async function freezeCase() {
    if (!wallet || !address || !caseId) return;
    await run(
      "Freeze case revisions",
      () => actions.freeze(address, wallet.provider, caseId, oldRevisionId, newRevisionId),
      async () => {
        setRecord(await readCase(caseId));
      }
    );
  }

  // Assess Case
  async function assessCase() {
    if (!wallet || !address || !caseId) return;
    await run(
      "Assess form sources",
      () => actions.assess(address, wallet.provider, caseId),
      async () => {
        setRecord(await readCase(caseId));
      }
    );
  }

  // Retry Unresolved Case
  async function retryCase() {
    if (!wallet || !address || !caseId) return;
    await run(
      "Retry assessment",
      () => actions.retry(address, wallet.provider, caseId),
      async () => {
        setRecord(await readCase(caseId));
      }
    );
  }

  // Reconcile pending transaction
  async function reconcile() {
    if (!wallet || !address) return;
    setBusy("Reconcile pending transaction");
    setError("");
    setNotice("");
    try {
      const result = await reconcilePending(address, wallet.provider);
      setTxHash(result.hash);
      setPending(false);
      if (result.verified) {
        setCaseId(result.caseId);
        setRecord(await readCase(result.caseId));
        setNotice(`Reconciled and verified: ${result.hash}`);
      } else {
        if (result.caseId && result.functionName !== "create_case") {
          setCaseId(result.caseId);
          setRecord(await readCase(result.caseId));
        }
        setNotice(
          `${result.functionName} ended with status ${result.status}. Hash retained in failed history. Retry from unchanged case state.`
        );
      }
    } catch (cause) {
      setPending(hasPendingJournal());
      setError(userErrorMessage(cause));
    } finally {
      setBusy("");
    }
  }

  // Read / Refresh Case state
  async function refresh() {
    setError("");
    try {
      if (caseId) {
        const fetched = await readCase(caseId);
        setRecord(fetched);
        if (fetched.frozen_old_revision_id) setOldRevisionId(fetched.frozen_old_revision_id);
        if (fetched.frozen_new_revision_id) setNewRevisionId(fetched.frozen_new_revision_id);
      }
      setCaseCount(await readCaseCount());
    } catch (cause) {
      setError(userErrorMessage(cause));
    }
  }

  const canWrite = Boolean(address && wallet && !busy && !pending);

  return (
    <div className="app-shell">
      {/* Top Fixed Header with Wallet Control Room */}
      <Header
        wallets={wallets}
        selectedWallet={wallet}
        onSelectWallet={setWallet}
        address={address}
        onConnect={connect}
        connectionError={error}
        onDisconnect={disconnect}
        isConnecting={isConnecting}
        caseCount={caseCount}
      />

      {/* Main Container */}
      <main className="main-content">
        <HeroBanner />

        <StepNav currentStep={record.case_id ? (record.state === "ASSESSED" ? 3 : 2) : 1} caseState={record.state} />

        {/* 2-Column Responsive Workspace */}
        <section className="workspace-grid">
          {/* Step 01: Register Pair */}
          <RegisterCard
            programId={programId}
            onProgramIdChange={setProgramId}
            oldUrl={oldUrl}
            onOldUrlChange={setOldUrl}
            newUrl={newUrl}
            onNewUrlChange={setNewUrl}
            onRegister={registerPair}
            canWrite={canWrite}
            isBusy={busy === "Register form pair"}
            walletConnected={Boolean(address)}
          />

          {/* Step 02: Advance & Assess Case */}
          <WorkflowCard
            caseId={caseId}
            onCaseIdChange={setCaseId}
            oldRevisionId={oldRevisionId}
            onOldRevisionIdChange={setOldRevisionId}
            newRevisionId={newRevisionId}
            onNewRevisionIdChange={setNewRevisionId}
            record={record}
            onReadCase={refresh}
            onFreeze={freezeCase}
            onAssess={assessCase}
            onRetry={retryCase}
            canWrite={canWrite}
            isBusy={Boolean(busy && busy !== "Register form pair")}
            walletConnected={Boolean(address)}
          />
        </section>

        {/* Step 03: Decision Record */}
        <section className="decision-section">
          <DecisionCard record={record} />
        </section>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <strong>FORM / LINE</strong>
            <span>Autonomous Benefits Form Revision & Requirement Register</span>
          </div>
          <div className="footer-meta">
            <span>GenLayer Studionet</span>
            <span>Contract: <code>0x5E91...a962</code></span>
          </div>
        </div>
      </footer>

      {/* Floating Notification & Reconciliation Toast */}
      <NotificationToast
        notice={notice}
        error={error}
        busy={busy}
        txHash={txHash}
        pending={pending}
        onReconcile={reconcile}
        onDismiss={() => {
          setNotice("");
          setError("");
        }}
      />
    </div>
  );
}

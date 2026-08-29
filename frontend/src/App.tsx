import { useEffect, useMemo, useState } from "react";
import { actions, readCase, readCaseCount, type CaseRecord } from "./lib/contract";
import { connectProvider, discoverWalletProviders, type WalletProvider } from "./lib/walletProviders";

const emptyCase: CaseRecord = {
  case_id: "", owner: "", program_id: "", old_url: "", new_url: "", state: "", outcome: "", reason: "", statuses: {},
  old_revision_id: "", new_revision_id: "", old_deadline: "", new_deadline: "", required_fields_added: [], required_fields_removed: [],
  required_attachments_added: [], required_attachments_removed: [], deadline_changed: false, evidence_digest: "", retry_count: 0,
};

export function App() {
  const [wallets, setWallets] = useState<WalletProvider[]>([]);
  const [wallet, setWallet] = useState<WalletProvider | null>(null);
  const [address, setAddress] = useState("");
  const [programId, setProgramId] = useState("BENEFITS-2026");
  const [oldUrl, setOldUrl] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [caseId, setCaseId] = useState("");
  const [record, setRecord] = useState<CaseRecord>(emptyCase);
  const [caseCount, setCaseCount] = useState("—");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  useEffect(() => { discoverWalletProviders().then(setWallets).catch(() => setWallets([])); }, []);
  useEffect(() => {
    const raw = sessionStorage.getItem("formline.pending");
    if (!raw) return;
    try {
      const pending = JSON.parse(raw) as { hash?: unknown; functionName?: unknown };
      if (typeof pending.hash === "string" && pending.hash) {
        setTxHash(pending.hash);
        setNotice(`Pending ${typeof pending.functionName === "string" ? pending.functionName : "transaction"} found after reload. Reconcile this hash before retrying.`);
      }
    } catch {
      sessionStorage.removeItem("formline.pending");
    }
  }, []);
  useEffect(() => {
    if (!wallet?.provider.on) return;
    const onAccounts = (...args: unknown[]) => {
      const accounts = args[0];
      const next = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "";
      setAddress(next);
      if (!next) setNotice("Wallet disconnected. Choose and connect a wallet again.");
    };
    const onChain = () => { setAddress(""); setError("Network changed. Reconnect the selected wallet on GenLayer Studionet."); };
    wallet.provider.on("accountsChanged", onAccounts);
    wallet.provider.on("chainChanged", onChain);
    return () => { wallet.provider.removeListener?.("accountsChanged", onAccounts); wallet.provider.removeListener?.("chainChanged", onChain); };
  }, [wallet]);
  const connectedLabel = useMemo(() => address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Not connected", [address]);

  async function run(label: string, action: () => Promise<string | void>, after?: () => Promise<void>) {
    setBusy(label); setError(""); setNotice("");
    try { const hash = await action(); if (typeof hash === "string") setTxHash(hash); if (after) await after(); setNotice(hash ? `Finalized and verified: ${hash}` : `${label} completed and was read back.`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(""); }
  }

  async function connect() {
    setError("");
    if (!wallets.length) { setError("No EIP-6963 wallet was announced. Install MetaMask, OKX Wallet, or Rabby and reload."); return; }
    if (!wallet) { setError("Choose a wallet first."); return; }
    try { setAddress(await connectProvider(wallet)); setNotice(`Connected with ${wallet.info.name} on Studionet.`); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function refresh() { setError(""); try { if (caseId) setRecord(await readCase(caseId)); setCaseCount(await readCaseCount()); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } }

  const canWrite = Boolean(address && wallet && !busy);
  return <main className="shell">
    <header className="masthead"><div><p className="eyebrow">FORM / LINE · STUDIONET REGISTER</p><h1>Catch a requirement change before it catches an applicant.</h1><p className="lede">Freeze two structured form revisions. GenLayer validators independently retrieve the sources, normalize the required sets, and record the comparison that survives the review.</p></div><div className="network-chip"><span className="pulse" /> Studionet <small>chain 61999</small></div></header>
    <section className="grid">
      <article className="card intake"><div className="card-top"><div><span className="step">01</span><h2>Register the pair</h2></div><span className="state">{caseCount} cases</span></div>
        <label>Program ID<input value={programId} onChange={(e) => setProgramId(e.target.value)} placeholder="BENEFITS-2026" /></label>
        <label>Older structured form URL<input value={oldUrl} onChange={(e) => setOldUrl(e.target.value)} placeholder="https://…/revision-1.json" /></label>
        <label>Newer structured form URL<input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://…/revision-2.json" /></label>
        <button disabled={!canWrite || !programId || !oldUrl || !newUrl} onClick={() => run("Register case", () => actions.create(address, wallet!.provider, programId, oldUrl, newUrl), async () => { const count = await readCaseCount(); setCaseId(count); setRecord(await readCase(count)); setCaseCount(count); })}>Register pair <span>↗</span></button>
        <p className="hint">Sources must expose `program_id`, `revision_id`, required field IDs, attachment IDs, and an ISO deadline.</p>
      </article>
      <article className="card journey"><div className="card-top"><div><span className="step">02</span><h2>Advance a case</h2></div><span className={`state ${record.state.toLowerCase()}`}>{record.state || "No case loaded"}</span></div>
        <div className="inline"><label>Case ID<input value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="1" /></label><button className="secondary" disabled={!caseId || Boolean(busy)} onClick={refresh}>Read case</button></div>
        <div className="timeline"><div className={record.state === "DRAFT" || record.state === "FROZEN" || record.state === "ASSESSED" ? "done" : ""}><b>Draft</b><span>Registered</span></div><div className={record.state === "FROZEN" || record.state === "ASSESSED" ? "done" : ""}><b>Freeze</b><span>Identity bound</span></div><div className={record.state === "ASSESSED" ? "done" : ""}><b>Assess</b><span>Consensus readback</span></div></div>
        <div className="actions"><button className="secondary" disabled={!canWrite || !caseId} onClick={() => run("Freeze case", () => actions.freeze(address, wallet!.provider, caseId), refresh)}>Freeze</button><button disabled={!canWrite || !caseId || record.state !== "FROZEN"} onClick={() => run("Assess case", () => actions.assess(address, wallet!.provider, caseId), refresh)}>Assess sources</button><button className="secondary" disabled={!canWrite || !caseId || record.state !== "UNRESOLVED"} onClick={() => run("Retry case", () => actions.retry(address, wallet!.provider, caseId), refresh)}>Retry unresolved</button></div>
      </article>
    </section>
    <section className="lower-grid"><article className="card compare"><div className="card-top"><div><span className="step">03</span><h2>Decision record</h2></div><span className={`outcome ${record.outcome.toLowerCase()}`}>{record.outcome || "Awaiting assessment"}</span></div>{record.case_id ? <><div className="revision-row"><div><small>Old revision</small><strong>{record.old_revision_id || "—"}</strong><span>{record.old_deadline || "—"}</span></div><div className="arrow">→</div><div><small>New revision</small><strong>{record.new_revision_id || "—"}</strong><span>{record.new_deadline || "—"}</span></div></div><div className="change-grid"><Change title="Fields added" items={record.required_fields_added} /><Change title="Fields removed" items={record.required_fields_removed} /><Change title="Attachments added" items={record.required_attachments_added} /><Change title="Attachments removed" items={record.required_attachments_removed} /></div><p className="digest">Evidence digest <code>{record.evidence_digest || "not available"}</code></p></> : <div className="empty">Read a case after its finalized write to see the normalized change set.</div>}</article><aside className="card wallet"><p className="eyebrow">CONTROL ROOM</p><h2>Choose a signer</h2><p className="muted">The app never silently picks the first injected wallet. Reloads start disconnected.</p><select aria-label="Wallet provider" value={wallet?.info.uuid || ""} onChange={(e) => setWallet(wallets.find((item) => item.info.uuid === e.target.value) || null)}><option value="">Select MetaMask, OKX, or Rabby</option>{wallets.map((item) => <option key={item.info.uuid} value={item.info.uuid}>{item.info.name}</option>)}</select><button className="secondary wide" onClick={connect}>{connectedLabel}</button><div className="rule-list"><span><i />Wallet boundary</span><span><i />Finality checked</span><span><i />State readback checked</span></div></aside></section>
    {(notice || error || busy) && <div className={`toast ${error ? "danger" : ""}`} role={error ? "alert" : "status"}>{busy ? `${busy} · waiting for finality…` : error || notice}{txHash && !busy && <span className="toast-link"><button className="toast-copy" onClick={() => navigator.clipboard?.writeText(txHash)}>Copy hash</button><a href={`https://explorer-studio.genlayer.com/tx/${txHash}`} target="_blank" rel="noreferrer">Explorer ↗</a></span>}</div>}
  </main>;
}

function Change({ title, items }: { title: string; items: string[] }) { return <div><small>{title}</small>{items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="none">None recorded</p>}</div>; }

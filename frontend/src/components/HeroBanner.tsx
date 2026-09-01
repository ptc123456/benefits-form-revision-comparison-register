import { IconShield } from "./Icons";

export function HeroBanner() {
  return (
    <section className="hero-banner">
      <div className="hero-content">
        <div className="hero-eyebrow">
          <span className="eyebrow-tag">STUDIONET INFRASTRUCTURE</span>
          <span className="eyebrow-rule" />
        </div>
        <h1 className="hero-title">
          Catch a benefits requirement change before it impacts an applicant.
        </h1>
        <p className="hero-lede">
          Program authorities frequently update benefit application schemas. GenLayer validators
          independently retrieve both schema revisions, normalize required fields and attachments,
          and record consensus comparison decisions that survive audit.
        </p>
      </div>

      <div className="trust-strip">
        <div className="trust-item">
          <IconShield className="trust-icon" />
          <div>
            <strong>Wallet choice</strong>
            <span>Choose your preferred signer</span>
          </div>
        </div>
        <div className="trust-divider" />
        <div className="trust-item">
          <IconShield className="trust-icon" />
          <div>
            <strong>Independent Web Fetch</strong>
            <span>Multi-validator schema retrieval</span>
          </div>
        </div>
        <div className="trust-divider" />
        <div className="trust-item">
          <IconShield className="trust-icon" />
          <div>
            <strong>Authoritative Readback</strong>
            <span>Deterministic state verification</span>
          </div>
        </div>
        <div className="trust-divider" />
        <div className="trust-item">
          <IconShield className="trust-icon" />
          <div>
            <strong>Cryptographic Evidence</strong>
            <span>SHA-256 canonical digest</span>
          </div>
        </div>
      </div>
    </section>
  );
}

interface StepNavProps {
  currentStep: number;
  caseState: string;
}

export function StepNav({ currentStep, caseState }: StepNavProps) {
  const steps = [
    {
      number: "01",
      title: "Register Pair",
      subtitle: "Bind program & source URLs",
      isActive: currentStep === 1 || !caseState,
      isDone: Boolean(caseState),
    },
    {
      number: "02",
      title: "Freeze & Assess",
      subtitle: "Lock revisions & run consensus",
      isActive: currentStep === 2 || caseState === "DRAFT" || caseState === "FROZEN",
      isDone: caseState === "ASSESSED" || caseState === "UNRESOLVED",
    },
    {
      number: "03",
      title: "Decision Record",
      subtitle: "Canonical diff & evidence digest",
      isActive: currentStep === 3 || caseState === "ASSESSED" || caseState === "UNRESOLVED",
      isDone: caseState === "ASSESSED",
    },
  ];

  return (
    <nav className="step-pipeline" aria-label="Workflow progress">
      {steps.map((step, index) => (
        <div
          key={step.number}
          className={`pipeline-step ${step.isActive ? "active" : ""} ${
            step.isDone ? "completed" : ""
          }`}
        >
          <div className="step-indicator">
            <span className="step-num">{step.number}</span>
          </div>
          <div className="step-info">
            <span className="step-label">{step.title}</span>
            <span className="step-desc">{step.subtitle}</span>
          </div>
          {index < steps.length - 1 && <div className="step-connector" />}
        </div>
      ))}
    </nav>
  );
}

export default function SafetyBanner() {
  return (
    <div className="safety-banner">
      <span className="safety-banner-item">
        <span className="safety-warn">⚡ LOW-VOLTAGE DEMO (5–12V DC)</span>
      </span>
      <span className="safety-banner-item">NOT FOR HOUSEHOLD MAINS</span>
      <span className="safety-banner-item">Manual physical cutoff always available</span>
      <span className="safety-banner-item">Automation blocked when telemetry is stale</span>
      <span className="safety-banner-item">
        <span className="safety-ok">✓ Payment never overrides safety</span>
      </span>
    </div>
  );
}

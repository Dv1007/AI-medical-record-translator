import { ShieldAlert } from 'lucide-react'

export function MedicalDisclaimer() {
  return (
    <aside
      role="note"
      aria-labelledby="disclaimer-heading"
      className="flex gap-4 rounded-xl border border-status-low/30 bg-status-low-soft p-4 sm:p-5"
    >
      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-status-low" aria-hidden="true" />
      <div>
        <h2 id="disclaimer-heading" className="font-semibold text-foreground">
          For educational purposes only — not a diagnosis
        </h2>
        <p className="mt-1 text-pretty text-sm leading-relaxed text-foreground/80">
          This summary is generated to help you understand your lab report and is not medical advice. Reference
          ranges vary between laboratories, and results must be interpreted alongside your health history. Always
          consult a qualified healthcare professional before making any health decisions. If you have urgent
          symptoms, contact emergency services.
        </p>
      </div>
    </aside>
  )
}

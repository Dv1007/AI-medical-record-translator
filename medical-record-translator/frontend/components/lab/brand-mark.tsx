import { Microscope } from 'lucide-react'

export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Microscope className="size-4.5" aria-hidden="true" />
      </span>
      <span className="text-lg font-semibold tracking-tight">LabLens</span>
    </div>
  )
}

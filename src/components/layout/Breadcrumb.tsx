import { useTrainingStore } from "../../store/trainingStore"

export default function Breadcrumb() {
  const { courseCtx, trainingCtx } = useTrainingStore()
  if (!courseCtx) return null
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-2 text-xs text-slate-500 flex gap-1">
      <span>Course: <strong className="text-slate-700">{courseCtx.title}</strong></span>
      {trainingCtx && (
        <>
          <span>→</span>
          <span>Training: <strong className="text-slate-700">{trainingCtx.title}</strong></span>
        </>
      )}
    </div>
  )
}

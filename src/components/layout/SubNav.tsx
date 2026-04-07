import { NavLink } from "react-router-dom"
import { useTrainingStore } from "../../store/trainingStore"
import { cn } from "../../lib/utils"

interface Tab {
  label: string
  to: string
  requiresCourse?: boolean
  requiresTraining?: boolean
}

const TRAINING_TABS: Tab[] = [
  { label: "Courses", to: "/training/courses" },
  { label: "Trainings", to: "/training/trainings", requiresCourse: true },
  { label: "Questions", to: "/training/questions", requiresTraining: true },
  { label: "Grand Quiz", to: "/training/grand-quiz" },
  { label: "Review / Upload", to: "/training/review" },
]

const ASSET_TABS: Tab[] = [
  { label: "All Assets", to: "/assets/all" },
  { label: "Ready for Review", to: "/assets/review" },
]

interface SubNavProps {
  section: "training" | "assets"
}

export default function SubNav({ section }: SubNavProps) {
  const { courseCtx, trainingCtx } = useTrainingStore()
  const tabs = section === "training" ? TRAINING_TABS : ASSET_TABS

  return (
    <div className="border-b bg-white">
      <div className="max-w-screen-xl mx-auto px-4 flex gap-1 h-10 items-end">
        {tabs.map(tab => {
          const disabled =
            (tab.requiresCourse && !courseCtx) ||
            (tab.requiresTraining && !trainingCtx)
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  "px-4 py-2 text-sm border-b-2 -mb-px transition-colors",
                  isActive
                    ? "border-slate-800 text-slate-800 font-medium"
                    : "border-transparent text-slate-500 hover:text-slate-700",
                  disabled && "opacity-40 pointer-events-none"
                )
              }
            >
              {tab.label}
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}

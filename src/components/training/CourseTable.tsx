import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useCourses } from "../../hooks/useCourses"
import { useLevels } from "../../hooks/useLevels"
import { useTrainingStore } from "../../store/trainingStore"
import { COURSE_TYPES, VENDOR_COURSE_TYPES } from "../../types"
import type { Course } from "../../types"
import { statusColor, cn } from "../../lib/utils"
import { Skeleton } from "../ui/skeleton"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Badge } from "../ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import CourseForm from "./CourseForm"

const VENDORS = [
  { value: "TALEEMABAD", label: "Taleemabad" },
  { value: "BEACONHOUSE", label: "Beaconhouse" },
  { value: "NIETE", label: "NIETE" },
]

export default function CourseTable() {
  const [selectedVendor, setSelectedVendor] = useState<string>("TALEEMABAD")
  const [selectedLevel, setSelectedLevel] = useState<number | undefined>(undefined)
  const [selectedType, setSelectedType] = useState("")
  const [search, setSearch] = useState("")
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [duplicateCourse, setDuplicateCourse] = useState<Course | null>(null)

  const vendorTypes = VENDOR_COURSE_TYPES[selectedVendor] ?? COURSE_TYPES
  const { data: levels = [], isLoading: levelsLoading } = useLevels(selectedVendor)
  const { data: courses = [], isLoading } = useCourses(
    selectedLevel ? { type: selectedType || undefined, level: selectedLevel } : undefined
  )
  const { setCourseCtx } = useTrainingStore()
  const navigate = useNavigate()

  // Auto-select first level when vendor changes or levels load
  useEffect(() => {
    if (levels.length > 0) {
      setSelectedLevel(levels[0].id)
    } else {
      setSelectedLevel(undefined)
    }
  }, [levels])

  // Auto-select the only type when vendor has just one
  useEffect(() => {
    if (vendorTypes.length === 1) {
      setSelectedType(vendorTypes[0].value)
    } else {
      setSelectedType("")
    }
  }, [selectedVendor])

  const filtered = courses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  )

  function goToTrainings(course: Course) {
    setCourseCtx({ id: course.id, uuid: course.uuid, title: course.title, status: course.status })
    navigate("/training/trainings")
  }

  return (
    <div>
      {editingCourse ? (
        <CourseForm course={editingCourse} onSuccess={() => setEditingCourse(null)} />
      ) : duplicateCourse ? (
        <>
          <p className="text-sm text-slate-500 mb-2">Duplicating: <strong>{duplicateCourse.title}</strong></p>
          <CourseForm
            course={{ ...duplicateCourse, id: 0, title: duplicateCourse.title + " (copy)" }}
            onSuccess={() => setDuplicateCourse(null)}
          />
        </>
      ) : (
        <CourseForm />
      )}

      {/* Vendor selector */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm font-medium text-slate-600">Vendor</span>
        <Select value={selectedVendor} onValueChange={v => { setSelectedVendor(v); setSelectedLevel(undefined); setSelectedType("") }}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VENDORS.map(v => (
              <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Level tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {levelsLoading ? (
          <div className="flex gap-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-8 w-20" />)}
          </div>
        ) : levels.length === 0 ? (
          <p className="text-sm text-slate-400">No levels for this vendor.</p>
        ) : (
          levels.map(l => (
            <Button
              key={l.id}
              size="sm"
              variant={selectedLevel === l.id ? "default" : "outline"}
              onClick={() => setSelectedLevel(l.id)}
            >
              {l.name}
            </Button>
          ))
        )}
      </div>

      {/* Course type filter — only show "All Types" when vendor has multiple types */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {vendorTypes.length > 1 && (
          <Button
            size="sm"
            variant={selectedType === "" ? "default" : "outline"}
            onClick={() => setSelectedType("")}
          >
            All Types
          </Button>
        )}
        {vendorTypes.map(t => (
          <Button
            key={t.value}
            size="sm"
            variant={selectedType === t.value ? "default" : "outline"}
            onClick={() => setSelectedType(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search courses..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {!selectedLevel ? (
        <p className="text-slate-400 text-sm">Select a level above to view courses.</p>
      ) : isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Level</th>
                <th className="px-4 py-2 text-left">Trainings</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(course => (
                <tr key={course.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-400">{course.index}</td>
                  <td className="px-4 py-2 font-medium">{course.title}</td>
                  <td className="px-4 py-2">
                    <Badge className={cn("text-xs", statusColor(course.status))}>
                      {course.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">{course.type}</td>
                  <td className="px-4 py-2">{course.level}</td>
                  <td className="px-4 py-2">{course.trainings_count}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => goToTrainings(course)}>
                        Trainings →
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingCourse(course)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDuplicateCourse(course)}>
                        Duplicate
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">No courses found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

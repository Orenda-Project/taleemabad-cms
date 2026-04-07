import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useCourses } from "../../hooks/useCourses"
import { useTrainingStore } from "../../store/trainingStore"
import { COURSE_TYPES } from "../../types"
import type { Course } from "../../types"
import { statusColor, cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Badge } from "../ui/badge"
import CourseForm from "./CourseForm"

export default function CourseTable() {
  const [selectedType, setSelectedType] = useState(COURSE_TYPES[0].value)
  const [search, setSearch] = useState("")
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [duplicateCourse, setDuplicateCourse] = useState<Course | null>(null)
  const { data: courses = [], isLoading } = useCourses(selectedType)
  const { setCourseCtx } = useTrainingStore()
  const navigate = useNavigate()

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

      <div className="flex gap-2 mb-4 flex-wrap">
        {COURSE_TYPES.map(t => (
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

      {isLoading ? (
        <div className="text-slate-400 text-sm">Loading...</div>
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

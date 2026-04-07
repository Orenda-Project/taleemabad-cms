import { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { useTrainingStore } from "../../store/trainingStore"
import { useMediaAssets } from "../../hooks/useMediaAssets"
import type { Training } from "../../types"

interface FormValues {
  title: string
  description: string
  index: string
  content: string
  media_asset_id: string
  tags: string
  contentTab: "text" | "asset"
}

interface Props {
  onAdded?: () => void
}

export default function TrainingForm({ onAdded }: Props) {
  const { courseCtx, addStagedTraining, stagedTrainings } = useTrainingStore()
  const { data: assets = [] } = useMediaAssets("teacher_training")
  const [open, setOpen] = useState(false)
  const { register, handleSubmit, reset, watch, setValue } = useForm<FormValues>({
    defaultValues: { contentTab: "text", index: String((stagedTrainings.length + 1)) }
  })
  const contentTab = watch("contentTab")

  if (!open) return (
    <Button variant="outline" className="mb-4" onClick={() => setOpen(true)}>
      + Add Training
    </Button>
  )

  const onSubmit = (values: FormValues) => {
    const staged: Training = {
      id: Date.now(), // temporary local ID
      uuid: crypto.randomUUID(),
      course: courseCtx!.id,
      course_uuid: courseCtx!.uuid,
      title: values.title,
      description: values.description || null,
      content: values.contentTab === "text" ? values.content || null : null,
      media_asset: values.contentTab === "asset" && values.media_asset_id
        ? assets.find(a => a.id === Number(values.media_asset_id)) ?? null
        : null,
      index: Number(values.index),
      is_grand_assessment: false,
      is_active: true,
      status: "ReadyForReview",
      tags: values.tags ? values.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      duration: 0,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      _local_status: "New",
    }
    addStagedTraining(staged)
    reset()
    setOpen(false)
    onAdded?.()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white border rounded-lg p-4 mb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Add Training</h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>✕</Button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Title</Label>
          <Input {...register("title", { required: true })} />
        </div>
        <div>
          <Label>Index</Label>
          <Input {...register("index")} type="number" />
        </div>
        <div>
          <Label>Tags (comma separated)</Label>
          <Input {...register("tags")} placeholder="FLN, GENERAL" />
        </div>
        <div className="col-span-2">
          <Label>Description</Label>
          <Textarea {...register("description")} rows={2} />
        </div>
        <div className="col-span-2">
          <div className="flex gap-2 mb-2">
            <Button type="button" size="sm"
              variant={contentTab === "text" ? "default" : "outline"}
              onClick={() => setValue("contentTab", "text")}>
              Text Content
            </Button>
            <Button type="button" size="sm"
              variant={contentTab === "asset" ? "default" : "outline"}
              onClick={() => setValue("contentTab", "asset")}>
              Media Asset
            </Button>
          </div>
          {contentTab === "text" ? (
            <Textarea {...register("content")} rows={4} placeholder="Training content..." />
          ) : (
            <select {...register("media_asset_id")} className="w-full border rounded px-3 py-2 text-sm">
              <option value="">-- Select asset --</option>
              {assets.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
              ))}
            </select>
          )}
        </div>
      </div>
      <Button type="submit">Add to Table</Button>
    </form>
  )
}

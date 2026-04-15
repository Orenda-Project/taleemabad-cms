import { useForm } from "react-hook-form"
import { useState, useMemo } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { useCreateMediaAsset, useUpdateMediaAsset } from "../../hooks/useMediaAssets"
import { useS3Upload } from "../../hooks/useS3Upload"
import { ASSET_TYPES, ASSET_CATEGORIES } from "../../types"
import type { MediaAsset } from "../../types"
import { useToast } from "../../hooks/use-toast"

interface FormValues {
  name: string
  type: string
  categories: string[]
  description: string
  url: string
  uuid: string
}

interface Props {
  asset?: MediaAsset
  onSuccess?: () => void
  onCancel?: () => void
}

export default function AssetForm({ asset, onSuccess, onCancel }: Props) {
  const create = useCreateMediaAsset()
  const update = useUpdateMediaAsset()
  const { uploadToS3, uploading, progress, error: uploadError, cancelUpload } = useS3Upload()
  const { toast } = useToast()
  // Generate UUID only once and keep it stable
  const uuid = useMemo(() => asset?.uuid ?? crypto.randomUUID(), [asset?.uuid])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    defaultValues: asset
      ? { name: asset.name, type: asset.type, categories: asset.category, description: asset.description ?? "", url: asset.url, uuid }
      : { type: "video", categories: [], uuid },
  })

  async function handleFileUpload() {
    if (!selectedFile) {
      toast({ title: "Select a file", description: "Please select a file to upload", variant: "destructive" })
      return
    }

    const s3Url = await uploadToS3(selectedFile, uuid)
    if (s3Url) {
      setValue("url", s3Url)
      toast({ title: "Upload complete", description: "File uploaded to S3" })
      setSelectedFile(null)
    } else {
      toast({ title: "Upload failed", description: uploadError || "Failed to upload file", variant: "destructive" })
    }
  }

  function validateAndSubmit(values: FormValues) {
    if (!values.url) {
      toast({ title: "Upload required", description: "Please enter the asset URL", variant: "destructive" })
      return
    }
    const filename = values.url.split("/").pop()?.split(".")[0]
    if (filename !== values.uuid) {
      toast({
        title: "UUID mismatch",
        description: `URL filename (${filename}) does not match UUID (${values.uuid})`,
        variant: "destructive",
      })
      return
    }
    doSubmit(values)
  }

  async function doSubmit(values: FormValues) {
    const payload = {
      uuid: values.uuid,
      name: values.name,
      type: values.type,
      category: values.categories,
      description: values.description,
      url: values.url,
      ...(asset ? { status: "ReadyForReview" } : {}),
    }
    try {
      if (asset) await update.mutateAsync({ id: asset.id, data: payload })
      else await create.mutateAsync(payload)
      toast({ title: asset ? "Asset updated" : "Asset created" })
      reset()
      onSuccess?.()
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message, variant: "destructive" })
    }
  }

  return (
    <form onSubmit={handleSubmit(validateAndSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Name</Label>
          <Input {...register("name", { required: true })} />
        </div>
        <div>
          <Label>Type</Label>
          <Select onValueChange={v => setValue("type", v)} defaultValue={watch("type")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ASSET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>UUID (auto-generated)</Label>
          <Input {...register("uuid")} readOnly className="bg-slate-50 text-xs" />
        </div>
        <div className="col-span-2">
          <Label>Categories</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {ASSET_CATEGORIES.map(cat => (
              <label key={cat.value} className="flex items-center gap-1 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  value={cat.value}
                  defaultChecked={asset?.category?.includes(cat.value)}
                  onChange={e => {
                    const current = watch("categories") || []
                    if (e.target.checked) setValue("categories", [...current, cat.value])
                    else setValue("categories", current.filter((c: string) => c !== cat.value))
                  }}
                />
                {cat.label}
              </label>
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <Label>Upload File to S3</Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                disabled={uploading}
                className="flex-1"
              />
              {uploading ? (
                <Button onClick={cancelUpload} variant="destructive">
                  Cancel
                </Button>
              ) : (
                <Button onClick={handleFileUpload} disabled={!selectedFile}>
                  Upload to S3
                </Button>
              )}
            </div>
            {selectedFile && !uploading && (
              <p className="text-xs text-slate-500">
                File: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)}MB)
              </p>
            )}
            {uploadError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-xs text-red-700">{uploadError}</p>
              </div>
            )}
            {uploading && (
              <div>
                <div className="w-full bg-slate-200 rounded h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-2 rounded transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Uploading... {progress}%
                </p>
              </div>
            )}
          </div>

          <Label className="mt-3 block">Asset URL (S3) - Auto-populated after upload</Label>
          <Input
            {...register("url")}
            readOnly
            className="bg-slate-50"
            placeholder={`https://asset-manager-in-review.s3.amazonaws.com/${uuid}.mp4`}
          />
          <p className="text-xs text-slate-400 mt-1">
            Select a file and click "Upload to S3". The URL will be auto-populated.
          </p>
        </div>
        <div className="col-span-2">
          <Label>Description</Label>
          <Textarea {...register("description")} rows={2} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" disabled={create.isPending || update.isPending}>
          {asset ? "Update Asset" : "Create Asset"}
        </Button>
      </div>
    </form>
  )
}

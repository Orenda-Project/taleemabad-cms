import { useState } from "react"
import { apiClient } from "../api/client"

interface PresignedResponse {
  presigned_url: string
  s3_url: string
}

export function useS3Upload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  async function uploadToS3(file: File, uuid: string): Promise<string | null> {
    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      // Step 1: Get presigned URL from backend
      const presignedResponse = await apiClient.post<PresignedResponse>(
        "/api/v1/internal/media_assets/presigned_upload_url/",
        {
          uuid,
          filename: file.name,
          content_type: file.type || "application/octet-stream",
        }
      )

      const { presigned_url, s3_url } = presignedResponse.data

      // Step 2: Upload file to S3 using presigned URL
      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100)
          setProgress(percentComplete)
        }
      })

      // Handle completion
      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener("load", () => {
          if (xhr.status === 200) {
            resolve()
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        })

        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed"))
        })

        xhr.open("PUT", presigned_url)
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
        xhr.send(file)
      })

      setProgress(100)
      setUploading(false)

      return s3_url
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || "Upload failed"
      setError(errorMsg)
      setUploading(false)
      return null
    }
  }

  return { uploadToS3, uploading, progress, error }
}

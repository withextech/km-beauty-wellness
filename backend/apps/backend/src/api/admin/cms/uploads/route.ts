import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

type UploadedFile = { buffer: Buffer; mimetype: string; originalname: string }

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const files = (req as MedusaRequest & { files?: UploadedFile[] }).files || []
  if (!files.length) throw new MedusaError(MedusaError.Types.INVALID_DATA, "No files were uploaded")

  const required = ["S3_FILE_URL", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_REGION", "S3_BUCKET", "S3_ENDPOINT"] as const
  if (!required.every((name) => process.env[name])) {
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Cloudflare R2 is not configured")
  }

  const client = new S3Client({
    region: process.env.S3_REGION!,
    endpoint: process.env.S3_ENDPOINT!,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
    forcePathStyle: true,
  })
  const baseUrl = process.env.S3_FILE_URL!.replace(/\/$/, "")
  const uploaded: Array<{ url: string; key: string }> = []

  for (const file of files) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, "-")
    const key = `cms/homepage/${Date.now()}-${crypto.randomUUID()}-${safeName}`
    await client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key, Body: file.buffer, ContentType: file.mimetype }))
    uploaded.push({ url: `${baseUrl}/${key}`, key })
  }

  res.status(200).json({ files: uploaded })
}

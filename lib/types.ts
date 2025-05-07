import { z } from "zod"

// Schema for API responses
export const ApiResponseSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    value: z.any(),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
])

export type ApiResponse = z.infer<typeof ApiResponseSchema>

// Schema for the list of schemas
export const SchemaListItemSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  updated_at: z.string(),
  created_at: z.string(),
  metadata: z.record(z.any()).optional(),
})

export type SchemaListItem = z.infer<typeof SchemaListItemSchema>
export const SchemaListSchema = z.array(SchemaListItemSchema)

// Schema for a single schema detail
export const SchemaDetailSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  updated_at: z.string(),
  created_at: z.string(),
  json: z.any(),
  metadata: z.record(z.any()).optional(),
})

export type SchemaDetail = z.infer<typeof SchemaDetailSchema>

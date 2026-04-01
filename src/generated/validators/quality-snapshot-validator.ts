import { z } from 'zod';

/**
 * Zod schema for QualitySnapshot validation
 */
export const QualitySnapshotSchema = z.object({
  id: z.string().uuid(),
  snapshotname: z.string().min(1, { message: "Snapshot Name is required" }),
  failed: z.number().int().optional(),
  passed: z.number().int().optional(),
  passrate: z.number().optional(),
  totaltests: z.number().int().optional(),
});

/**
 * Schema for creating a new QualitySnapshot (omits system-generated ID)
 */
export const CreateQualitySnapshotSchema = QualitySnapshotSchema.omit({ id: true });

/**
 * Schema for updating an existing QualitySnapshot
 */
export const UpdateQualitySnapshotSchema = QualitySnapshotSchema;

export type QualitySnapshotInput = z.infer<typeof QualitySnapshotSchema>;
export type CreateQualitySnapshotInput = z.infer<typeof CreateQualitySnapshotSchema>;
export type UpdateQualitySnapshotInput = z.infer<typeof UpdateQualitySnapshotSchema>;
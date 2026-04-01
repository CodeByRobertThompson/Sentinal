import { z } from 'zod';

/**
 * Zod schema for Task validation
 */
export const TaskSchema = z.object({
  id: z.string().uuid(),
  taskname: z.string().min(1, { message: "Task Name is required" }),
  advlatencys: z.number().optional(),
  dialogueturns: z.number().int().optional(),
  statusKey: z.enum(['StatusKey0', 'StatusKey1', 'StatusKey2']).optional(),
});

/**
 * Schema for creating a new Task (omits system-generated ID)
 */
export const CreateTaskSchema = TaskSchema.omit({ id: true });

/**
 * Schema for updating an existing Task
 */
export const UpdateTaskSchema = TaskSchema;

export type TaskInput = z.infer<typeof TaskSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
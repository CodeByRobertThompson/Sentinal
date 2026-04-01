import { z } from 'zod';

/**
 * Zod schema for Scenario validation
 */
export const ScenarioSchema = z.object({
  id: z.string().uuid(),
  scenarioname: z.string().min(1, { message: "Scenario Name is required" }),
  failed: z.number().int().optional(),
  passed: z.number().int().optional(),
  passratepercent: z.number().optional(),
  totaltests: z.number().int().optional(),
});

/**
 * Schema for creating a new Scenario (omits system-generated ID)
 */
export const CreateScenarioSchema = ScenarioSchema.omit({ id: true });

/**
 * Schema for updating an existing Scenario
 */
export const UpdateScenarioSchema = ScenarioSchema;

export type ScenarioInput = z.infer<typeof ScenarioSchema>;
export type CreateScenarioInput = z.infer<typeof CreateScenarioSchema>;
export type UpdateScenarioInput = z.infer<typeof UpdateScenarioSchema>;
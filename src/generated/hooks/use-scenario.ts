import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScenarioService } from "../services/scenario-service";
import type { Scenario } from "../models/scenario-model";
import type { IOperationOptions } from '../models/common-models';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Scenario records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, scenarioname, failed, passed, passratepercent, totaltests
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useScenarioList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["scenario-list", options],
    queryFn: () => ScenarioService.getAll(options),
  });
}

/**
 * Retrieve a single Scenario record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useScenario(id: string) {
  return useQuery({
    queryKey: ["scenario", id],
    queryFn: () => ScenarioService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Scenario record.
 */
export function useCreateScenario() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Scenario, "id">) => ScenarioService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["scenario-list"] });
    },
  });
}

/**
 * Update an existing Scenario record.
 */
export function useUpdateScenario() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Scenario, "id">>;
    }) => ScenarioService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["scenario-list"] });
      client.invalidateQueries({ queryKey: ["scenario", variables.id] });
    },
  });
}

/**
 * Delete a Scenario record by its unique identifier.
 */
export function useDeleteScenario() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ScenarioService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["scenario-list"] });
      client.invalidateQueries({ queryKey: ["scenario", id] });
    },
  });
}
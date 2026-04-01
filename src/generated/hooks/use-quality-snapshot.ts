import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QualitySnapshotService } from "../services/quality-snapshot-service";
import type { QualitySnapshot } from "../models/quality-snapshot-model";
import type { IOperationOptions } from '../models/common-models';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all QualitySnapshot records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, snapshotname, failed, passed, passrate, totaltests
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useQualitySnapshotList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["qualitySnapshot-list", options],
    queryFn: () => QualitySnapshotService.getAll(options),
  });
}

/**
 * Retrieve a single QualitySnapshot record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useQualitySnapshot(id: string) {
  return useQuery({
    queryKey: ["qualitySnapshot", id],
    queryFn: () => QualitySnapshotService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new QualitySnapshot record.
 */
export function useCreateQualitySnapshot() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<QualitySnapshot, "id">) => QualitySnapshotService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["qualitySnapshot-list"] });
    },
  });
}

/**
 * Update an existing QualitySnapshot record.
 */
export function useUpdateQualitySnapshot() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<QualitySnapshot, "id">>;
    }) => QualitySnapshotService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["qualitySnapshot-list"] });
      client.invalidateQueries({ queryKey: ["qualitySnapshot", variables.id] });
    },
  });
}

/**
 * Delete a QualitySnapshot record by its unique identifier.
 */
export function useDeleteQualitySnapshot() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => QualitySnapshotService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["qualitySnapshot-list"] });
      client.invalidateQueries({ queryKey: ["qualitySnapshot", id] });
    },
  });
}
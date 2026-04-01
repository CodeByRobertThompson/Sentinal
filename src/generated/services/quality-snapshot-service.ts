import type { QualitySnapshot } from '../models/quality-snapshot-model';

// Mock data for Vercel deployment
const mockQualitySnapshots: QualitySnapshot[] = [
  {
    id: 'qs-1',
    snapshotname: 'Q3 Release End-to-End',
    failed: 15,
    passed: 345,
    passrate: 95.8,
    totaltests: 360
  }
];

export class QualitySnapshotService {
  static async create(record: Omit<QualitySnapshot, 'id'>): Promise<QualitySnapshot> {
    const newRecord = { ...record, id: Math.random().toString() };
    mockQualitySnapshots.push(newRecord);
    return newRecord;
  }

  static async update(
    id: string,
    changedFields: Partial<Omit<QualitySnapshot, 'id'>>
  ): Promise<QualitySnapshot> {
    const index = mockQualitySnapshots.findIndex(x => x.id === id);
    if (index >= 0) {
      mockQualitySnapshots[index] = { ...mockQualitySnapshots[index], ...changedFields };
      return mockQualitySnapshots[index];
    }
    throw new Error('Not found');
  }

  static async delete(id: string): Promise<void> {
    const index = mockQualitySnapshots.findIndex(x => x.id === id);
    if (index >= 0) {
      mockQualitySnapshots.splice(index, 1);
    }
  }

  static async get(id: string): Promise<QualitySnapshot> {
    const record = mockQualitySnapshots.find(x => x.id === id);
    if (record) return record;
    throw new Error('Not found');
  }

  static async getAll(_options?: any): Promise<QualitySnapshot[]> {
    return [...mockQualitySnapshots];
  }
}
import type { Scenario } from '../models/scenario-model';

const mockScenarios: Scenario[] = [
  { id: 'sc-1', scenarioname: 'User Auth Flow', failed: 0, passed: 50, passratepercent: 100, totaltests: 50 },
  { id: 'sc-2', scenarioname: 'Checkout Process', failed: 5, passed: 95, passratepercent: 95, totaltests: 100 },
  { id: 'sc-3', scenarioname: 'Inventory Sync', failed: 10, passed: 90, passratepercent: 90, totaltests: 100 },
  { id: 'sc-4', scenarioname: 'Payment Gateway', failed: 0, passed: 110, passratepercent: 100, totaltests: 110 }
];

export class ScenarioService {
  static async create(record: Omit<Scenario, 'id'>): Promise<Scenario> {
    const newRecord = { ...record, id: Math.random().toString() };
    mockScenarios.push(newRecord);
    return newRecord;
  }

  static async update(
    id: string,
    changedFields: Partial<Omit<Scenario, 'id'>>
  ): Promise<Scenario> {
    const index = mockScenarios.findIndex(x => x.id === id);
    if (index >= 0) {
      mockScenarios[index] = { ...mockScenarios[index], ...changedFields };
      return mockScenarios[index];
    }
    throw new Error('Not found');
  }

  static async delete(id: string): Promise<void> {
    const index = mockScenarios.findIndex(x => x.id === id);
    if (index >= 0) {
      mockScenarios.splice(index, 1);
    }
  }

  static async get(id: string): Promise<Scenario> {
    const record = mockScenarios.find(x => x.id === id);
    if (record) return record;
    throw new Error('Not found');
  }

  static async getAll(_options?: any): Promise<Scenario[]> {
    return [...mockScenarios];
  }
}
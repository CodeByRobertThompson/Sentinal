import type { Task } from '../models/task-model';

import tasksData from '../../lib/tasks.json';

// @ts-ignore
const mockTasks: Task[] = tasksData;

export class TaskService {
  static async create(record: Omit<Task, 'id'>): Promise<Task> {
    const newRecord = { ...record, id: crypto.randomUUID() };
    mockTasks.push(newRecord);
    return newRecord;
  }

  static async update(
    id: string,
    changedFields: Partial<Omit<Task, 'id'>>
  ): Promise<Task> {
    const index = mockTasks.findIndex((x: any) => x.id === id);
    if (index >= 0) {
      mockTasks[index] = { ...mockTasks[index], ...changedFields };
      return mockTasks[index];
    }
    throw new Error('Not found');
  }

  static async delete(id: string): Promise<void> {
    const index = mockTasks.findIndex((x: any) => x.id === id);
    if (index >= 0) {
      mockTasks.splice(index, 1);
    }
  }

  static async get(id: string): Promise<Task> {
    const record = mockTasks.find((x: any) => x.id === id);
    if (record) return record;
    throw new Error('Not found');
  }

  static async getAll(_options?: any): Promise<Task[]> {
    return [...mockTasks];
  }
}
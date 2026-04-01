import type { Task } from '../models/task-model';

const mockTasks: Task[] = [
  { id: 't-1', taskname: 'Login via Email', advlatencys: 0.5, dialogueturns: 2, statusKey: 'StatusKey0' },
  { id: 't-2', taskname: 'Login via OAuth', advlatencys: 1.2, dialogueturns: 3, statusKey: 'StatusKey0' },
  { id: 't-3', taskname: 'Cart Total Update', advlatencys: 0.2, dialogueturns: 1, statusKey: 'StatusKey0' },
  { id: 't-4', taskname: 'Stripe Payment Request', advlatencys: 2.1, dialogueturns: 4, statusKey: 'StatusKey1' },
  { id: 't-5', taskname: 'Stock Deduct', advlatencys: 1.0, dialogueturns: 2, statusKey: 'StatusKey2' }
];

export class TaskService {
  static async create(record: Omit<Task, 'id'>): Promise<Task> {
    const newRecord = { ...record, id: Math.random().toString() };
    mockTasks.push(newRecord);
    return newRecord;
  }

  static async update(
    id: string,
    changedFields: Partial<Omit<Task, 'id'>>
  ): Promise<Task> {
    const index = mockTasks.findIndex(x => x.id === id);
    if (index >= 0) {
      mockTasks[index] = { ...mockTasks[index], ...changedFields };
      return mockTasks[index];
    }
    throw new Error('Not found');
  }

  static async delete(id: string): Promise<void> {
    const index = mockTasks.findIndex(x => x.id === id);
    if (index >= 0) {
      mockTasks.splice(index, 1);
    }
  }

  static async get(id: string): Promise<Task> {
    const record = mockTasks.find(x => x.id === id);
    if (record) return record;
    throw new Error('Not found');
  }

  static async getAll(_options?: any): Promise<Task[]> {
    return [...mockTasks];
  }
}
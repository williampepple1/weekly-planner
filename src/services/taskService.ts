import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Task } from '../types';

const COLLECTION_NAME = 'tasks';

export const taskService = {
  // Add a new task
  async addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'>, userId: string): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...task,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  // Get all tasks for a specific week
  async getTasksForWeek(weekStart: Date, userId: string): Promise<Task[]> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('createdAt', '>=', weekStart),
      where('createdAt', '<=', weekEnd),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Task[];
  },

  // Update a task
  async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    const taskRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  // Delete a task
  async deleteTask(id: string): Promise<void> {
    const taskRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(taskRef);
  },

  // Update task status (for drag and drop)
  async updateTaskStatus(id: string, status: Task['status']): Promise<void> {
    await this.updateTask(id, { status });
  },

  // Update task day (for drag and drop)
  async updateTaskDay(id: string, day: string): Promise<void> {
    await this.updateTask(id, { day });
  },
}; 
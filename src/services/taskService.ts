import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp
} from 'firebase/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Task } from '../types';

const COLLECTION_NAME = 'tasks';

export const taskService = {
  // Add a new task
  async addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'weekId'>, userId: string, weekStart: Date): Promise<string> {
    const weekId = weekStart.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...task,
      userId,
      weekId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  // Get all tasks for a user for a specific week
  async getTasksForWeek(weekStart: Date, userId: string): Promise<Task[]> {
    const weekId = weekStart.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    console.log('Fetching tasks for userId:', userId, 'weekId:', weekId);
    
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId),
        where('weekId', '==', weekId)
      );

      const querySnapshot = await getDocs(q);
      console.log('Raw Firestore response:', querySnapshot.docs.length, 'documents');
      
      const tasks = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        console.log('Task document:', doc.id, data);
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      }) as Task[];
      
      console.log('Processed tasks:', tasks.length, 'tasks');
      return tasks;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      
      // Fallback: try to get all tasks without filters and filter on client side
      console.log('Trying fallback query without filters...');
      try {
        const fallbackQuery = query(collection(db, COLLECTION_NAME));
        const fallbackSnapshot = await getDocs(fallbackQuery);
        console.log('Fallback query returned:', fallbackSnapshot.docs.length, 'documents');
        
        const fallbackTasks = fallbackSnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
          const data = doc.data();
          console.log('Fallback task document:', doc.id, data);
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          };
        }) as Task[];
        
        // Filter by userId and weekId on client side
        const userTasks = fallbackTasks.filter(task => 
          task.userId === userId && 
          (task.weekId === weekId || !task.weekId) // Include tasks without weekId for backward compatibility
        );
        console.log('Client-side filtered tasks:', userTasks.length, 'tasks');
        return userTasks;
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        return [];
      }
    }
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
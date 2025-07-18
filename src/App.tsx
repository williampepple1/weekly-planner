import React, { useState, useEffect } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import { format, startOfWeek, addDays } from 'date-fns';
import { Plus, ChevronLeft, ChevronRight, LogOut, User } from 'lucide-react';
import type { Task, WeekDay } from './types';
import { taskService } from './services/taskService';
import { authService } from './services/authService';
import type { User as FirebaseUser } from 'firebase/auth';
import TaskForm from './components/TaskForm';
import WeekView from './components/WeekView';
import LoginPage from './components/LoginPage';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Generate week days
  const generateWeekDays = (weekStart: Date): WeekDay[] => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return days.map((day, index) => ({
      name: dayNames[index],
      value: day,
      date: addDays(weekStart, index),
    }));
  };

  const weekDays = generateWeekDays(startOfWeek(currentWeek, { weekStartsOn: 1 }));

  // Handle authentication state changes
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load tasks for current week
  useEffect(() => {
    const loadTasks = async () => {
      if (!user) {
        setTasks([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
        console.log('Loading tasks for user:', user.uid, 'week start:', weekStart);
        const weekTasks = await taskService.getTasksForWeek(weekStart, user.uid);
        console.log('Loaded tasks:', weekTasks.length, 'tasks');
        setTasks(weekTasks);
      } catch (error) {
        console.error('Error loading tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [currentWeek, user]);

  // Handle drag and drop
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('Drag end event:', { active: active.id, over: over?.id });
    
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id.toString();
    
    console.log('Processing drop:', { taskId, overId });
    
    // Check if we're dropping on a droppable area (status column)
    if (overId.includes('-')) {
      // Handle the different status formats
      let day, status;
      if (overId.includes('-in-progress')) {
        day = overId.replace('-in-progress', '');
        status = 'in-progress';
      } else if (overId.includes('-todo')) {
        day = overId.replace('-todo', '');
        status = 'todo';
      } else if (overId.includes('-completed')) {
        day = overId.replace('-completed', '');
        status = 'completed';
      } else {
        // Fallback for any other format
        const [d, s] = overId.split('-');
        day = d;
        status = s;
      }
      
      console.log('Parsed drop target:', { day, status });
      
      // Find the task being dragged
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.log('Task not found:', taskId);
        return;
      }
      
      console.log('Current task state:', { day: task.day, status: task.status });
      
      // Only update if the task is being moved to a different status or day
      if (task.day === day && task.status === status) {
        console.log('No change needed');
        return;
      }
      
      try {
        console.log('Updating local state immediately...');
        // Update local state immediately for better UX (optimistic update)
        setTasks(prevTasks =>
          prevTasks.map(t =>
            t.id === taskId
              ? { ...t, day, status: status as Task['status'] }
              : t
          )
        );
        
        console.log('Updating task in Firebase...');
        // Update the task in Firebase
        await taskService.updateTaskDay(taskId, day);
        await taskService.updateTaskStatus(taskId, status as Task['status']);
        
        console.log('Task updated successfully');
      } catch (error) {
        console.error('Error updating task:', error);
        // If Firebase update fails, revert the local state
        console.log('Reverting local state due to Firebase error...');
        setTasks(prevTasks =>
          prevTasks.map(t =>
            t.id === taskId
              ? { ...t, day: task.day, status: task.status }
              : t
          )
        );
      }
    }
  };

  // Handle form submission
  const handleSubmitTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'weekId'>) => {
    if (!user) return;

    try {
      if (editingTask) {
        // Update existing task
        await taskService.updateTask(editingTask.id, taskData);
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === editingTask.id
              ? { ...task, ...taskData }
              : task
          )
        );
      } else {
        // Add new task
        const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
        const taskId = await taskService.addTask(taskData, user.uid, weekStart);
        const newTask: Task = {
          id: taskId,
          ...taskData,
          userId: user.uid,
          weekId: weekStart.toISOString().split('T')[0],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setTasks(prevTasks => [...prevTasks, newTask]);
      }
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId: string) => {
    try {
      await taskService.deleteTask(taskId);
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Handle task editing
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  // Navigate to previous week
  const goToPreviousWeek = () => {
    setCurrentWeek(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };

  // Navigate to next week
  const goToNextWeek = () => {
    setCurrentWeek(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setTasks([]);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Close form and reset editing state
  const closeForm = () => {
    setIsFormOpen(false);
    setEditingTask(null);
  };

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage onLogin={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="mb-4 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Weekly Planner</h1>
              <p className="text-sm md:text-base text-gray-600">Organize your tasks for the week</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || user.email || 'User'}
                    className="w-8 h-8 rounded-full border-2 border-gray-200"
                    title={user.displayName || user.email || 'User'}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
                    <User size={16} />
                  </div>
                )}
                <span className="hidden sm:inline">{user.displayName || user.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                title="Sign out"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 md:mb-6 gap-4">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={goToPreviousWeek}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 text-center">
              {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d')} - {format(addDays(startOfWeek(currentWeek, { weekStartsOn: 1 }), 6), 'MMM d, yyyy')}
            </h2>
            <button
              onClick={goToNextWeek}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm md:text-base"
          >
            <Plus size={16} />
            Add Task
          </button>
        </div>

        {/* Week View */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading tasks...</div>
          </div>
        ) : (
          <WeekView
            weekDays={weekDays}
            tasks={tasks}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onDragEnd={handleDragEnd}
          />
        )}

        {/* Task Form Modal */}
        <TaskForm
          isOpen={isFormOpen}
          onClose={closeForm}
          onSubmit={handleSubmitTask}
          task={editingTask}
        />
      </div>
    </div>
  );
};

export default App;

import React, { useState, useEffect } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import { format, startOfWeek, addDays } from 'date-fns';
import { Plus, ChevronLeft, ChevronRight, LogOut, User, Calendar } from 'lucide-react';
import type { Task, WeekDay } from './types';
import { taskService } from './services/taskService';
import { authService } from './services/authService';
import type { User as FirebaseUser } from 'firebase/auth';
import TaskForm from './components/TaskForm';
import WeekView from './components/WeekView';
import LoginPage from './components/LoginPage';
import DarkModeToggle from './components/DarkModeToggle';
import TodayTasksPage from './components/TodayTasksPage';

// Helper function to get current date in local timezone
const getCurrentDate = (): Date => {
  const now = new Date();
  // Create a new date using local components to avoid timezone issues
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentWeek, setCurrentWeek] = useState(getCurrentDate());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showTodayTasks, setShowTodayTasks] = useState(false);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);

  // Generate week days
  const generateWeekDays = (weekStart: Date): WeekDay[] => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
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
        console.log('Current week state:', currentWeek);
        console.log('Current date:', getCurrentDate());
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

  // Load tasks for today's page (always loads current week tasks)
  useEffect(() => {
    const loadTodayTasks = async () => {
      if (!user || !showTodayTasks) {
        setTodayTasks([]);
        return;
      }

      try {
        const actualCurrentWeek = startOfWeek(getCurrentDate(), { weekStartsOn: 1 });
        console.log('Loading today tasks for week:', actualCurrentWeek);
        const currentWeekTasks = await taskService.getTasksForWeek(actualCurrentWeek, user.uid);
        console.log('Loaded today tasks:', currentWeekTasks.length, 'tasks');
        setTodayTasks(currentWeekTasks);
      } catch (error) {
        console.error('Error loading today tasks:', error);
      }
    };

    loadTodayTasks();
  }, [user, showTodayTasks]);

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
        
        // Also update todayTasks if the task belongs to current week
        const actualCurrentWeek = startOfWeek(getCurrentDate(), { weekStartsOn: 1 });
        const currentWeekId = actualCurrentWeek.toISOString().split('T')[0];
        if (task.weekId === currentWeekId) {
          setTodayTasks(prevTasks =>
            prevTasks.map(t =>
              t.id === taskId
                ? { ...t, day, status: status as Task['status'] }
                : t
            )
          );
        }
        
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
        // Update existing task - optimistic update
        const updatedTask = { ...editingTask, ...taskData };
        
        // Update local state immediately
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === editingTask.id
              ? updatedTask
              : task
          )
        );

        // Then update in Firebase
        await taskService.updateTask(editingTask.id, taskData);
      } else {
        // Add new task - optimistic update
        const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
        const tempId = `temp-${Date.now()}`; // Temporary ID for optimistic update
        const newTask: Task = {
          id: tempId,
          ...taskData,
          userId: user.uid,
          weekId: weekStart.toISOString().split('T')[0],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Update local state immediately
        setTasks(prevTasks => [...prevTasks, newTask]);

        // Then create in Firebase
        const actualTaskId = await taskService.addTask(taskData, user.uid, weekStart);
        
        // Replace temporary task with real one
        const realTask = { ...newTask, id: actualTaskId };
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === tempId ? realTask : task
          )
        );
      }
    } catch (error) {
      console.error('Error saving task:', error);
      // TODO: Add error handling to revert optimistic updates if needed
    }
  };

  // Handle form submission from today's page (uses actual current week)
  const handleSubmitTaskFromToday = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'weekId'>) => {
    if (!user) return;

    try {
      if (editingTask) {
        // Update existing task - optimistic update
        const updatedTask = { ...editingTask, ...taskData };
        
        // Update local state immediately
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === editingTask.id
              ? updatedTask
              : task
          )
        );
        setTodayTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === editingTask.id
              ? updatedTask
              : task
          )
        );

        // Then update in Firebase
        await taskService.updateTask(editingTask.id, taskData);
      } else {
        // Add new task - optimistic update
        const actualCurrentWeek = startOfWeek(getCurrentDate(), { weekStartsOn: 1 });
        const tempId = `temp-${Date.now()}`; // Temporary ID for optimistic update
        const newTask: Task = {
          id: tempId,
          ...taskData,
          userId: user.uid,
          weekId: actualCurrentWeek.toISOString().split('T')[0],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Update local state immediately
        setTasks(prevTasks => [...prevTasks, newTask]);
        setTodayTasks(prevTasks => [...prevTasks, newTask]);

        // Then create in Firebase
        const actualTaskId = await taskService.addTask(taskData, user.uid, actualCurrentWeek);
        
        // Replace temporary task with real one
        const realTask = { ...newTask, id: actualTaskId };
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === tempId ? realTask : task
          )
        );
        setTodayTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === tempId ? realTask : task
          )
        );
      }
    } catch (error) {
      console.error('Error saving task:', error);
      // TODO: Add error handling to revert optimistic updates if needed
    }
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId: string) => {
    try {
      await taskService.deleteTask(taskId);
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      setTodayTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage onLogin={() => {}} />;
  }

  // Show today's tasks page
  if (showTodayTasks) {
    return (
      <TodayTasksPage
        tasks={todayTasks}
        onDeleteTask={handleDeleteTask}
        onBack={() => setShowTodayTasks(false)}
        onSubmitTask={handleSubmitTaskFromToday}
        onDragEnd={handleDragEnd}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="mb-4 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">Weekly Planner</h1>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">Organize your tasks for the week</p>
            </div>
            <div className="flex items-center gap-3">
              <DarkModeToggle />
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || user.email || 'User'}
                    className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-600"
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
                className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                title="Sign out"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Today's Tasks Button */}
        <div className="mb-4 md:mb-6">
          <button
            onClick={() => setShowTodayTasks(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm md:text-base"
          >
            <Calendar size={16} />
            Check Today's Tasks
          </button>
        </div>

        {/* Week Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 md:mb-6 gap-4">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={goToPreviousWeek}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white text-center">
              {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d')} - {format(addDays(startOfWeek(currentWeek, { weekStartsOn: 1 }), 6), 'MMM d, yyyy')}
            </h2>
            <button
              onClick={goToNextWeek}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
            <div className="text-gray-500 dark:text-gray-400">Loading tasks...</div>
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

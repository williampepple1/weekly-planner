import React, { useState } from 'react';
import { format, startOfWeek } from 'date-fns';
import { ArrowLeft, Calendar, Plus } from 'lucide-react';
import { 
  DndContext, 
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import type { Task } from '../types';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';

// Helper function to get current date in local timezone
const getCurrentDate = (): Date => {
  const now = new Date();
  // Create a new date using local components to avoid timezone issues
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

interface TodayTasksPageProps {
  tasks: Task[];
  onDeleteTask: (id: string) => void;
  onBack: () => void;
  onSubmitTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'weekId'>) => void;
  onDragEnd: (event: DragEndEvent) => void;
}

const TodayTasksPage: React.FC<TodayTasksPageProps> = ({ 
  tasks, 
  onDeleteTask, 
  onBack,
  onSubmitTask,
  onDragEnd
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  
  const today = getCurrentDate();
  const todayName = format(today, 'EEEE'); // Full day name
  const todayDate = format(today, 'MMMM d, yyyy'); // Full date
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday start
  const currentWeekId = currentWeekStart.toISOString().split('T')[0]; // YYYY-MM-DD format

  console.log('TodayTasksPage - Today:', today);
  console.log('TodayTasksPage - Today name:', todayName);
  console.log('TodayTasksPage - Today date:', todayDate);
  console.log('TodayTasksPage - Current week start:', currentWeekStart);
  console.log('TodayTasksPage - Current week ID:', currentWeekId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Get today's tasks based on the day name (lowercase) and current week
  const todayTasks = tasks.filter(task => 
    task.day.toLowerCase() === todayName.toLowerCase() &&
    task.weekId === currentWeekId
  );

  console.log('TodayTasksPage - Today tasks found:', todayTasks.length);
  console.log('TodayTasksPage - All tasks:', tasks.length);

  // Group tasks by status
  const tasksByStatus = {
    todo: todayTasks.filter(task => task.status === 'todo'),
    'in-progress': todayTasks.filter(task => task.status === 'in-progress'),
    completed: todayTasks.filter(task => task.status === 'completed'),
  };

  const totalTasks = todayTasks.length;
  const completedTasks = tasksByStatus.completed.length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleAddTask = () => {
    setEditingTask(null);
    setIsFormOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTask(null);
  };

  const handleSubmitTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'weekId'>) => {
    // If it's a new task (not editing), set the day to today and ensure it's for the current week
    const taskWithToday = editingTask ? taskData : {
      ...taskData,
      day: todayName.toLowerCase()
    };
    
    console.log('TodayTasksPage - Submitting task:', taskWithToday);
    onSubmitTask(taskWithToday);
    handleCloseForm();
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    onDragEnd(event);
  };

  const handleDragCancel = () => {
    setActiveTask(null);
  };

  // DroppableZone component for each status column
  const DroppableZone: React.FC<{
    id: string;
    title: string;
    tasks: Task[];
  }> = ({ id, title, tasks }) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-3 md:p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
            {tasks.length} tasks
          </p>
        </div>
        <div 
          ref={setNodeRef}
          className={`p-3 md:p-4 min-h-[120px] md:min-h-[200px] transition-colors ${
            isOver 
              ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-600' 
              : ''
          }`}
        >
          {tasks.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm text-center py-3 md:py-4">
              {title === 'To Do' && 'No tasks to do'}
              {title === 'In Progress' && 'No tasks in progress'}
              {title === 'Completed' && 'No completed tasks'}
            </p>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={handleEditTask}
                  onDelete={onDeleteTask}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[restrictToWindowEdges]}
    >
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-4 md:py-8">
          {/* Header */}
          <div className="mb-4 md:mb-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors mb-4"
            >
              <ArrowLeft size={20} />
              <span className="text-sm md:text-base">Back to Weekly View</span>
            </button>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary-600 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                    Today's Tasks
                  </h1>
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                    {todayName}, {todayDate}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleAddTask}
                className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm md:text-base w-full sm:w-auto"
              >
                <Plus size={16} />
                Add Task
              </button>
            </div>

            {/* Progress Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 md:p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Progress
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {completedTasks} of {totalTasks} completed
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {progressPercentage}% complete
              </p>
            </div>
          </div>

          {/* Tasks by Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <DroppableZone
              id={`${todayName.toLowerCase()}-todo`}
              title="To Do"
              tasks={tasksByStatus.todo}
            />
            <DroppableZone
              id={`${todayName.toLowerCase()}-in-progress`}
              title="In Progress"
              tasks={tasksByStatus['in-progress']}
            />
            <DroppableZone
              id={`${todayName.toLowerCase()}-completed`}
              title="Completed"
              tasks={tasksByStatus.completed}
            />
          </div>

          {/* Empty State */}
          {totalTasks === 0 && (
            <div className="text-center py-8 md:py-12">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-3 md:p-4 w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 flex items-center justify-center">
                <Calendar className="h-6 w-6 md:h-8 md:w-8 text-gray-400" />
              </div>
              <h3 className="text-base md:text-lg font-medium text-gray-900 dark:text-white mb-2">
                No tasks for today
              </h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-4">
                You're all caught up! Add some tasks to get started.
              </p>
              <button
                onClick={handleAddTask}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors mx-auto text-sm md:text-base"
              >
                <Plus size={16} />
                Add Your First Task
              </button>
            </div>
          )}

          {/* Task Form Modal */}
          <TaskForm
            isOpen={isFormOpen}
            onClose={handleCloseForm}
            onSubmit={handleSubmitTask}
            task={editingTask}
            hideDayField={!editingTask} // Hide day field only when adding new tasks, not when editing
          />

          <DragOverlay>
            {activeTask ? (
              <TaskCard
                task={activeTask}
                onEdit={handleEditTask}
                onDelete={onDeleteTask}
              />
            ) : null}
          </DragOverlay>
        </div>
      </div>
    </DndContext>
  );
};

export default TodayTasksPage; 
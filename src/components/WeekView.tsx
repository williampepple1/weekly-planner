import React from 'react';
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
import type { Task, WeekDay } from '../types';
import TaskCard from './TaskCard';
import { format } from 'date-fns';

interface WeekViewProps {
  weekDays: WeekDay[];
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
}

const WeekView: React.FC<WeekViewProps> = ({ 
  weekDays, 
  tasks, 
  onEditTask, 
  onDeleteTask,
  onDragEnd 
}) => {
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // DroppableZone component for each status column
  const DroppableZone: React.FC<{
    id: string;
    title: string;
    tasks: Task[];
  }> = ({ id, title, tasks }) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    
    return (
      <div>
        <h4 className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{title}</h4>
        <div 
          ref={setNodeRef}
          className={`min-h-[80px] md:min-h-[100px] p-2 rounded-md transition-colors ${
            isOver 
              ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-600' 
              : 'bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600'
          }`}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </div>
      </div>
    );
  };

  const getTasksForDay = (dayValue: string) => {
    return tasks.filter(task => task.day === dayValue);
  };

  const getDayTasksByStatus = (dayValue: string) => {
    const dayTasks = getTasksForDay(dayValue);
    return {
      todo: dayTasks.filter(task => task.status === 'todo'),
      'in-progress': dayTasks.filter(task => task.status === 'in-progress'),
      completed: dayTasks.filter(task => task.status === 'completed'),
    };
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[restrictToWindowEdges]}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayTasks = getDayTasksByStatus(day.value);
          
          return (
            <div key={day.value} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-3 md:p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">{day.name}</h3>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{format(day.date, 'MMM d')}</p>
              </div>
              
              <div className="p-3 md:p-4 space-y-3 md:space-y-4">
                <DroppableZone
                  id={`${day.value}-todo`}
                  title="To Do"
                  tasks={dayTasks.todo}
                />
                <DroppableZone
                  id={`${day.value}-in-progress`}
                  title="In Progress"
                  tasks={dayTasks['in-progress']}
                />
                <DroppableZone
                  id={`${day.value}-completed`}
                  title="Completed"
                  tasks={dayTasks.completed}
                />
              </div>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <TaskCard
            task={activeTask}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default WeekView; 
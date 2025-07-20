import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useDarkMode } from '../contexts/DarkModeContext';

const DarkModeToggle: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <button
      onClick={toggleDarkMode}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
      style={{
        backgroundColor: isDarkMode ? '#3b82f6' : '#d1d5db',
      }}
      aria-label="Toggle dark mode"
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          isDarkMode ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
      <div className="absolute inset-0 flex items-center justify-between px-1">
        <Sun 
          size={12} 
          className={`text-yellow-500 transition-opacity ${
            isDarkMode ? 'opacity-0' : 'opacity-100'
          }`} 
        />
        <Moon 
          size={12} 
          className={`text-blue-300 transition-opacity ${
            isDarkMode ? 'opacity-100' : 'opacity-0'
          }`} 
        />
      </div>
    </button>
  );
};

export default DarkModeToggle; 
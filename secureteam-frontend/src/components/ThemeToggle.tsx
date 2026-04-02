import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { cn } from '../utils/cn';

export const ThemeToggle = ({ isSidebarOpen }: { isSidebarOpen: boolean }) => {
  const { isDark, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full text-left hover:bg-slate-900/50 group",
        isDark ? "hover:text-yellow-400 text-slate-400" : "hover:bg-slate-100 hover:text-slate-700 text-slate-500"
      )}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? (
        <Sun className="w-5 h-5 flex-shrink-0 text-yellow-500" />
      ) : (
        <Moon className="w-5 h-5 flex-shrink-0 text-slate-500 group-hover:text-slate-700" />
      )}
      {isSidebarOpen && (
        <span className="font-medium text-sm">
          {isDark ? 'Light' : 'Dark'} Mode
        </span>
      )}
    </button>
  );
};

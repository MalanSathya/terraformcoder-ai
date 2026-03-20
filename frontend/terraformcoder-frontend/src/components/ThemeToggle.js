import React, { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <label
      htmlFor="theme-toggle"
      className="flex items-center space-x-3 cursor-pointer select-none"
    >
      <div className="relative">
        {/* Hidden Checkbox */}
        <input
          type="checkbox"
          id="theme-toggle"
          className="sr-only"
          checked={theme === 'dark'}
          onChange={toggleTheme}
        />

        {/* Toggle Background */}
        <div
          className={`block w-14 h-8 rounded-full transition-colors duration-500 ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
          }`}
        ></div>

        {/* Toggle Thumb */}
        <div
          className={`dot absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-all duration-500 ease-in-out ${
            theme === 'dark' ? 'translate-x-6' : ''
          }`}
        ></div>
      </div>

      {/* Theme Icon */}
      <div className="text-gray-700 dark:text-gray-300 transition-colors duration-500">
        {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
      </div>
    </label>
  );
};

export default ThemeToggle;


// import React, { useContext } from 'react';
// import { ThemeContext } from '../context/ThemeContext';
// import { Sun, Moon } from 'lucide-react'; // Import icons

// const ThemeToggle = () => {
//   const { theme, toggleTheme } = useContext(ThemeContext);

//   return (
//     <label htmlFor="theme-toggle" className="flex items-center cursor-pointer">
//       <div className="relative">
//         <input
//           type="checkbox"
//           id="theme-toggle"
//           className="sr-only" // Hide checkbox visually
//           checked={theme === 'dark'}
//           onChange={toggleTheme}
//         />
//         <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
//         <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition"></div>
//       </div>
//       <div className="ml-3 text-gray-700 dark:text-gray-300 font-medium">
//         {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
//       </div>
//     </label>
//   );
// };

// export default ThemeToggle;
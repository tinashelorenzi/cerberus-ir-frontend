import React, { useState } from 'react';
import config from '../../config/env';

const FloatingToolbox = () => {
  const [showToolbox, setShowToolbox] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Toolbox Links */}
      {showToolbox && (
        <div className="mb-4 space-y-2">
          {config.EXTERNAL_TOOLS.map((tool, index) => (
            <div
              key={tool.name}
              className="transform transition-all duration-300 ease-out"
              style={{
                animationDelay: `${index * 100}ms`,
                transform: showToolbox ? 'translateX(0) scale(1)' : 'translateX(100px) scale(0.8)',
                opacity: showToolbox ? 1 : 0
              }}
            >
              <a
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
                onClick={() => setShowToolbox(false)}
              >
                <i className={`${tool.icon} mr-3 text-lg`}></i>
                <span className="font-medium">{tool.name}</span>
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Main Toolbox Button */}
      <button
        onClick={() => setShowToolbox(!showToolbox)}
        className={`w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-xl flex items-center justify-center ${
          showToolbox ? 'rotate-45 bg-red-600 hover:bg-red-700' : ''
        }`}
        title={showToolbox ? 'Close Toolbox' : 'Open Toolbox'}
      >
        <i className={`fas ${showToolbox ? 'fa-times' : 'fa-tools'} text-xl`}></i>
      </button>
    </div>
  );
};

export default FloatingToolbox;

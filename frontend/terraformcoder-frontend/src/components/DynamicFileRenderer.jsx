import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, Copy, FileTextIcon, FolderIcon, CodeIcon, PlayIcon, ServerIcon, DatabaseIcon, NetworkIcon, CogIcon } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import GlassCard from './GlassCard';

const DynamicFileRenderer = ({ files, onCopy }) => {
  const [expandedFiles, setExpandedFiles] = useState(new Set());
  const [expandedExplanations, setExpandedExplanations] = useState(new Set());

  const toggleFileExpansion = (filename) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename);
    } else {
      newExpanded.add(filename);
    }
    setExpandedFiles(newExpanded);
  };

  const toggleExplanationExpansion = (filename) => {
    const newExpanded = new Set(expandedExplanations);
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename);
    } else {
      newExpanded.add(filename);
    }
    setExpandedExplanations(newExpanded);
  };

  const getFileIcon = (fileType, category) => {
    if (fileType === 'terraform') {
      switch (category) {
        case 'compute': return ServerIcon;
        case 'network': return NetworkIcon;
        case 'database': return DatabaseIcon;
        default: return CodeIcon;
      }
    } else if (fileType === 'ansible') {
      return PlayIcon;
    }
    return FileTextIcon;
  };

  const getFileTypeColor = (fileType, category) => {
    if (fileType === 'terraform') {
      switch (category) {
        case 'compute': return 'from-blue-400 to-blue-600';
        case 'network': return 'from-green-400 to-green-600';
        case 'database': return 'from-purple-400 to-purple-600';
        case 'automation': return 'from-orange-400 to-orange-600';
        default: return 'from-cyan-400 to-cyan-600';
      }
    } else if (fileType === 'ansible') {
      return 'from-red-400 to-red-600';
    }
    return 'from-gray-400 to-gray-600';
  };

  const getSyntaxLanguage = (filename) => {
    if (filename.endsWith('.tf') || filename.endsWith('.tfvars')) {
      return 'hcl';
    } else if (filename.endsWith('.yml') || filename.endsWith('.yaml')) {
      return 'yaml';
    } else if (filename.endsWith('.json')) {
      return 'json';
    } else if (filename.endsWith('.sh')) {
      return 'bash';
    }
    return 'text';
  };

  const handleCopyFile = (content) => {
    if (onCopy) {
      onCopy(content);
    } else {
      navigator.clipboard.writeText(content);
    }
  };

  if (!files || files.length === 0) {
    return null;
  }

  // Group files by category for better organization
  const groupedFiles = files.reduce((acc, file) => {
    if (!acc[file.category]) {
      acc[file.category] = [];
    }
    acc[file.category].push(file);
    return acc;
  }, {});

  const categoryOrder = ['infrastructure', 'compute', 'network', 'database', 'automation'];
  const sortedCategories = Object.keys(groupedFiles).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-4">
        <FolderIcon className="w-6 h-6 text-emerald-400" />
        <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
          Generated Files
        </h3>
        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-medium border border-emerald-500/30">
          {files.length} files
        </span>
      </div>

      {sortedCategories.map((category) => (
        <div key={category} className="space-y-4">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            <h4 className="text-lg font-semibold text-slate-200 capitalize">
              {category} Components
            </h4>
          </div>

          {groupedFiles[category].map((file, index) => {
            const Icon = getFileIcon(file.file_type, file.category);
            const isFileExpanded = expandedFiles.has(file.filename);
            const isExplanationExpanded = expandedExplanations.has(file.filename);
            const colorClass = getFileTypeColor(file.file_type, file.category);

            return (
              <GlassCard key={`${file.filename}-${index}`} className="overflow-hidden">
                {/* File Header */}
                <div 
                  className="flex items-center justify-between cursor-pointer p-4"
                  onClick={() => toggleFileExpansion(file.filename)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 bg-gradient-to-r ${colorClass} rounded-lg flex items-center justify-center shadow-lg`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-slate-200 font-mono text-sm">
                        {file.filename}
                      </h5>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded text-xs">
                          {file.file_type}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded text-xs">
                          {file.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyFile(file.content);
                      }}
                      className="p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-white transition-all duration-200"
                      title="Copy file content"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {isFileExpanded ? 
                      <ChevronUpIcon className="w-5 h-5 text-slate-400" /> : 
                      <ChevronDownIcon className="w-5 h-5 text-slate-400" />
                    }
                  </div>
                </div>

                {/* File Content */}
                {isFileExpanded && (
                  <div className="border-t border-slate-700/30">
                    {/* Code Section */}
                    <div className="relative">
                      <SyntaxHighlighter
                        language={getSyntaxLanguage(file.filename)}
                        style={oneDark}
                        customStyle={{
                          margin: 0,
                          borderRadius: 0,
                          background: 'rgba(15, 23, 42, 0.8)',
                          fontSize: '0.875rem',
                          lineHeight: '1.5'
                        }}
                        showLineNumbers={true}
                        wrapLines={true}
                      >
                        {file.content}
                      </SyntaxHighlighter>
                    </div>

                    {/* Explanation Section */}
                    <div className="p-4 bg-slate-800/30 border-t border-slate-700/30">
                      <div 
                        className="flex items-center justify-between cursor-pointer mb-2"
                        onClick={() => toggleExplanationExpansion(file.filename)}
                      >
                        <div className="flex items-center space-x-2">
                          <CogIcon className="w-4 h-4 text-purple-400" />
                          <h6 className="font-medium text-slate-200">File Explanation</h6>
                        </div>
                        {isExplanationExpanded ? 
                          <ChevronUpIcon className="w-4 h-4 text-slate-400" /> : 
                          <ChevronDownIcon className="w-4 h-4 text-slate-400" />
                        }
                      </div>
                      
                      {isExplanationExpanded && (
                        <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/30">
                          <p className="text-slate-300 text-sm leading-relaxed">
                            {file.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default DynamicFileRenderer;
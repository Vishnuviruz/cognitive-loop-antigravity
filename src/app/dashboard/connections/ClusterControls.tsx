import React, { useState } from 'react';

interface ClusterControlsProps {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onClusterToggle: (enabled: boolean) => void;
}

export const ClusterControls: React.FC<ClusterControlsProps> = ({
  totalItems,
  currentPage,
  pageSize,
  pageSizeOptions = [1, 2, 5, 10, 20],
  onPageChange,
  onPageSizeChange,
  onClusterToggle,
}) => {
  const [isClustered, setIsClustered] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const handlePrev = () => {
    const newPage = Math.max(1, currentPage - 1);
    onPageChange(newPage);
  };
  const handleNext = () => {
    const newPage = Math.min(totalPages, currentPage + 1);
    onPageChange(newPage);
  };
  const handleSizeSelect = (size: number) => {
    onPageSizeChange(size);
  };
  const toggleCluster = () => {
    const newVal = !isClustered;
    setIsClustered(newVal);
    onClusterToggle(newVal);
  };

  return (
    <div className="flex items-center space-x-3">
      {/* Cluster Toggle Button */}
      <button
        onClick={toggleCluster}
        className={`h-[38px] px-4 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
          isClustered 
            ? 'bg-indigo-650 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
            : 'bg-zinc-900/60 text-zinc-400 border-zinc-800/80 hover:bg-zinc-800/40 hover:text-zinc-200'
        }`}
      >
        <span>{isClustered ? 'Show Raw' : 'Cluster'}</span>
        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded font-mono ${
          isClustered 
            ? 'bg-emerald-500/25 text-emerald-350 border border-emerald-500/20'
            : 'bg-zinc-800 text-zinc-550 border border-zinc-700'
        }`}>
          {isClustered ? 'ON' : 'OFF'}
        </span>
      </button>

      {/* Pagination Controls */}
      <div className="flex items-center space-x-1 bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-1 h-[38px]">
        <button
          onClick={handlePrev}
          disabled={currentPage <= 1}
          className="h-7 w-7 flex items-center justify-center rounded-lg bg-zinc-900/60 border border-zinc-800/80 hover:bg-zinc-800/60 text-zinc-400 disabled:opacity-20 disabled:hover:bg-zinc-900/60 transition-all cursor-pointer font-bold text-xs"
        >
          ‹
        </button>
        <span className="text-xs text-zinc-400 px-2 min-w-[45px] text-center select-none font-medium">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          className="h-7 w-7 flex items-center justify-center rounded-lg bg-zinc-900/60 border border-zinc-800/80 hover:bg-zinc-800/60 text-zinc-400 disabled:opacity-20 disabled:hover:bg-zinc-900/60 transition-all cursor-pointer font-bold text-xs"
        >
          ›
        </button>
      </div>

      {/* Custom Page Size Selector (Dropdown style) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="h-[38px] bg-zinc-900/60 border border-zinc-800/80 text-zinc-300 text-xs rounded-xl px-4 pr-8 focus:outline-none transition-all cursor-pointer flex items-center justify-between min-w-[120px]"
        >
          <span>{pageSize} per page</span>
          <svg className="h-3 w-3 fill-none stroke-current text-zinc-400 ml-2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {dropdownOpen && (
          <>
            {/* Click-out backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
            
            {/* Popover options list */}
            <div className="absolute right-0 top-full mt-1.5 z-50 w-full min-w-[120px] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl py-1 backdrop-blur-md overflow-hidden">
              {pageSizeOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    handleSizeSelect(opt);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-zinc-900 text-xs transition-colors cursor-pointer ${
                    opt === pageSize ? 'text-indigo-400 font-semibold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {opt} per page
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

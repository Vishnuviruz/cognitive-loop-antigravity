import React, { useState } from 'react';

interface ClusterControlsProps {
  totalItems: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number, pageSize: number) => void;
  onClusterToggle: (enabled: boolean) => void;
}

export const ClusterControls: React.FC<ClusterControlsProps> = ({
  totalItems,
  pageSizeOptions = [5, 10, 20],
  onPageChange,
  onClusterToggle,
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0]);
  const [isClustered, setIsClustered] = useState(false);

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const handlePrev = () => {
    const newPage = Math.max(1, page - 1);
    setPage(newPage);
    onPageChange(newPage, pageSize);
  };
  const handleNext = () => {
    const newPage = Math.min(totalPages, page + 1);
    setPage(newPage);
    onPageChange(newPage, pageSize);
  };
  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(e.target.value);
    setPageSize(newSize);
    setPage(1);
    onPageChange(1, newSize);
  };
  const toggleCluster = () => {
    const newVal = !isClustered;
    setIsClustered(newVal);
    onClusterToggle(newVal);
  };

  return (
    <div className="flex items-center space-x-4">
      {/* Cluster Toggle Button */}
      <button
        onClick={toggleCluster}
        className={`h-[38px] px-4 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
          isClustered 
            ? 'bg-indigo-650 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
            : 'bg-zinc-900/60 text-zinc-300 border-zinc-850 hover:bg-zinc-800/60 hover:text-white'
        }`}
      >
        {isClustered ? 'Show Raw' : 'Cluster'}
      </button>

      {/* Pagination Controls */}
      <div className="flex items-center space-x-2 bg-zinc-900/40 border border-zinc-850/40 rounded-xl p-1 h-[38px]">
        <button
          onClick={handlePrev}
          disabled={page <= 1}
          className="h-7 w-7 flex items-center justify-center rounded-lg bg-zinc-900/60 border border-zinc-850 hover:bg-zinc-800/60 text-zinc-350 disabled:opacity-30 disabled:hover:bg-zinc-900/60 transition-all cursor-pointer font-bold text-xs"
        >
          ‹
        </button>
        <span className="text-xs text-zinc-400 px-2 min-w-[50px] text-center select-none">
          {page} / {totalPages}
        </span>
        <button
          onClick={handleNext}
          disabled={page >= totalPages}
          className="h-7 w-7 flex items-center justify-center rounded-lg bg-zinc-900/60 border border-zinc-850 hover:bg-zinc-800/60 text-zinc-350 disabled:opacity-30 disabled:hover:bg-zinc-900/60 transition-all cursor-pointer font-bold text-xs"
        >
          ›
        </button>
      </div>

      {/* Page Size Selector */}
      <div className="flex items-center space-x-2">
        <select
          value={pageSize}
          onChange={handleSizeChange}
          className="h-[38px] bg-zinc-900/60 border border-zinc-850 text-zinc-300 text-xs rounded-xl px-3 focus:outline-none transition-all cursor-pointer"
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt} per page
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

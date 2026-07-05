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
    <div className="flex items-center space-x-3">
      {/* Cluster Toggle Button */}
      <button
        onClick={toggleCluster}
        className={`h-[38px] px-4 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
          isClustered 
            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-650/10'
            : 'bg-zinc-900/60 text-zinc-400 border-zinc-800/80 hover:bg-zinc-800/40 hover:text-zinc-200'
        }`}
      >
        {isClustered ? 'Show Raw' : 'Cluster'}
      </button>

      {/* Pagination Controls */}
      <div className="flex items-center space-x-1 bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-1 h-[38px]">
        <button
          onClick={handlePrev}
          disabled={page <= 1}
          className="h-7 w-7 flex items-center justify-center rounded-lg bg-zinc-900/60 border border-zinc-800/80 hover:bg-zinc-800/60 text-zinc-400 disabled:opacity-20 disabled:hover:bg-zinc-900/60 transition-all cursor-pointer font-bold text-xs"
        >
          ‹
        </button>
        <span className="text-xs text-zinc-400 px-2 min-w-[45px] text-center select-none font-medium">
          {page} / {totalPages}
        </span>
        <button
          onClick={handleNext}
          disabled={page >= totalPages}
          className="h-7 w-7 flex items-center justify-center rounded-lg bg-zinc-900/60 border border-zinc-800/80 hover:bg-zinc-800/60 text-zinc-400 disabled:opacity-20 disabled:hover:bg-zinc-900/60 transition-all cursor-pointer font-bold text-xs"
        >
          ›
        </button>
      </div>

      {/* Page Size Selector */}
      <div className="relative">
        <select
          value={pageSize}
          onChange={handleSizeChange}
          className="h-[38px] bg-zinc-900/60 border border-zinc-800/80 text-zinc-455 text-xs rounded-xl px-3 pr-8 focus:outline-none transition-all cursor-pointer appearance-none min-w-[110px]"
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt} className="bg-zinc-950 text-zinc-300">
              {opt} per page
            </option>
          ))}
        </select>
        {/* Custom chevron to avoid native double outline issues */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500">
          <svg className="h-3 w-3 fill-none stroke-current" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

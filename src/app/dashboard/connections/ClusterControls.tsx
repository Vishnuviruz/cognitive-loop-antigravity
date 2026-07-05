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

  const totalPages = Math.ceil(totalItems / pageSize);

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
    <div className="flex items-center space-x-4 mb-4">
      <button
        className="px-3 py-1 rounded bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/40"
        onClick={toggleCluster}
      >
        {isClustered ? 'Show Raw' : 'Cluster'}
      </button>
      <div className="flex items-center space-x-2">
        <label className="text-xs text-zinc-400">Page:</label>
        <button
          className="px-2 py-0.5 rounded bg-zinc-800/50 text-zinc-300 disabled:opacity-50"
          onClick={handlePrev}
          disabled={page <= 1}
        >
          ‹
        </button>
        <span className="text-xs text-zinc-300">{page}/{totalPages}</span>
        <button
          className="px-2 py-0.5 rounded bg-zinc-800/50 text-zinc-300 disabled:opacity-50"
          onClick={handleNext}
          disabled={page >= totalPages}
        >
          ›
        </button>
      </div>
      <div className="flex items-center space-x-2">
        <label className="text-xs text-zinc-400">Per page:</label>
        <select
          value={pageSize}
          onChange={handleSizeChange}
          className="bg-zinc-800/50 text-zinc-200 text-xs rounded px-1 py-0.5"
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

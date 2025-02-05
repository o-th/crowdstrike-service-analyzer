import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUpDown } from 'lucide-react';

interface ProcessedRow {
  Source: string;
  'Source Name': string;
  IP: string;
  Service: string;
  Target: string;
  Time: string;
  freq: number;
}

interface VirtualizedTableProps {
  results: ProcessedRow[];
  filteredAndSortedResults: ProcessedRow[];
  handleSort: (key: keyof ProcessedRow) => void;
}

const VirtualizedTable: React.FC<VirtualizedTableProps> = React.memo(({ 
  filteredAndSortedResults, 
  handleSort 
}) => {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredAndSortedResults.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 45,
    overscan: 5
  });

  const columnWidths = {
    Source: '100px',
    'Source Name': '150px',
    IP: '130px',
    Service: '180px',
    Target: '180px',
    Time: '120px',
    freq: '80px'
  };

  // Handle empty results
  if (!filteredAndSortedResults.length) {
    return (
      <div className="border rounded-lg p-8 text-center text-gray-500">
        No results found for your search criteria
      </div>
    );
  }

  return (
    <div className="border rounded-lg h-full overflow-hidden">
      <div className="overflow-x-auto h-full">
        <div style={{ minWidth: '940px' }} className="h-full relative">
          {/* Header */}
          <div className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <div className="flex w-full">
              {(Object.keys(columnWidths) as Array<keyof typeof columnWidths>).map((key) => (
                <div
                  key={key}
                  className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  style={{ width: columnWidths[key] }}
                  onClick={() => handleSort(key)}
                >
                  <div className="flex items-center gap-1">
                    {key === 'Time' ? 'Time (PST)' : key}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Virtualized Body */}
          <div
            ref={parentRef}
            className="overflow-y-auto h-[calc(100vh-500px)] min-h-[400px]"
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative'
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = filteredAndSortedResults[virtualRow.index];
                return (
                  <div
                    key={virtualRow.index}
                    className="absolute top-0 left-0 flex hover:bg-gray-50 border-b border-gray-200"
                    style={{
                      height: virtualRow.size,
                      transform: `translateY(${virtualRow.start}px)`,
                      width: '100%'
                    }}
                  >
                    {(Object.keys(columnWidths) as Array<keyof typeof columnWidths>).map((key) => (
                      <div
                        key={key}
                        className={`p-3 text-sm text-gray-500 whitespace-nowrap ${
                          key === 'freq' ? 'text-right' : ''
                        }`}
                        style={{ 
                          width: columnWidths[key],
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {row[key].toString()}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

VirtualizedTable.displayName = 'VirtualizedTable';

export default VirtualizedTable;

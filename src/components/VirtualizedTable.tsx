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
    Source: '10%',
    'Source Name': '15%',
    IP: '15%',
    Service: '20%',
    Target: '20%',
    Time: '12%',
    freq: '8%'
  };

  return (
    <div className="border rounded-lg h-full">
      <div className="overflow-hidden h-full">
        <div className="min-w-full h-full">
          {/* Header */}
          <div className="bg-gray-50 border-b border-gray-200">
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
            className="overflow-auto h-[calc(100vh-500px)] min-h-[400px]"
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

import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import { Select } from './ui/select';
import Papa from 'papaparse';
import _ from 'lodash';
import { Upload, Download, Check, Search, RotateCcw, Info, X } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import VirtualizedTable from './VirtualizedTable.tsx';

// Lazy load the dashboard component
const CrowdStrikeDashboard = lazy(() => import('./CrowdStrikeDashboard'));

interface CrowdStrikeRow {
  Timestamp: string;
  Source: string;
  'Source Name': string;
  IP: string;
  Service: string;
  Target: string;
  time_group?: string;
}

interface ProcessedRow {
  Source: string;
  'Source Name': string;
  IP: string;
  Service: string;
  Target: string;
  Time: string;
  freq: number;
}

interface SortConfig {
  key: keyof ProcessedRow;
  direction: 'asc' | 'desc';
}

interface DateRange {
  startDate: string;
  endDate: string;
}

const CrowdStrikeAnalyzer: React.FC = () => {
  const [results, setResults] = useState<ProcessedRow[] | null>(null);
  const [showSelector, setShowSelector] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ 
    key: 'freq', 
    direction: 'desc' 
  });
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: ''
  });
  const [rawData, setRawData] = useState<CrowdStrikeRow[]>([]);
  const [currentFile, setCurrentFile] = useState<string>('');
  const [dateConstraints, setDateConstraints] = useState<{
    minDate: string;
    maxDate: string;
  }>({
    minDate: '',
    maxDate: ''
  });

  const convertToPST = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }) + ' PST';
  };

  // Memoize the data processing function
  const processData = useMemo(() => {
    return (data: CrowdStrikeRow[], dateRange?: DateRange): ProcessedRow[] => {
      try {
        // Convert timestamp strings to Date objects and filter by date range if provided
        const processedData = data.map(row => ({
          ...row,
          Timestamp: new Date(row.Timestamp),
          time_group: new Date(row.Timestamp).toLocaleString('en-US', {
            timeZone: 'America/Los_Angeles',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })
        }));

        // Filter by date range if provided
        const filteredData = dateRange?.startDate && dateRange?.endDate
          ? processedData.filter(row => {
              const startDate = new Date(dateRange.startDate);
              const endDate = new Date(dateRange.endDate);
              endDate.setHours(23, 59, 59, 999); // Include the entire end date
              return row.Timestamp >= startDate && row.Timestamp <= endDate;
            })
          : processedData;

        // Sort by timestamp
        const sortedData = _.sortBy(filteredData, 'Timestamp');

        // Group by relevant columns
        const grouped = _.groupBy(sortedData, row => 
          `${row.Source}|${row['Source Name']}|${row.IP}|${row.Service}|${row.Target}|${row.time_group}`
        );

        // Create summary with counts and time info
        const frequencyData = Object.entries(grouped).map(([key, group]) => {
          const [Source, SourceName, IP, Service, Target] = key.split('|');
          return {
            Source,
            'Source Name': SourceName,
            IP,
            Service,
            Target,
            Time: convertToPST(group[0].Timestamp.toISOString()),
            freq: group.length
          };
        });

        return _.orderBy(frequencyData, ['Source', 'freq'], ['asc', 'desc']);
      } catch (err) {
        throw new Error(`Data processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };
  }, []);

  // Memoize the filtering function
  const filterResults = useMemo(() => {
    return (data: ProcessedRow[]) => {
      let filtered = data;
      
      // Apply source filter
      if (selectedSource) {
        filtered = filtered.filter(row => row.IP === selectedSource);
      }

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(row => 
          row.Source.toLowerCase().includes(searchLower) ||
          row.Target.toLowerCase().includes(searchLower) ||
          row['Source Name'].toLowerCase().includes(searchLower) ||
          row.IP.toLowerCase().includes(searchLower) ||
          row.Service.toLowerCase().includes(searchLower)
        );
      }

      return filtered;
    };
  }, [selectedSource, searchTerm]);

  // Memoize the sorting function
  const sortResults = useMemo(() => {
    return (data: ProcessedRow[]) => {
      return _.orderBy(data, [sortConfig.key], [sortConfig.direction]);
    };
  }, [sortConfig]);

  // Combine filtering and sorting with memoization
  const filteredAndSortedResults = useMemo(() => {
    if (!results) return [];
    const filtered = filterResults(results);
    return sortResults(filtered);
  }, [results, filterResults, sortResults]);

  // Memoized filtered and sorted results
  const uniqueSources = useMemo(() => {
    if (!results) return [];
    
    // Create a map of IPs to their hostnames
    const sourceMap = new Map<string, Set<string>>();
    
    results.forEach(row => {
      const ip = row.IP;
      const hostname = row['Source Name'];
      if (!sourceMap.has(ip)) {
        sourceMap.set(ip, new Set());
      }
      if (hostname) {
        sourceMap.get(ip)?.add(hostname);
      }
    });

    // Convert map to array of source options
    return Array.from(sourceMap.entries())
      .map(([ip, hostnames]) => {
        const hostnameList = Array.from(hostnames);
        return {
          value: ip,
          label: hostnameList.length > 0 
            ? `${ip} (${hostnameList.join(', ')})`
            : ip
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [results]);

  const handleSort = (key: keyof ProcessedRow) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Load persisted data on component mount
  useEffect(() => {
    const persistedData = localStorage.getItem('crowdstrike_analyzer_data');
    if (persistedData) {
      const {
        rawData,
        results,
        searchTerm,
        selectedSource,
        dateRange,
        dateConstraints,
        currentFile
      } = JSON.parse(persistedData);

      if (rawData && rawData.length > 0) {
        setRawData(rawData);
        setResults(results);
        setSearchTerm(searchTerm || '');
        setSelectedSource(selectedSource || '');
        setDateRange(dateRange || { startDate: '', endDate: '' });
        setDateConstraints(dateConstraints || { minDate: '', maxDate: '' });
        setCurrentFile(currentFile || '');
        setShowSelector(false);
        setShowResults(true);
      }
    }
  }, []);

  // Save data to localStorage when relevant states change
  useEffect(() => {
    if (rawData.length > 0) {
      const dataToStore = {
        rawData,
        results,
        searchTerm,
        selectedSource,
        dateRange,
        dateConstraints,
        currentFile
      };
      localStorage.setItem('crowdstrike_analyzer_data', JSON.stringify(dataToStore));
    }
  }, [rawData, results, searchTerm, selectedSource, dateRange, dateConstraints, currentFile]);

  const resetView = () => {
    setResults(null);
    setShowResults(false);
    setTimeout(() => {
      setShowSelector(true);
    }, 300);
    setCurrentFile('');
    setRawData([]);
    setSearchTerm('');
    setSelectedSource('');
    setDateRange({ startDate: '', endDate: '' });
    // Clear localStorage when view is reset
    localStorage.removeItem('crowdstrike_analyzer_data');
  };

  const processFile = (file: File) => {
    setLoading(true);
    setError(null);
    setCurrentFile(file.name);

    Papa.parse<CrowdStrikeRow>(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          // Calculate min and max dates from the data
          const timestamps = results.data.map(row => new Date(row.Timestamp).getTime());
          const minDate = new Date(Math.min(...timestamps));
          const maxDate = new Date(Math.max(...timestamps));
          
          setDateConstraints({
            minDate: minDate.toISOString().split('T')[0],
            maxDate: maxDate.toISOString().split('T')[0]
          });
          
          setRawData(results.data);
          const processedData = processData(results.data);
          setResults(processedData);
          // Start transition animation
          setShowSelector(false);
          setTimeout(() => {
            setShowResults(true);
            setLoading(false);
          }, 300); // Wait for exit animation to complete
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      },
      error: (err) => {
        setError(`File parsing failed: ${err.message}`);
        setLoading(false);
      }
    });
  };

  const loadSampleData = async () => {
    try {
      const response = await fetch('/sample_data.csv');
      const text = await response.text();
      const file = new File([text], 'sample_data.csv', { type: 'text/csv' });
      processFile(file);
    } catch (error) {
      setError('Failed to load sample data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (!file || !file.name.toLowerCase().endsWith('.csv')) {
      setError('Please drop a valid CSV file');
      return;
    }
    processFile(file);
  };

  const downloadResults = () => {
    if (!results) return;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `crowdstrike_analysis_${timestamp}.csv`;
    
    const csv = Papa.unparse(results);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handleDateRangeApply = () => {
    if (!rawData.length) return;
    const processedData = processData(rawData, dateRange);
    setResults(processedData);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-0 pt-2 px-2">
        <div className="flex flex-row items-center justify-between">
          <CardTitle>CrowdStrike Service Access Analyzer</CardTitle>
          <div className="flex items-center gap-2">
            {results && (
              <>
                <span className="text-sm text-gray-600">{currentFile}</span>
                <button
                  onClick={resetView}
                  className="p-1 hover:bg-gray-100 rounded-full"
                  title="Close current file"
                >
                  <X className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                </button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-2">
          {/* Info Section */}
          <div className={`
            mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200
            transition-all duration-300 ease-in-out
            ${showSelector ? 'opacity-100 transform scale-100' : 'opacity-0 transform scale-95 h-0 overflow-hidden'}
          `}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-2 rounded-md border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-gray-500" />
                  <h4 className="font-medium">About</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Looking to make sense of your CrowdStrike service access data? Our analyzer helps you uncover and understand access patterns in your environment with powerful visualization tools. Simply upload your "On-Prem Service Access" CSV data and we'll help you spot unique patterns, track frequencies, and map out relationships over time. Best of all, your data stays completely private - everything runs right in your browser with no server communication.
                </p>
              </div>
              
              <div className="bg-white p-2 rounded-md border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <h4 className="font-medium">Data Source</h4>
                </div>
                <ol className="text-sm text-gray-600 list-decimal pl-4 space-y-1">
                  <li>Go to <a href="https://falcon.crowdstrike.com/identity-protection/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">CrowdStrike Identity Protection</a></li>
                  <li>Navigate to Threat Hunter {'->'} Identity Protection {'->'} Activity</li>
                  <li>Filter for "On-Prem Service Access" events</li>
                  <li>Click Export and select CSV format</li>
                </ol>
              </div>
              
              <div className="bg-white p-2 rounded-md border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <h4 className="font-medium">Required Headers</h4>
                </div>
                <ul className="text-sm text-gray-600 list-disc pl-4 grid grid-cols-2 gap-x-4 gap-y-1">
                  <li>Source</li>
                  <li>Source Name</li>
                  <li>IP</li>
                  <li>Service</li>
                  <li>Target</li>
                  <li>Timestamp</li>
                </ul>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div 
            className={`
              flex flex-col items-center p-2 border-2 border-dashed rounded-lg
              transition-all duration-300 ease-in-out
              ${showSelector ? 'opacity-100 transform scale-100' : 'opacity-0 transform scale-95 h-0 overflow-hidden'}
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className={`w-8 h-8 mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
            <p className="mb-2 text-sm text-gray-500">Drag and drop your CSV file here, or</p>
            <div className="flex gap-2">
              <button
                onClick={loadSampleData}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-500 rounded-md cursor-pointer hover:bg-gray-600"
              >
                Load Sample Data
              </button>
              <label className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700">
                Select CSV File
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center">Processing data...</div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 text-red-700 bg-red-100 rounded-md">
              {error}
            </div>
          )}

          {/* Results */}
          {results && (
            <div className={`
              space-y-2 transition-all duration-300 ease-in-out
              ${showResults ? 'opacity-100 transform scale-100' : 'opacity-0 transform scale-95'}
            `}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Results</h3>
                  <p className="text-sm text-gray-500">
                    Found {results.length} unique patterns
                  </p>
                </div>
                <button
                  onClick={downloadResults}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <Download className="w-4 h-4" />
                  Export to CSV
                </button>
              </div>

              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative w-full">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Search by source, target, IP..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full"
                  />
                </div>
                <div className="flex gap-2 items-center w-full sm:w-auto">
                  <div className="w-64">
                    <Select
                      value={selectedSource}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedSource(e.target.value)}
                    >
                      <option value="">All Sources</option>
                      {uniqueSources.map((source) => (
                        <option key={source.value} value={source.value}>
                          {source.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <div
                        role="button"
                        tabIndex={0}
                        className={`p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer ${
                          dateRange.startDate || dateRange.endDate ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                        title="Date range filter"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="p-4 space-y-4">
                        <h4 className="text-sm font-medium mb-3">Select Date Range</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                            <Input
                              type="date"
                              value={dateRange.startDate}
                              min={dateConstraints.minDate}
                              max={dateConstraints.maxDate}
                              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">End Date</label>
                            <Input
                              type="date"
                              value={dateRange.endDate}
                              min={dateConstraints.minDate}
                              max={dateConstraints.maxDate}
                              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                              className="w-full"
                            />
                          </div>
                          <button
                            onClick={handleDateRangeApply}
                            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                          >
                            Apply Filter
                          </button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedSource('');
                      setDateRange({ startDate: '', endDate: '' });
                      setDateConstraints({ minDate: '', maxDate: '' });
                      if (rawData.length) {
                        const processedData = processData(rawData);
                        setResults(processedData);
                      }
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                    title="Reset all filters"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Download Success Alert */}
              {downloadSuccess && (
                <Alert className="bg-green-50 border-green-200">
                  <Check className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    CSV file downloaded successfully
                  </AlertDescription>
                </Alert>
              )}

              {/* Results Table with Virtualization */}
              <VirtualizedTable 
                results={results} 
                filteredAndSortedResults={filteredAndSortedResults} 
                handleSort={handleSort} 
              />
            </div>
          )}

          {/* Analytics Dashboard with Suspense */}
          {results && (
            <div className={`
              mt-4 transition-all duration-300 ease-in-out
              ${showResults ? 'opacity-100 transform scale-100' : 'opacity-0 transform scale-95'}
            `}>
              <h3 className="text-lg font-semibold mb-4">Analytics Dashboard</h3>
              <Suspense fallback={<div className="text-center py-4">Loading dashboard...</div>}>
                <CrowdStrikeDashboard data={filteredAndSortedResults} />
              </Suspense>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CrowdStrikeAnalyzer;

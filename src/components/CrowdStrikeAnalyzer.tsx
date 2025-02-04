import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import { Select } from './ui/select';
import Papa from 'papaparse';
import _ from 'lodash';
import { Upload, Download, Check, Search, ArrowUpDown, RotateCcw, Info } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import CrowdStrikeDashboard from './CrowdStrikeDashboard';

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
  'freq (30days)': number;
}

interface SortConfig {
  key: keyof ProcessedRow;
  direction: 'asc' | 'desc';
}

const CrowdStrikeAnalyzer: React.FC = () => {
  const [results, setResults] = useState<ProcessedRow[] | null>(null);
  const [showSelector, setShowSelector] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ 
    key: 'freq (30days)', 
    direction: 'desc' 
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

  const processData = (data: CrowdStrikeRow[]): ProcessedRow[] => {
    try {
      // Convert timestamp strings to Date objects and add PST time_group
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

      // Sort by timestamp
      const sortedData = _.sortBy(processedData, 'Timestamp');

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
          'freq (30days)': group.length
        };
      });

      return _.orderBy(frequencyData, ['Source', 'freq (30days)'], ['asc', 'desc']);
    } catch (err) {
      throw new Error(`Data processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Memoized filtered and sorted results
  // Get unique sources with IP and hostname mapping
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

  const filteredAndSortedResults = useMemo(() => {
    if (!results) return [];

    let filtered = results;
    
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

    return _.orderBy(filtered, [sortConfig.key], [sortConfig.direction]);
  }, [results, searchTerm, selectedSource, sortConfig]);

  const handleSort = (key: keyof ProcessedRow) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    Papa.parse<CrowdStrikeRow>(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
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

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-row items-center justify-between">
          <CardTitle>CrowdStrike Service Analyzer</CardTitle>
          <Popover>
          <PopoverTrigger>
            <Info className="h-5 w-5 text-gray-500 hover:text-gray-700 cursor-pointer" />
          </PopoverTrigger>
          <PopoverContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">About</h4>
                <p className="text-sm text-gray-600">
                  The CrowdStrike Service Analyzer is a powerful tool designed to help security teams analyze and visualize service patterns in their CrowdStrike data. It processes CSV exports to identify unique service patterns, frequencies, and temporal relationships, enabling better understanding of network behavior and potential security insights.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Source</h4>
                <a 
                  href="#" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View on GitHub
                </a>
              </div>
            </div>
          </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* File Upload */}
          <div className={`
            flex flex-col items-center p-6 border-2 border-dashed rounded-lg
            transition-all duration-300 ease-in-out
            ${showSelector ? 'opacity-100 transform scale-100' : 'opacity-0 transform scale-95 h-0 overflow-hidden'}
          `}>
            <Upload className="w-12 h-12 mb-4 text-gray-400" />
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
              space-y-4 transition-all duration-300 ease-in-out
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
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Search by source, target, IP..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="flex gap-2 items-center">
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
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedSource('');
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                    title="Reset filters"
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

              {/* Results Table with Horizontal and Vertical Scroll */}
              <div className="overflow-x-auto -mx-6">
                <div className="inline-block min-w-full align-middle px-6">
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="sticky top-0 bg-gray-50 z-10">
                        <tr>
                          {Object.keys(results[0]).map((key) => (
                            <th 
                              key={key}
                              className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                            >
                              <button 
                                onClick={() => handleSort(key as keyof ProcessedRow)}
                                className="flex items-center gap-1 hover:text-gray-700"
                              >
                                {key === 'Time' ? 'Time (PST)' : key}
                                <ArrowUpDown className="h-4 w-4" />
                              </button>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAndSortedResults.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            {Object.values(row).map((value, cellIndex) => (
                              <td 
                                key={cellIndex}
                                className="p-2 text-sm text-gray-500 whitespace-nowrap"
                              >
                                {value.toString()}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Dashboard */}
          {results && (
            <div className={`
              mt-8 transition-all duration-300 ease-in-out
              ${showResults ? 'opacity-100 transform scale-100' : 'opacity-0 transform scale-95'}
            `}>
              <h3 className="text-lg font-semibold mb-4">Analytics Dashboard</h3>
              <CrowdStrikeDashboard data={filteredAndSortedResults} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CrowdStrikeAnalyzer;

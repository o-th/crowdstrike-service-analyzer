import React, { useMemo, useState, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import _ from 'lodash';

// Lazy load the chart component
const BarChartComponent = lazy(() => import('./charts/BarChartComponent').then(mod => ({ default: mod.BarChartComponent })));

// Tabs for different views
const TABS = {
  OVERVIEW: 'Overview',
  SERVER_ANALYSIS: 'Server Analysis'
} as const;

type TabType = typeof TABS[keyof typeof TABS];

interface DashboardProps {
  data?: Array<{
    Source: string;
    'Source Name': string;
    IP: string;
    Service: string;
    Target: string;
    Time: string;
    freq: number;
  }>;
}

// Memoized chart components
const ChartCard = React.memo(({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent className="h-[300px] w-full">
      <Suspense fallback={<div className="h-full w-full flex items-center justify-center">Loading chart...</div>}>
        {children}
      </Suspense>
    </CardContent>
  </Card>
));

// Memoized progress bar component
const ProgressBar = React.memo(({ label, value, total, unit }: { label: string; value: number; total: number; unit: string }) => (
  <div>
    <div className="flex justify-between text-sm mb-2">
      <span className="truncate">{label}</span>
      <span>{value} {unit}</span>
    </div>
    <Progress 
      value={Math.min((value / total) * 100, 100)} 
      className="h-2"
    />
  </div>
));

const CrowdStrikeDashboard: React.FC<DashboardProps> = ({ data = [] }) => {
  const [activeTab, setActiveTab] = useState<TabType>(TABS.OVERVIEW);

  // Combined data processing for better performance
  const analytics = useMemo(() => {
    // Return empty analytics if no data
    if (!data || data.length === 0) {
      return {
        topSources: [],
        serviceStats: [],
        targetFrequency: [],
        timePatternAnalysis: [],
        ipDistribution: [],
        relationshipStrength: []
      };
    }

    // Create maps for efficient lookups
    const sourceMap = new Map();
    const serviceMap = new Map();
    const targetMap = new Map();
    const timeMap = new Map();
    const ipMap = new Map();
    const relationMap = new Map();

    // Single pass through data
    data.forEach(row => {
      // Sources
      const sourceKey = row.Source || 'Unknown';
      if (!sourceMap.has(sourceKey)) {
        sourceMap.set(sourceKey, { count: 0, totalFreq: 0 });
      }
      const sourceData = sourceMap.get(sourceKey);
      sourceData.count++;
      sourceData.totalFreq += row.freq;

      // Services
      const serviceKey = row.Service || 'Unknown';
      if (!serviceMap.has(serviceKey)) {
        serviceMap.set(serviceKey, { count: 0 });
      }
      serviceMap.get(serviceKey).count++;

      // Targets
      const targetKey = row.Target || 'Unknown';
      if (!targetMap.has(targetKey)) {
        targetMap.set(targetKey, { frequency: 0 });
      }
      targetMap.get(targetKey).frequency += row.freq;

      // Time patterns
      if (!timeMap.has(row.Time)) {
        timeMap.set(row.Time, {
          timePattern: row.Time,
          count: 0,
          totalFreq: 0,
          sources: new Set(),
          targets: new Set()
        });
      }
      const timeData = timeMap.get(row.Time);
      timeData.count++;
      timeData.totalFreq += row.freq;
      timeData.sources.add(row.Source);
      timeData.targets.add(row.Target);

      // IP distribution
      const ipKey = row.IP;
      if (!ipMap.has(ipKey)) {
        ipMap.set(ipKey, {
          ip: ipKey,
          count: 0,
          totalFreq: 0,
          hostnames: new Set(),
          services: new Set(),
          targets: new Set()
        });
      }
      const ipData = ipMap.get(ipKey);
      ipData.count++;
      ipData.totalFreq += row.freq;
      if (row['Source Name']) ipData.hostnames.add(row['Source Name']);
      ipData.services.add(row.Service);
      ipData.targets.add(row.Target);

      // Source-Target relationships
      const relationKey = `${sourceKey}->${targetKey}`;
      if (!relationMap.has(relationKey)) {
        relationMap.set(relationKey, { strength: 0 });
      }
      relationMap.get(relationKey).strength += row.freq;
    });

    // Process the collected data
    const total = data.length;
    
    return {
      topSources: Array.from(sourceMap.entries())
        .map(([source, data]) => ({
          source,
          ...data
        }))
        .sort((a, b) => b.totalFreq - a.totalFreq)
        .slice(0, 5),

      serviceStats: Array.from(serviceMap.entries())
        .map(([service, data]) => ({
          service,
          count: data.count,
          percentage: Number(((data.count / total) * 100).toFixed(2))
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),

      targetFrequency: Array.from(targetMap.entries())
        .map(([target, data]) => ({
          target: target.length > 15 ? target.slice(0, 15) + '...' : target,
          ...data
        }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5),

      timePatternAnalysis: Array.from(timeMap.entries())
        .map(([_, data]) => ({
          ...data,
          sources: data.sources.size,
          targets: data.targets.size
        }))
        .sort((a, b) => b.totalFreq - a.totalFreq)
        .slice(0, 8),

      ipDistribution: Array.from(ipMap.entries())
        .map(([_, data]) => ({
          ...data,
          hostnames: Array.from(data.hostnames),
          services: Array.from(data.services),
          targets: Array.from(data.targets),
          uniqueServices: data.services.size,
          uniqueTargets: data.targets.size,
          avgEventsPerTarget: Math.round(data.totalFreq / data.targets.size)
        }))
        .sort((a, b) => b.totalFreq - a.totalFreq)
        .slice(0, 5),

      relationshipStrength: Array.from(relationMap.entries())
        .map(([relation, data]) => ({
          relation: relation.length > 20 ? relation.slice(0, 20) + '...' : relation,
          ...data
        }))
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 5)
    };
  }, [data]);

  // Memoized overview component
  const Overview = React.memo(() => {
    // If no analytics data, show empty state
    if (!analytics.topSources.length) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>No Matching Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">No data matches the current filters.</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    const maxSourceFreq = analytics.topSources[0]?.totalFreq || 1;
    const maxIpFreq = analytics.ipDistribution[0]?.totalFreq || 1;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Top Sources by Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topSources.map((source, index) => (
                <ProgressBar
                  key={index}
                  label={source.source}
                  value={source.totalFreq}
                  total={maxSourceFreq}
                  unit="events"
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <ChartCard title="Common Time Patterns">
          <Suspense fallback={<div>Loading chart...</div>}>
            <BarChartComponent data={analytics.timePatternAnalysis} type="time" />
          </Suspense>
        </ChartCard>

        <Card>
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.serviceStats.map((service, index) => (
                <ProgressBar
                  key={index}
                  label={service.service}
                  value={service.percentage}
                  total={100}
                  unit="%"
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <ChartCard title="Most Targeted Systems">
          <Suspense fallback={<div>Loading chart...</div>}>
            <BarChartComponent data={analytics.targetFrequency} type="target" />
          </Suspense>
        </ChartCard>

        <Card>
          <CardHeader>
            <CardTitle>Top Source IPs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.ipDistribution.map((ip, index) => (
                <ProgressBar
                  key={index}
                  label={ip.ip}
                  value={ip.totalFreq}
                  total={maxIpFreq}
                  unit="events"
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <ChartCard title="Strongest Source-Target Relations">
          <Suspense fallback={<div>Loading chart...</div>}>
            <BarChartComponent data={analytics.relationshipStrength} type="relation" />
          </Suspense>
        </ChartCard>
      </div>
    );
  });

  // Memoized server analysis component
  const ServerAnalysis = React.memo(() => !analytics.ipDistribution.length ? (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>No Matching Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No data matches the current filters.</p>
        </CardContent>
      </Card>
    </div>
  ) : (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {analytics.ipDistribution.map((server) => (
        <Card key={server.ip}>
          <CardHeader>
            <CardTitle className="text-lg">
              {server.ip}
              {server.hostnames.length > 0 && (
                <span className="block text-sm text-gray-500 mt-1">
                  {server.hostnames.join(', ')}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ProgressBar
                label="Total Events"
                value={server.totalFreq}
                total={analytics.ipDistribution[0].totalFreq}
                unit="events"
              />
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-lg font-semibold">{server.uniqueServices}</div>
                  <div className="text-xs text-gray-500">Services</div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-lg font-semibold">{server.uniqueTargets}</div>
                  <div className="text-xs text-gray-500">Targets</div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-lg font-semibold">{server.avgEventsPerTarget}</div>
                  <div className="text-xs text-gray-500">Avg Events/Target</div>
                </div>
              </div>

              <div className="text-sm">
                <div className="font-medium mb-1">Top Services:</div>
                <div className="text-gray-600">
                  {server.services.slice(0, 3).join(', ')}
                  {server.services.length > 3 && ' ...'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  ));

  // Tab navigation
  const renderTabs = () => (
    <div className="flex space-x-4 mb-4 border-b">
      {Object.values(TABS).map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-4 py-2 font-medium ${
            activeTab === tab
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );

  // Render empty state if no data
  if (!data || data.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Please provide data to view analytics.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {renderTabs()}
      {activeTab === TABS.SERVER_ANALYSIS ? <ServerAnalysis /> : <Overview />}
    </div>
  );
};

export default CrowdStrikeDashboard;

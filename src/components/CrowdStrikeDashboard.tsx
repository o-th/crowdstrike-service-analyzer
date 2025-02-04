import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Progress } from './ui/progress';
import _ from 'lodash';

interface DashboardProps {
  data?: Array<{
    Source: string;
    'Source Name': string;
    IP: string;
    Service: string;
    Target: string;
    Time: string;
    'freq (30days)': number;
  }>;
}

const CrowdStrikeDashboard: React.FC<DashboardProps> = ({ data = [] }) => {
  // Safeguard against empty data
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

  // 1. Top Sources by Activity
  const topSources = useMemo(() => {
    const sourceGroups = _.groupBy(data, 'Source');
    return Object.entries(sourceGroups)
      .map(([source, entries]) => ({
        source,
        count: entries.length,
        totalFreq: _.sumBy(entries, 'freq (30days)')
      }))
      .sort((a, b) => b.totalFreq - a.totalFreq)
      .slice(0, 5);
  }, [data]);

  // Time Pattern Analysis
  const timePatternAnalysis = useMemo(() => {
    const timeGroups = _.groupBy(data, row => row.Time);
    return Object.entries(timeGroups)
      .map(([timePattern, entries]) => ({
        timePattern,
        count: entries.length,
        totalFreq: _.sumBy(entries, 'freq (30days)'),
        sources: new Set(entries.map(e => e.Source)).size,
        targets: new Set(entries.map(e => e.Target)).size
      }))
      .sort((a, b) => b.totalFreq - a.totalFreq)
      .slice(0, 8);  // Show top 8 time patterns
  }, [data]);

  // 3. Service Distribution
  const serviceStats = useMemo(() => {
    const serviceGroups = _.groupBy(data, 'Service');
    const total = data.length || 1; // Prevent division by zero
    return Object.entries(serviceGroups)
      .map(([service, entries]) => ({
        service: service || 'Unknown',
        count: entries.length,
        percentage: (entries.length / total) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [data]);

  // 4. Target Frequency Analysis
  const targetFrequency = useMemo(() => {
    const targetGroups = _.groupBy(data, 'Target');
    return Object.entries(targetGroups)
      .map(([target, entries]) => ({
        target: (target || 'Unknown').length > 15 ? 
          (target || 'Unknown').slice(0, 15) + '...' : 
          target || 'Unknown',
        frequency: _.sumBy(entries, 'freq (30days)')
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
  }, [data]);

  // 5. IP Location Distribution
  const ipDistribution = useMemo(() => {
    const ipGroups = _.groupBy(data, 'IP');
    return Object.entries(ipGroups)
      .map(([ip, entries]) => ({
        ip: ip || 'Unknown',
        count: entries.length,
        totalFreq: _.sumBy(entries, 'freq (30days)')
      }))
      .sort((a, b) => b.totalFreq - a.totalFreq)
      .slice(0, 5);
  }, [data]);

  // 6. Source-Target Relationship Strength
  const relationshipStrength = useMemo(() => {
    const relationships = _.groupBy(data, row => `${row.Source || 'Unknown'}->${row.Target || 'Unknown'}`);
    return Object.entries(relationships)
      .map(([relation, entries]) => ({
        relation: relation.length > 20 ? relation.slice(0, 20) + '...' : relation,
        strength: _.sumBy(entries, 'freq (30days)')
      }))
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 5);
  }, [data]);

  // Get max values for progress bars
  const maxSourceFreq = topSources[0]?.totalFreq || 1;
  const maxIpFreq = ipDistribution[0]?.totalFreq || 1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {/* 1. Top Sources by Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Top Sources by Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topSources.map((source, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="truncate">{source.source || 'Unknown'}</span>
                  <span>{source.totalFreq} events</span>
                </div>
                <Progress 
                  value={Math.min((source.totalFreq / maxSourceFreq) * 100, 100)} 
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time Pattern Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Common Time Patterns</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%" className="w-full">
            <BarChart
              data={timePatternAnalysis}
              layout="vertical"
              margin={{ left: 100, right: 10, top: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} />
              <XAxis 
                type="number" 
                padding={{ left: 0, right: 0 }} 
                domain={[0, 'dataMax']}
                tickCount={5}
              />
              <YAxis
                dataKey="timePattern"
                type="category"
                tick={{ fontSize: 11 }}
                width={90}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border p-2 shadow-md rounded">
                        <p className="font-semibold">{data.timePattern}</p>
                        <p>Total Events: {data.totalFreq}</p>
                        <p>Unique Sources: {data.sources}</p>
                        <p>Unique Targets: {data.targets}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="totalFreq"
                name="Frequency"
                fill="#8884d8"
                barSize={25}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 3. Service Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Top Services</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {serviceStats.map((service, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="truncate">{service.service}</span>
                  <span>{service.percentage.toFixed(1)}%</span>
                </div>
                <Progress 
                  value={Math.min(service.percentage, 100)} 
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. Target Frequency */}
      <Card>
        <CardHeader>
          <CardTitle>Most Targeted Systems</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={targetFrequency}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="target" 
                tick={{ fontSize: 12 }}
                interval={0}
              />
              <YAxis />
              <Tooltip />
              <Bar 
                dataKey="frequency" 
                fill="#82ca9d"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 5. IP Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Top Source IPs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ipDistribution.map((ip, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="truncate">{ip.ip}</span>
                  <span>{ip.totalFreq} events</span>
                </div>
                <Progress 
                  value={Math.min((ip.totalFreq / maxIpFreq) * 100, 100)} 
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 6. Source-Target Relationships */}
      <Card>
        <CardHeader>
          <CardTitle>Strongest Source-Target Relations</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={relationshipStrength}
              layout="vertical"
              margin={{ left: 100, right: 10, top: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} />
              <XAxis 
                type="number" 
                padding={{ left: 0, right: 0 }}
                domain={[0, 'dataMax']}
                tickCount={5}
              />
              <YAxis 
                dataKey="relation" 
                type="category"
                width={90}
                tick={{ fontSize: 11 }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border p-2 shadow-md rounded">
                        <p className="font-semibold">{data.relation}</p>
                        <p>Events: {data.strength}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="strength" 
                fill="#8884d8"
                barSize={25}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default CrowdStrikeDashboard;

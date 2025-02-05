import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps
} from 'recharts';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

interface ChartDataPoint {
  timePattern?: string;
  totalFreq?: number;
  sources?: number;
  targets?: number;
  relation?: string;
  strength?: number;
  target?: string;
  frequency?: number;
}

// Custom tooltip component
const CustomTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartDataPoint;
    if (data.timePattern) {
      return (
        <div className="bg-white border p-2 shadow-md rounded">
          <p className="font-semibold">{data.timePattern}</p>
          <p>Total Events: {data.totalFreq}</p>
          <p>Unique Sources: {data.sources}</p>
          <p>Unique Targets: {data.targets}</p>
        </div>
      );
    }
    if (data.relation) {
      return (
        <div className="bg-white border p-2 shadow-md rounded">
          <p className="font-semibold">{data.relation}</p>
          <p>Events: {data.strength}</p>
        </div>
      );
    }
  }
  return null;
};

interface BarChartComponentProps {
  data: ChartDataPoint[];
  type: 'time' | 'target' | 'relation';
}

export const BarChartComponent: React.FC<BarChartComponentProps> = ({ data, type }) => {
  // Handle empty data state
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" className="w-full">
      <BarChart
        data={data}
        layout={type === 'target' ? 'horizontal' : 'vertical'}
        margin={type === 'target' ? undefined : type === 'time' ? { left: 70, right: 10, top: 5, bottom: 5 } : { left: 100, right: 10, top: 5, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} />
        <XAxis 
          type={type === 'time' || type === 'relation' ? 'number' : 'category'}
          dataKey={type === 'target' ? 'target' : undefined}
          padding={{ left: 0, right: 0 }}
          domain={type === 'time' || type === 'relation' ? [0, 'dataMax'] : undefined}
          tickCount={type === 'time' || type === 'relation' ? 5 : undefined}
          tick={{ fontSize: type === 'target' ? 12 : undefined }}
          interval={type === 'target' ? 0 : undefined}
        />
        <YAxis
          dataKey={type === 'time' ? 'timePattern' : type === 'relation' ? 'relation' : undefined}
          type={type === 'time' || type === 'relation' ? 'category' : 'number'}
          width={type === 'time' ? 60 : type === 'relation' ? 90 : undefined}
          tick={{ fontSize: 11 }}
        />
        <Tooltip<ValueType, NameType>
          content={type === 'target' ? undefined : CustomTooltip}
        />
        <Bar
          dataKey={type === 'time' ? 'totalFreq' : type === 'target' ? 'frequency' : 'strength'}
          name="Frequency"
          fill="#8884d8"
          barSize={25}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

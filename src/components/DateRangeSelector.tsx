import React, { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

interface DateRangeSelectorProps {
  startDate: Date | null;
  endDate: Date | null;
  onApply: (start: Date | null, end: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  startDate: initialStartDate,
  endDate: initialEndDate,
  onApply,
  minDate,
  maxDate
}) => {
  const [startDate, setStartDate] = useState<Date | null>(initialStartDate);
  const [endDate, setEndDate] = useState<Date | null>(initialEndDate);
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
    onApply(null, null);
  };

  const handleQuickSelect = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start);
    setEndDate(end);
    onApply(start, end);
  };

  return (
    <div className="w-full p-4">
      <div className="space-y-4">
        <h3 className="text-base font-medium">Select Date Range</h3>
        
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="startDate">Start Date</Label>
            <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Input
                    id="startDate"
                    value={formatDate(startDate)}
                    readOnly
                    className="pl-8"
                    placeholder="MM/DD/YYYY"
                  />
                  <CalendarIcon className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate || undefined}
                  onSelect={(date: Date | undefined) => {
                    setStartDate(date || null);
                    setStartCalendarOpen(false);
                  }}
                  disabled={(date) =>
                    endDate ? date > endDate : false
                  }
                  fromDate={minDate}
                  toDate={maxDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex-1">
            <Label htmlFor="endDate">End Date</Label>
            <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Input
                    id="endDate"
                    value={formatDate(endDate)}
                    readOnly
                    className="pl-8"
                    placeholder="MM/DD/YYYY"
                  />
                  <CalendarIcon className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate || undefined}
                  onSelect={(date: Date | undefined) => {
                    setEndDate(date || null);
                    setEndCalendarOpen(false);
                  }}
                  disabled={(date) =>
                    startDate ? date < startDate : false
                  }
                  fromDate={minDate}
                  toDate={maxDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleQuickSelect(7)}
            className="px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Last 7 days
          </button>
          <button
            onClick={() => handleQuickSelect(30)}
            className="px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Last 30 days
          </button>
          <button
            onClick={() => handleQuickSelect(90)}
            className="px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Last 90 days
          </button>
        </div>

        <div className="flex justify-between gap-4 pt-2">
          <button
            onClick={handleClear}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            onClick={() => onApply(startDate, endDate)}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#0f172a] rounded-md hover:bg-[#1e293b]"
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateRangeSelector;

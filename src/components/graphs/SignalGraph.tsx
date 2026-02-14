import { useEffect, useRef, useMemo } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import './SignalGraph.css';

// Pre-allocated display buffer size
const MAX_DISPLAY_POINTS = 600;

interface SignalGraphProps {
  title: string;
  data: Float32Array | null;
  timeData: Float32Array | null;
  timeScale: number; // ms per division
  sampleRate: number;
  color?: string;
  height?: number;
  yMin?: number; // Optional fixed Y-axis minimum
  yMax?: number; // Optional fixed Y-axis maximum
  oscilloscopeMode?: boolean; // When true, use trigger-based windowing
  triggerIndex?: number | null; // Index of trigger point in data
}

export function SignalGraph({
  title,
  data,
  timeData,
  timeScale,
  sampleRate: _sampleRate,
  color = '#00d4ff',
  height = 120,
  yMin,
  yMax,
  oscilloscopeMode = false,
  triggerIndex = null,
}: SignalGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);

  // Pre-allocated arrays for display data - reused every frame
  const xDataRef = useRef<Float32Array | null>(null);
  const yDataRef = useRef<Float32Array | null>(null);
  const dataMinMaxRef = useRef<{ min: number; max: number }>({ min: 0, max: 0 });
  const lastMinMaxUpdateRef = useRef<number>(0);

  // Lazy initialize pre-allocated arrays
  if (!xDataRef.current) {
    xDataRef.current = new Float32Array(MAX_DISPLAY_POINTS);
    yDataRef.current = new Float32Array(MAX_DISPLAY_POINTS);
  }

  // Calculate display time window in seconds
  const displayWindowSec = useMemo(() => {
    return (timeScale * 5) / 1000; // 5 divisions
  }, [timeScale]);

  // Create uPlot options (stable - doesn't depend on yMin/yMax)
  const options = useMemo((): uPlot.Options => {
    return {
      width: 260,
      height: height - 30, // Account for title
      cursor: {
        show: false,
      },
      legend: {
        show: false,
      },
      scales: {
        x: {
          time: false,
        },
        y: {
          auto: true, // Start with auto, we'll override dynamically
        },
      },
      axes: [
        {
          stroke: '#4a5568',
          grid: {
            stroke: '#2d3748',
            width: 1,
          },
          ticks: {
            stroke: '#4a5568',
            width: 1,
          },
          font: '9px sans-serif',
          size: 30,
        },
        {
          stroke: '#4a5568',
          grid: {
            stroke: '#2d3748',
            width: 1,
          },
          ticks: {
            stroke: '#4a5568',
            width: 1,
          },
          font: '9px sans-serif',
          size: 40,
          values: (_u: uPlot, vals: number[]) =>
            vals.map((v) => {
              if (Math.abs(v) < 0.001 && v !== 0) {
                return v.toExponential(1);
              }
              return v.toFixed(2);
            }),
        },
      ],
      series: [
        {},
        {
          stroke: color,
          width: 1.5,
          points: {
            show: false,
          },
        },
      ],
    };
  }, [height, color]);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    // Create empty chart
    const emptyData: uPlot.AlignedData = [[0], [0]];
    const chart = new uPlot(options, emptyData, containerRef.current);
    chartRef.current = chart;

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && chart) {
        chart.setSize({
          width: entry.contentRect.width,
          height: height - 30,
        });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.destroy();
      chartRef.current = null;
    };
  }, [options, height]);

  // Update data and scale
  useEffect(() => {
    if (!chartRef.current || !data || !timeData || data.length === 0) return;
    if (!xDataRef.current || !yDataRef.current) return;

    const xData = xDataRef.current;
    const yData = yDataRef.current;

    // Find the time window to display
    let startIdx: number;
    let endIdx: number;

    if (oscilloscopeMode && triggerIndex !== null) {
      // Oscilloscope mode: start from trigger point, show displayWindowSec worth of data
      startIdx = triggerIndex;
      const startTime = timeData[triggerIndex];
      const endTime = startTime + displayWindowSec;

      // Find end index based on time window
      endIdx = data.length;
      for (let i = triggerIndex; i < timeData.length; i++) {
        if (timeData[i] > endTime) {
          endIdx = i;
          break;
        }
      }
    } else {
      // Rolling mode: most recent displayWindowSec seconds
      const latestTime = timeData[timeData.length - 1];
      const startTime = latestTime - displayWindowSec;

      // Find the index where our display window starts
      startIdx = 0;
      for (let i = timeData.length - 1; i >= 0; i--) {
        if (timeData[i] < startTime) {
          startIdx = i + 1;
          break;
        }
      }
      endIdx = data.length;
    }
    startIdx = Math.max(0, startIdx);

    // Get the data slice for display
    const displayData = data.subarray(startIdx, endIdx);
    const displayTime = timeData.subarray(startIdx, endIdx);
    const pointCount = displayData.length;

    // In oscilloscope mode, normalize time to start at 0 (relative to trigger)
    // This keeps the x-axis fixed instead of scrolling with absolute time
    const timeOffset = (oscilloscopeMode && triggerIndex !== null && displayTime.length > 0)
      ? displayTime[0]
      : 0;

    // Check if we should update min/max this frame (5 times per second = every 200ms)
    const now = performance.now();
    const shouldUpdateMinMax = now - lastMinMaxUpdateRef.current >= 200;

    // Fill pre-allocated arrays (no allocation, just writes)
    let count: number;
    let minVal = Infinity;
    let maxVal = -Infinity;

    if (pointCount <= MAX_DISPLAY_POINTS) {
      // No decimation needed - copy directly
      count = pointCount;
      if (shouldUpdateMinMax) {
        for (let i = 0; i < count; i++) {
          xData[i] = displayTime[i] - timeOffset;
          const y = displayData[i];
          yData[i] = y;
          if (y < minVal) minVal = y;
          if (y > maxVal) maxVal = y;
        }
      } else {
        for (let i = 0; i < count; i++) {
          xData[i] = displayTime[i] - timeOffset;
          yData[i] = displayData[i];
        }
      }
    } else {
      // Decimate to fit display
      count = MAX_DISPLAY_POINTS;
      const step = pointCount / MAX_DISPLAY_POINTS;
      if (shouldUpdateMinMax) {
        for (let i = 0; i < MAX_DISPLAY_POINTS; i++) {
          const srcIdx = Math.floor(i * step);
          xData[i] = displayTime[srcIdx] - timeOffset;
          const y = displayData[srcIdx];
          yData[i] = y;
          if (y < minVal) minVal = y;
          if (y > maxVal) maxVal = y;
        }
      } else {
        for (let i = 0; i < MAX_DISPLAY_POINTS; i++) {
          const srcIdx = Math.floor(i * step);
          xData[i] = displayTime[srcIdx] - timeOffset;
          yData[i] = displayData[srcIdx];
        }
      }
    }

    // Pass subarray views to uPlot
    // Note: subarray() creates lightweight view objects, not data copies
    chartRef.current.setData([
      xData.subarray(0, count),
      yData.subarray(0, count),
    ]);

    // Update min/max ref only when needed
    if (shouldUpdateMinMax) {
      dataMinMaxRef.current.min = minVal;
      dataMinMaxRef.current.max = maxVal;
      lastMinMaxUpdateRef.current = now;
    }

    // Apply fixed Y scale if provided (without recreating the chart)
    if (yMin !== undefined && yMax !== undefined) {
      chartRef.current.setScale('y', { min: yMin, max: yMax });
    }

    // In oscilloscope mode, fix the x-axis scale to prevent jitter
    if (oscilloscopeMode && triggerIndex !== null) {
      chartRef.current.setScale('x', { min: 0, max: displayWindowSec });
    }
  }, [data, timeData, displayWindowSec, yMin, yMax, oscilloscopeMode, triggerIndex]);

  // Format Y value for display
  const formatY = (val: number) => {
    if (Math.abs(val) < 0.001 && val !== 0) {
      return val.toExponential(1);
    }
    return val.toFixed(2);
  };

  return (
    <div className="signal-graph">
      <div className="graph-title">{title}</div>
      <div className="graph-wrapper">
        {yMin !== undefined && yMax !== undefined && (
          <div className="y-range-labels">
            <span className="y-max">{formatY(yMax)}</span>
            <span className="y-min">{formatY(yMin)}</span>
          </div>
        )}
        {data && (
          <div className="data-minmax-labels">
            <span className="data-max">max: {formatY(dataMinMaxRef.current.max)}</span>
            <span className="data-min">min: {formatY(dataMinMaxRef.current.min)}</span>
          </div>
        )}
        <div className="graph-container" ref={containerRef} />
      </div>
    </div>
  );
}

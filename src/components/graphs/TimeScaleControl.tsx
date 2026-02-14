import { useCallback, useEffect, useRef } from 'react';
import { useSimulationStore } from '../../store';
import { findRisingEdgeTriggerWithTime } from '../../utils/triggerDetection';
import './TimeScaleControl.css';

const PRESET_SCALES = [1, 2, 5, 10, 20, 50, 100, 200]; // Max 200ms/div (1 second buffer / 5 divisions)

export function TimeScaleControl() {
  const timeScale = useSimulationStore((state) => state.timeScale);
  const setTimeScale = useSimulationStore((state) => state.setTimeScale);
  const isRunning = useSimulationStore((state) => state.isRunning);
  const setIsRunning = useSimulationStore((state) => state.setIsRunning);
  const oscilloscopeMode = useSimulationStore((state) => state.oscilloscopeMode);
  const setOscilloscopeMode = useSimulationStore((state) => state.setOscilloscopeMode);
  const triggerLevel = useSimulationStore((state) => state.triggerLevel);
  const setTriggerLevel = useSimulationStore((state) => state.setTriggerLevel);
  const triggerTime = useSimulationStore((state) => state.triggerTime);
  const setTriggerTime = useSimulationStore((state) => state.setTriggerTime);
  const setTriggerIndex = useSimulationStore((state) => state.setTriggerIndex);
  const buffers = useSimulationStore((state) => state.buffers);

  // Track when we last triggered to implement holdoff
  const lastTriggerTimeRef = useRef<number | null>(null);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const index = parseInt(e.target.value, 10);
      setTimeScale(PRESET_SCALES[index]);
      // Reset trigger when time scale changes
      setTriggerTime(null);
      setTriggerIndex(null);
      lastTriggerTimeRef.current = null;
    },
    [setTimeScale, setTriggerTime, setTriggerIndex]
  );

  const currentIndex = PRESET_SCALES.findIndex((s) => s >= timeScale);
  const sliderIndex = currentIndex === -1 ? PRESET_SCALES.length - 1 : currentIndex;

  const toggleRunning = useCallback(() => {
    setIsRunning(!isRunning);
  }, [isRunning, setIsRunning]);

  const toggleOscilloscopeMode = useCallback(() => {
    setOscilloscopeMode(!oscilloscopeMode);
    lastTriggerTimeRef.current = null;
  }, [oscilloscopeMode, setOscilloscopeMode]);

  const handleTriggerLevelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      if (!isNaN(value)) {
        setTriggerLevel(value);
        lastTriggerTimeRef.current = null;
      }
    },
    [setTriggerLevel]
  );

  // Run trigger detection when in oscilloscope mode
  useEffect(() => {
    if (!oscilloscopeMode || !buffers?.modulating || !buffers?.time) {
      setTriggerTime(null);
      setTriggerIndex(null);
      return;
    }

    const displayWindowSec = (timeScale * 5) / 1000; // 5 divisions
    const timeData = buffers.time;
    const latestTime = timeData[timeData.length - 1];
    const earliestTime = timeData[0];
    const bufferDuration = latestTime - earliestTime;

    // Get current trigger time from store
    const currentTriggerTime = useSimulationStore.getState().triggerTime;

    // Check if current trigger is still valid (still within buffer and has enough data after it)
    if (currentTriggerTime !== null) {
      const triggerEndTime = currentTriggerTime + displayWindowSec;

      // Trigger is valid if:
      // 1. Trigger point is still in the buffer
      // 2. We have enough data after the trigger to fill the display window
      if (currentTriggerTime >= earliestTime && triggerEndTime <= latestTime) {
        // Find the index for the current trigger time
        let idx = 0;
        for (let i = 0; i < timeData.length; i++) {
          if (timeData[i] >= currentTriggerTime) {
            idx = i;
            break;
          }
        }
        setTriggerIndex(idx);
        return; // Current trigger is still valid
      }

      // Trigger has scrolled out of buffer or not enough data after it
      // Clear the trigger display
      setTriggerTime(null);
      setTriggerIndex(null);
    }

    // Check holdoff before searching for a new trigger
    if (lastTriggerTimeRef.current !== null) {
      // If buffer time is less than last trigger time, simulation was reset
      // Clear holdoff so we can trigger again immediately
      if (latestTime < lastTriggerTimeRef.current) {
        lastTriggerTimeRef.current = null;
      } else {
        const holdoffTime = lastTriggerTimeRef.current + displayWindowSec;
        if (latestTime < holdoffTime) {
          // Still in holdoff period, don't search for new trigger
          return;
        }
      }
    }

    // Search for a new trigger
    // We need to find a trigger early enough that we can display displayWindowSec after it
    // So we search in the range [earliestTime, latestTime - displayWindowSec]
    const searchEndTime = latestTime - displayWindowSec;

    if (searchEndTime <= earliestTime) {
      // Buffer doesn't have enough data for the display window
      // This happens at 200ms/div when buffer is exactly 1 second
      // In this case, we need to trigger at the very start of the buffer
      // Search for trigger in first 10% of buffer as a compromise
      const searchWindow = bufferDuration * 0.1;
      const result = findRisingEdgeTriggerWithTime(
        buffers.modulating,
        timeData,
        triggerLevel,
        earliestTime,
        earliestTime + searchWindow
      );

      if (result !== null) {
        setTriggerTime(result.time);
        setTriggerIndex(result.index);
        lastTriggerTimeRef.current = result.time;
      }
      return;
    }

    // Normal case: search from earliest time to searchEndTime
    const result = findRisingEdgeTriggerWithTime(
      buffers.modulating,
      timeData,
      triggerLevel,
      earliestTime,
      searchEndTime
    );

    if (result !== null) {
      setTriggerTime(result.time);
      setTriggerIndex(result.index);
      lastTriggerTimeRef.current = result.time;
    }
  }, [oscilloscopeMode, buffers?.modulating, buffers?.time, triggerLevel, timeScale, setTriggerIndex, setTriggerTime]);

  return (
    <div className="time-scale-control">
      <button
        className={`run-button ${isRunning ? 'running' : 'stopped'}`}
        onClick={toggleRunning}
      >
        {isRunning ? '⏸ Pause' : '▶ Run'}
      </button>
      <button
        className={`scope-button ${oscilloscopeMode ? 'active' : ''}`}
        onClick={toggleOscilloscopeMode}
        title="Toggle oscilloscope mode (trigger on modulating signal)"
      >
        Scope
      </button>
      {oscilloscopeMode && (
        <div className="trigger-controls">
          <label className="trigger-label">
            Trig:
            <input
              type="number"
              className="trigger-input"
              value={triggerLevel}
              onChange={handleTriggerLevelChange}
              step={0.1}
            />
            <span className="trigger-unit">V</span>
          </label>
          <span className={`trigger-status ${triggerTime !== null ? 'triggered' : 'waiting'}`}>
            {triggerTime !== null ? 'Triggered' : 'Waiting...'}
          </span>
        </div>
      )}
      <div className="scale-slider-container">
        <span className="scale-label">Time Scale:</span>
        <input
          type="range"
          className="scale-slider"
          min={0}
          max={PRESET_SCALES.length - 1}
          step={1}
          value={sliderIndex}
          onChange={handleSliderChange}
        />
        <span className="scale-value">{timeScale} ms/div</span>
      </div>
    </div>
  );
}

/**
 * Find the index of a rising edge crossing in the signal data.
 *
 * @param data - The signal data to search
 * @param threshold - The level to trigger on (default 0 for zero-crossing)
 * @param minSamplesAfter - Minimum samples needed after trigger point
 * @returns The index of the trigger point, or null if not found
 */
export function findRisingEdgeTrigger(
  data: Float32Array,
  threshold: number,
  minSamplesAfter: number
): number | null {
  if (data.length < 2) return null;

  // Scan for rising edge crossing (prev < threshold && curr >= threshold)
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];

    if (prev < threshold && curr >= threshold) {
      // Found a rising edge crossing
      // Only accept if there's enough data after the trigger point
      if (data.length - i >= minSamplesAfter) {
        return i;
      }
    }
  }

  return null;
}

/**
 * Result of a time-based trigger search
 */
export interface TriggerResult {
  index: number;
  time: number;
}

/**
 * Find a rising edge crossing within a time range.
 *
 * @param data - The signal data to search
 * @param timeData - The time values corresponding to each sample
 * @param threshold - The level to trigger on
 * @param startTime - Start of the search window (inclusive)
 * @param endTime - End of the search window (inclusive)
 * @returns The index and time of the trigger point, or null if not found
 */
export function findRisingEdgeTriggerWithTime(
  data: Float32Array,
  timeData: Float32Array,
  threshold: number,
  startTime: number,
  endTime: number
): TriggerResult | null {
  if (data.length < 2 || timeData.length < 2) return null;

  // Scan for rising edge crossing within the time window
  for (let i = 1; i < data.length; i++) {
    const time = timeData[i];

    // Skip samples before our search window
    if (time < startTime) continue;

    // Stop if we've passed our search window
    if (time > endTime) break;

    const prev = data[i - 1];
    const curr = data[i];

    if (prev < threshold && curr >= threshold) {
      // Found a rising edge crossing
      return { index: i, time };
    }
  }

  return null;
}

/**
 * SharedArrayBuffer layout for zero-copy signal transfer between worker and main thread.
 * Uses double buffering to avoid race conditions.
 *
 * Layout:
 * - Bytes 0-3: Active buffer flag (Int32, 0 or 1)
 * - Bytes 4+: Buffer A (13 signals × maxPoints × 4 bytes)
 * - After A: Buffer B (13 signals × maxPoints × 4 bytes)
 */

export const SIGNAL_COUNT = 13;
export const SIGNAL_NAMES = [
  'reference',
  'modulating',
  'modulatingPlusNoise',
  'sensorClean',
  'noise',
  'sensor',
  'afterBpf',
  'mixerI',
  'mixerQ',
  'iOutput',
  'qOutput',
  'signedOutput',
  'time',
] as const;

export type SignalName = typeof SIGNAL_NAMES[number];

const FLAG_BYTES = 4;
const BYTES_PER_FLOAT = 4;

/**
 * Calculate total SharedArrayBuffer size needed
 */
export function calculateSharedBufferSize(maxDisplayPoints: number): number {
  const singleBufferSize = SIGNAL_COUNT * maxDisplayPoints * BYTES_PER_FLOAT;
  return FLAG_BYTES + singleBufferSize * 2; // Flag + Buffer A + Buffer B
}

/**
 * Create views into the shared buffer for one buffer set (A or B)
 */
export interface SignalViews {
  reference: Float32Array;
  modulating: Float32Array;
  modulatingPlusNoise: Float32Array;
  sensorClean: Float32Array;
  noise: Float32Array;
  sensor: Float32Array;
  afterBpf: Float32Array;
  mixerI: Float32Array;
  mixerQ: Float32Array;
  iOutput: Float32Array;
  qOutput: Float32Array;
  signedOutput: Float32Array;
  time: Float32Array;
}

export interface SharedBufferViews {
  flag: Int32Array;
  bufferA: SignalViews;
  bufferB: SignalViews;
}

/**
 * Create all views into the shared buffer
 */
export function createSharedBufferViews(
  sharedBuffer: SharedArrayBuffer,
  maxDisplayPoints: number
): SharedBufferViews {
  const singleBufferSize = SIGNAL_COUNT * maxDisplayPoints * BYTES_PER_FLOAT;

  const flag = new Int32Array(sharedBuffer, 0, 1);

  const createSignalViews = (baseOffset: number): SignalViews => {
    const views: Partial<SignalViews> = {};
    for (let i = 0; i < SIGNAL_NAMES.length; i++) {
      const name = SIGNAL_NAMES[i];
      const offset = baseOffset + i * maxDisplayPoints * BYTES_PER_FLOAT;
      views[name] = new Float32Array(sharedBuffer, offset, maxDisplayPoints);
    }
    return views as SignalViews;
  };

  return {
    flag,
    bufferA: createSignalViews(FLAG_BYTES),
    bufferB: createSignalViews(FLAG_BYTES + singleBufferSize),
  };
}

/**
 * Get the active buffer for reading (main thread)
 */
export function getActiveBuffer(views: SharedBufferViews): SignalViews {
  const activeIdx = Atomics.load(views.flag, 0);
  return activeIdx === 0 ? views.bufferA : views.bufferB;
}

/**
 * Get the inactive buffer for writing (worker)
 */
export function getInactiveBuffer(views: SharedBufferViews): SignalViews {
  const activeIdx = Atomics.load(views.flag, 0);
  return activeIdx === 0 ? views.bufferB : views.bufferA;
}

/**
 * Swap active buffer (worker calls this after writing)
 */
export function swapBuffers(views: SharedBufferViews): void {
  const currentActive = Atomics.load(views.flag, 0);
  Atomics.store(views.flag, 0, currentActive === 0 ? 1 : 0);
}

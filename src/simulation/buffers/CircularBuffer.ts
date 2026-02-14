/**
 * Circular buffer for continuous signal display
 * Provides efficient ring buffer operations with Float32Array
 */

export class CircularBuffer {
  private buffer: Float32Array;
  private writeIndex: number = 0;
  private _length: number = 0;
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Float32Array(capacity);
  }

  /**
   * Push a single value to the buffer
   */
  push(value: number): void {
    this.buffer[this.writeIndex] = value;
    this.writeIndex = (this.writeIndex + 1) % this.capacity;
    if (this._length < this.capacity) {
      this._length++;
    }
  }

  /**
   * Push multiple values to the buffer
   */
  pushMany(values: Float32Array | number[]): void {
    for (let i = 0; i < values.length; i++) {
      this.push(values[i]);
    }
  }

  /**
   * Get the buffer contents in chronological order
   * Returns a new Float32Array with data ordered from oldest to newest
   */
  toArray(): Float32Array {
    const result = new Float32Array(this._length);

    if (this._length < this.capacity) {
      // Buffer not yet full, data is in order from start
      result.set(this.buffer.subarray(0, this._length));
    } else {
      // Buffer is full, need to reorder
      const firstPart = this.buffer.subarray(this.writeIndex);
      const secondPart = this.buffer.subarray(0, this.writeIndex);
      result.set(firstPart, 0);
      result.set(secondPart, firstPart.length);
    }

    return result;
  }

  /**
   * Get buffer capacity
   */
  getCapacity(): number {
    return this.capacity;
  }

  /**
   * Get current number of samples in buffer
   */
  get length(): number {
    return this._length;
  }

  /**
   * Check if buffer is full
   */
  isFull(): boolean {
    return this._length === this.capacity;
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.buffer.fill(0);
    this.writeIndex = 0;
    this._length = 0;
  }

  /**
   * Resize the buffer (clears existing data)
   */
  resize(newCapacity: number): void {
    this.capacity = newCapacity;
    this.buffer = new Float32Array(newCapacity);
    this.writeIndex = 0;
    this._length = 0;
  }

  /**
   * Get the most recent N samples in chronological order
   */
  getRecent(count: number): Float32Array {
    const n = Math.min(count, this._length);
    const result = new Float32Array(n);

    if (this._length < this.capacity) {
      // Buffer not full
      const start = Math.max(0, this._length - n);
      result.set(this.buffer.subarray(start, start + n));
    } else {
      // Buffer is full
      let readIndex = (this.writeIndex - n + this.capacity) % this.capacity;
      for (let i = 0; i < n; i++) {
        result[i] = this.buffer[readIndex];
        readIndex = (readIndex + 1) % this.capacity;
      }
    }

    return result;
  }

  /**
   * Get decimated buffer contents in chronological order
   * Uses consistent decimation based on capacity (not current length) to avoid
   * visual changes as the buffer fills up.
   * Returns at most maxPoints samples, evenly spaced through the buffer
   */
  toDecimatedArray(maxPoints: number): Float32Array {
    if (this._length === 0) {
      return new Float32Array(0);
    }

    // Always use decimation factor based on capacity for consistent display
    const decimationFactor = Math.ceil(this.capacity / maxPoints);
    const outputLength = Math.ceil(this._length / decimationFactor);
    const result = new Float32Array(outputLength);

    if (this._length < this.capacity) {
      // Buffer not yet full, data is in order from start
      for (let i = 0; i < outputLength; i++) {
        result[i] = this.buffer[i * decimationFactor];
      }
    } else {
      // Buffer is full, need to read in correct order
      let readIndex = this.writeIndex; // Oldest sample
      for (let i = 0; i < outputLength; i++) {
        result[i] = this.buffer[readIndex];
        readIndex = (readIndex + decimationFactor) % this.capacity;
      }
    }

    return result;
  }

  /**
   * Write decimated buffer contents into a pre-allocated target array
   * Uses consistent decimation based on capacity (not current length) to avoid
   * visual changes as the buffer fills up.
   * Returns the number of samples written
   */
  toDecimatedArrayInto(target: Float32Array, maxPoints: number): number {
    if (this._length === 0) {
      return 0;
    }

    // Always use decimation factor based on capacity for consistent display
    const decimationFactor = Math.ceil(this.capacity / maxPoints);
    const outputLength = Math.ceil(this._length / decimationFactor);

    if (this._length < this.capacity) {
      // Buffer not full yet - read from start with decimation
      for (let i = 0; i < outputLength; i++) {
        target[i] = this.buffer[i * decimationFactor];
      }
    } else {
      // Buffer full - read from writeIndex (oldest) with decimation
      let readIndex = this.writeIndex;
      for (let i = 0; i < outputLength; i++) {
        target[i] = this.buffer[readIndex];
        readIndex = (readIndex + decimationFactor) % this.capacity;
      }
    }

    return outputLength;
  }
}

/**
 * Create a set of circular buffers for all signal channels
 */
export function createSignalBuffers(capacity: number) {
  return {
    reference: new CircularBuffer(capacity),
    noise: new CircularBuffer(capacity),
    sensor: new CircularBuffer(capacity),
    afterBpf: new CircularBuffer(capacity),
    iOutput: new CircularBuffer(capacity),
    qOutput: new CircularBuffer(capacity),
    magnitude: new CircularBuffer(capacity),
    time: new CircularBuffer(capacity),
  };
}

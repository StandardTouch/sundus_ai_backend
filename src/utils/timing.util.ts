/**
 * Timing Utility
 * Utilities for tracking and formatting timing information
 */

/**
 * Timing event for tracking processing steps
 */
export interface TimingEvent {
  event: string;
  timestamp: number; // milliseconds
  elapsed: number; // milliseconds since start (with decimal precision)
}

/**
 * Processing result with timing information
 */
export interface ProcessingResult {
  totalTime: number;
  events: TimingEvent[];
  breakdown: string;
}

/**
 * Timing Tracker
 * Tracks events and calculates timing breakdown
 */
export class TimingTracker {
  private startTime: bigint;
  private events: TimingEvent[] = [];

  constructor() {
    this.startTime = process.hrtime.bigint();
  }

  /**
   * Add a timing event
   */
  addEvent(eventName: string): void {
    const now = process.hrtime.bigint();
    const elapsed = Number(now - this.startTime) / 1000000; // Convert to milliseconds
    this.events.push({
      event: eventName,
      timestamp: Number(now / BigInt(1000000)), // Convert to milliseconds
      elapsed: Math.round(elapsed * 100) / 100 // Round to 2 decimal places
    });
  }

  /**
   * Get all events
   */
  getEvents(): TimingEvent[] {
    return [...this.events];
  }

  /**
   * Get total elapsed time
   */
  getTotalTime(): number {
    const totalTime = Number(process.hrtime.bigint() - this.startTime) / 1000000;
    return Math.round(totalTime * 100) / 100;
  }

  /**
   * Format timing breakdown for display
   */
  formatBreakdown(): string {
    if (this.events.length === 0) {
      return "No timing data available";
    }

    const totalTime = this.getTotalTime();
    let breakdown = "📊 Breakdown:\n";
    
    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];
      if (!event) continue;
      
      const prevEvent = i > 0 ? this.events[i - 1] : null;
      const timeSincePrev = prevEvent ? event.elapsed - prevEvent.elapsed : event.elapsed;
      
      // Format with 2 decimal places if less than 1ms, otherwise round to nearest integer
      const formattedTimeSincePrev = timeSincePrev < 1 
        ? timeSincePrev.toFixed(2) 
        : Math.round(timeSincePrev).toString();
      const formattedElapsed = event.elapsed < 1 
        ? event.elapsed.toFixed(2) 
        : Math.round(event.elapsed).toString();
      
      breakdown += `  • ${event.event}: +${formattedTimeSincePrev}ms (${formattedElapsed}ms total)\n`;
    }
    
    const formattedTotal = totalTime < 1 
      ? totalTime.toFixed(2) 
      : Math.round(totalTime).toString();
    breakdown += `\n⏱️ Total: ${formattedTotal}ms`;
    
    return breakdown;
  }

  /**
   * Get processing result
   */
  getResult(): ProcessingResult {
    return {
      totalTime: this.getTotalTime(),
      events: this.getEvents(),
      breakdown: this.formatBreakdown()
    };
  }
}


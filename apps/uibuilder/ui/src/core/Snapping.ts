export const Snapping = {
  snap: (value: number, step: number, active: boolean): number => {
    if (!active) return value;
    // Simple math: (12% snapped to 5 = 10%)
    return Math.round(value / step) * step;
  }
};
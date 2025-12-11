export function callVoid<T extends (...args: unknown[]) => unknown>(fn?: T, ...args: Parameters<T>): void {
  if (typeof fn === 'function') {
    // Call the function and void the result to explicitly ignore any returned promise
    void fn(...args);
  }
}

export default callVoid;

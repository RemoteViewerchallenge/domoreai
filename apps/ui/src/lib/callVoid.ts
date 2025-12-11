// `any` here is intentional to allow passing functions with any parameter types (helper wrapper).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function callVoid<T extends (...args: any[]) => any>(fn?: T, ...args: Parameters<T>): void {
  if (typeof fn === 'function') {
    // Call the function and void the result to explicitly ignore any returned promise
    void fn(...args);
  }
}

export default callVoid;

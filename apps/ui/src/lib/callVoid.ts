export const callVoid = (fn?: () => void) => {
  if (fn) {
    fn();
  }
};

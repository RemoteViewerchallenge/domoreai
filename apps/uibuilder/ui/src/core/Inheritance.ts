/**
 * Simple cloning logic for layout variables
 */
export const Inheritance = {
  // Takes an existing node and returns its "visual DNA" for a new child
  cloneLayout: (parentProps: any) => {
    return {
      bgColor: parentProps.bgColor,
      textColor: parentProps.textColor,
      borderW: parentProps.borderW,
      pad: parentProps.pad,
      // We don't necessarily clone width, as that's handled by the split logic
    };
  }
};
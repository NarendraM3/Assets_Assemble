export const STANDARD_HARDWARE_CATEGORIES = [
  "Laptop",
  "Desktop",
  "Monitor",
  "Keyboard",
  "Mouse",
  "Printer",
  "Headset",
  "Other",
] as const;

export type StandardHardwareCategory = (typeof STANDARD_HARDWARE_CATEGORIES)[number];

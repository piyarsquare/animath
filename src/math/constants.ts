export const planes = ['XY','XU','XV','YU','YV','UV'] as const;
export const QUARTER = 1.5707963267948966; // +90° in radians
export type Plane = typeof planes[number];

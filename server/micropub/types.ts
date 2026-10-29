/** Micropub keeps microformats values as arrays, including unfamiliar extensions. */
export type Properties = Record<string, unknown[]>;
/** Validated operation envelope; authentication data never enters stored properties. */
export type MicropubInput = { action?: string; url?: string; type?: string[]; properties?: Properties;
  replace?: Properties; add?: Properties; delete?: Properties | string[]; slug?: string; accessToken?: string };

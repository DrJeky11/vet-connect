/** Helpers for re-showing a form with what the person typed after an error. */
export type FormValues = Record<string, string[]>;

export function valueReader(values: FormValues | undefined) {
  const v = values ?? {};
  return {
    /** First value of a field, or the fallback. */
    one: (k: string, fallback = "") => v[k]?.[0] ?? fallback,
    /** Whether a checkbox or radio with this value was checked. */
    has: (k: string, x: string) => Boolean(v[k]?.includes(x)),
    /** Changes whenever the values change, to remount the form with new defaults. */
    key: values ? JSON.stringify(values) : "fresh",
    any: Boolean(values),
  };
}

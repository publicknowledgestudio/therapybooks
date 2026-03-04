/** Compute start/end dates from a range string */
export function getDateRange(range: string | null): { start: string | null; end: string | null } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed

  switch (range) {
    case "this-month": {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return { start: fmt(start), end: fmt(end) };
    }
    case "last-month": {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      return { start: fmt(start), end: fmt(end) };
    }
    case "this-quarter": {
      const qStart = Math.floor(m / 3) * 3;
      const start = new Date(y, qStart, 1);
      const end = new Date(y, qStart + 3, 0);
      return { start: fmt(start), end: fmt(end) };
    }
    case "this-fy": {
      // Indian FY: Apr 1 - Mar 31
      const fyYear = m >= 3 ? y : y - 1;
      const start = new Date(fyYear, 3, 1);
      const end = new Date(fyYear + 1, 2, 31);
      return { start: fmt(start), end: fmt(end) };
    }
    default:
      return { start: null, end: null };
  }
}

function fmt(d: Date): string {
  return d.toISOString().split("T")[0];
}

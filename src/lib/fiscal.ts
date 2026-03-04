/** Get India fiscal year info for a given date (Apr–Mar) */
export function getFiscalYear(now: Date) {
  const month = now.getMonth();
  const year = now.getFullYear();
  const fyStart = month >= 3 ? year : year - 1;
  return {
    label: `FY ${String(fyStart).slice(2)}-${String(fyStart + 1).slice(2)}`,
    startStr: `${fyStart}-04-01`,
    endStr: `${fyStart + 1}-03-31`,
  };
}

/** Get India fiscal quarter info for a given date */
export function getFiscalQuarter(now: Date) {
  const month = now.getMonth();
  const year = now.getFullYear();

  let q: number, startMonth: number, endMonth: number;
  if (month >= 3 && month <= 5) {
    q = 1; startMonth = 3; endMonth = 5;
  } else if (month >= 6 && month <= 8) {
    q = 2; startMonth = 6; endMonth = 8;
  } else if (month >= 9 && month <= 11) {
    q = 3; startMonth = 9; endMonth = 11;
  } else {
    q = 4; startMonth = 0; endMonth = 2;
  }

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const startDate = new Date(month >= 3 ? year : year, startMonth, 1);
  const endDateObj = new Date(startDate.getFullYear(), endMonth + 1, 0);

  return {
    label: `Q${q} (${monthNames[startMonth]}-${monthNames[endMonth]})`,
    startStr: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-01`,
    endStr: `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, "0")}-${String(endDateObj.getDate()).padStart(2, "0")}`,
  };
}

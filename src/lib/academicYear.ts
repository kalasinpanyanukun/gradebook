/** คำนวณวันที่ปีการศึกษาไทยจาก พ.ศ. */
export function yearBeToDates(yearBe: number) {
  const yearCe = yearBe - 543;
  return {
    start_date: `${yearCe}-05-16`,
    end_date: `${yearCe + 1}-03-31`,
    term_open_date: `${yearCe}-05-16`,
    semester1_start: `${yearCe}-05-16`,
    semester1_end: `${yearCe}-10-11`,
    semester2_start: `${yearCe}-11-01`,
    semester2_end: `${yearCe + 1}-03-31`,
  };
}

export function formatThaiDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

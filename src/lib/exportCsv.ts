/** Util kecil untuk export array of objects ke CSV (kompatibel Excel). */
export function exportToCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  headers?: { key: keyof T; label: string }[],
) {
  if (!rows.length) return;
  const cols =
    headers ?? (Object.keys(rows[0]) as (keyof T)[]).map((k) => ({ key: k, label: String(k) }));

  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };

  const csv = [
    cols.map((c) => escape(c.label)).join(","),
    ...rows.map((r) => cols.map((c) => escape(r[c.key])).join(",")),
  ].join("\n");

  // BOM agar Excel mengenali UTF-8
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

import React, { useMemo } from "react";

/************************* Helpers *************************/
const MONTHS = [
  "enero","febrero","marzo","abril","mayo","junio","julio","agosto","setiembre","octubre","noviembre","diciembre"
];
const toLima = (iso) => {
  const d = new Date(iso);
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utc - 5 * 60 * 60000);
};
const monthKey = (iso) => MONTHS[toLima(iso).getMonth()];
const dayOfMonth = (iso) => toLima(iso).getDate();

/**************** Presentacional (estilo de tu imagen) ****************/
/** data shape
 * {
 *   title: 'CLIENTES POR CATEGORIA',
 *   columns: [{ key:'marzo', label:'MARZO' }, ...],
 *   rows: [
 *     { label:'NUEVOS',        values:{ marzo:0, ... } },
 *     { label:'RECURRENTES',   values:{ marzo:0, ... } },
 *     { label:'RECURRENCIAS POR MES', values:{ marzo:0, ... } },
 *     { label:'TOTAL CLIENTES POR CATEGORIA', values:{ marzo:0, ... }, emphasis:'dark' },
 *   ],
 *   footer: { label:'CLIENTES TOTAL ACUMULADO POR MES', values:{ marzo:0, ... } }
 * }
 */
const fmt2 = (n) => Number(n ?? 0);

export function ClientesCategoriaTable({ data }) {
  const { title, columns, rows, footer } = data;
  return (
    <div className="w-full py-4">
      <div className="w-full bg-black text-white rounded-t-xl">
        <div className="mx-auto max-w-6xl px-4 py-3 text-center text-lg md:text-2xl font-extrabold">
          {title}
        </div>
      </div>

      <div className="overflow-x-auto bg-white shadow-2xl rounded-b-xl ring-1 ring-black/10">
        <table className="w-full table-fixed border-collapse">
          <thead>
           <tr>
              <th className="w-64 fs-3 bg-yellow-400 text-black font-extrabold uppercase border border-black text-left px-3 py-2">MES</th>
              {columns.map((c) => (
                <th key={c.key} className="fs-3 min-w-[120px] bg-yellow-400 text-black border border-black uppercase text-center px-3 py-2">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((r, idx) => {
              const isDark = r.emphasis === 'dark';
              const base = isDark ? 'bg-black text-white' : (idx % 2 ? 'bg-neutral-50' : 'bg-white');
              return (
                <tr key={r.label} className={base}>
                  <td className={`fs-3 border border-black px-3 py-2 text-left font-semibold uppercase`}>{r.label}</td>
                  {columns.map((c) => (
                    <td key={c.key} className={`fs-3 border border-black px-3 py-2 text-right font-semibold text-neutral-800`}>
                      {fmt2(r.values[c.key] ?? 0)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr>
              <td className="bg-yellow-400 text-black border border-black px-3 py-4 fs-3">
                <div className="text-2xl font-extrabold uppercase leading-tight">CLIENTES TOTAL</div>
                <div className="text-sm font-bold uppercase -mt-1">ACUMULADO POR MES</div>
              </td>
              {columns.map((c) => (
                <td key={c.key} className="fs-1 bg-yellow-400 text-black border border-black px-3 py-4 text-right font-extrabold">
                  {fmt2(footer.values[c.key] ?? 0)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/**************** Adapter: ventas -> nuevos/recurrentes/recurrencias ****************/
/**
 * Cuenta por mes (aplicando cutDay):
 *  - NUEVOS: clientes cuyo primer registro (histórico) cae en el mes y día <= cutDay.
 *  - RECURRENTES: clientes que en el mes (<= cutDay) tenían compras previas antes del primer día de ese mes.
 *  - RECURRENCIAS POR MES: número de compras adicionales dentro del mes (<= cutDay) más allá de la primera por cliente.
 *  - TOTAL CLIENTES POR CATEGORIA = NUEVOS + RECURRENTES (clientes únicos del mes).
 */
export function buildCategoriaFromVentas(ventas = [], { columns = [], cutDay = null } = {}) {
  const keys = columns.map((c) => c.key);

  // 1) primer ticket histórico por cliente (no se restringe por cutDay)
  const firstByClient = new Map(); // id_cli -> Date
  ventas.forEach((v) => {
    const idc = v?.id_cli;
    if (idc === null || idc === undefined) return; // ignorar sin id
    const d = toLima(v?.fecha_venta);
    const prev = firstByClient.get(idc);
    if (!prev || d < prev) firstByClient.set(idc, d);
  });

  // 2) agregados por mes aplicando cutDay
  const nuevos = keys.reduce((a, k) => (a[k] = 0, a), {});
  const recurrentes = keys.reduce((a, k) => (a[k] = 0, a), {});
  const recurrenciasMes = keys.reduce((a, k) => (a[k] = 0, a), {});
  const totalMes = keys.reduce((a, k) => (a[k] = 0, a), {});

  // ventas del mes por cliente (para recurrencias)
  const monthClientCount = new Map(); // `${mes}|${id_cli}` -> count

  ventas.forEach((v) => {
    const idc = v?.id_cli;
    if (idc === null || idc === undefined) return;
    const mk = monthKey(v?.fecha_venta);
    if (!keys.includes(mk)) return;

    // aplicar cutDay si corresponde
    if (cutDay && dayOfMonth(v?.fecha_venta) > cutDay) return;

    const key = `${mk}|${idc}`;
    monthClientCount.set(key, (monthClientCount.get(key) || 0) + 1);
  });

  // clientes únicos por mes para clasificar nuevos/recurrentes
  const uniqueClientsByMonth = new Map(); // mes -> Set(id_cli)
  ventas.forEach((v) => {
    const idc = v?.id_cli;
    if (idc === null || idc === undefined) return;
    const mk = monthKey(v?.fecha_venta);
    if (!keys.includes(mk)) return;
    if (cutDay && dayOfMonth(v?.fecha_venta) > cutDay) return;

    if (!uniqueClientsByMonth.has(mk)) uniqueClientsByMonth.set(mk, new Set());
    uniqueClientsByMonth.get(mk).add(idc);
  });

  keys.forEach((mk) => {
    const set = uniqueClientsByMonth.get(mk) || new Set();
    const monthIndex = MONTHS.indexOf(mk);
    const monthStart = new Date(2000, 0, 1); // placeholder
    // reconstruimos un monthStart real usando el índice (solo nos interesa comparar mes/año relativo a primeras compras)
    // Como no tenemos año variable en keys, tratamos "antes del mes" comparando por (mesIndex) solamente.
    // Alternativa práctica: comparar por fecha real de la compra "primera" contra el mes del registro actual.

    set.forEach((idc) => {
      const first = firstByClient.get(idc);
      if (!first) return;
      const fMonth = MONTHS[first.getMonth()];
      const fDay = first.getDate();

      if (fMonth === mk && (!cutDay || fDay <= cutDay)) {
        nuevos[mk] += 1;
      } else if (MONTHS.indexOf(fMonth) < monthIndex) {
        recurrentes[mk] += 1;
      } else if (fMonth === mk && cutDay && fDay < 1) {
        // nunca entra; placeholder por claridad
      }
    });

    // recurrencias = sum(max(0, comprasDelClienteEnMes - 1))
    let extra = 0;
    set.forEach((idc) => {
      const cnt = monthClientCount.get(`${mk}|${idc}`) || 0;
      if (cnt > 1) extra += (cnt - 1);
    });
    recurrenciasMes[mk] = extra;

    totalMes[mk] = nuevos[mk] + recurrentes[mk];
  });

  return {
    rows: [
      { label: 'NUEVOS', values: nuevos },
      { label: 'RECURRENTES', values: recurrentes },
      { label: 'RECURRENCIAS POR MES', values: recurrenciasMes },
      { label: 'TOTAL CLIENTES POR CATEGORIA', values: totalMes, emphasis: 'dark' },
    ],
    footer: { values: totalMes },
  };
}

/**************** Contenedor listo ************************/
export default function ClientesPorCategoria({ ventas = [], columns, title = 'CLIENTES POR CATEGORIA', cutDay = null }) {
  const cols = useMemo(() => (columns && columns.length ? columns : [
    { key: 'marzo',  label: 'MARZO'  },
    { key: 'abril',  label: 'ABRIL'  },
    { key: 'mayo',   label: 'MAYO'   },
    { key: 'junio',  label: 'JUNIO'  },
    { key: 'julio',  label: 'JULIO'  },
    { key: 'agosto', label: 'AGOSTO' },
  ]), [columns]);

  const built = useMemo(() => buildCategoriaFromVentas(ventas, { columns: cols, cutDay }), [ventas, cols, cutDay]);

  const data = useMemo(() => ({ title, columns: cols, rows: built.rows, footer: { label: 'CLIENTES TOTAL ACUMULADO POR MES', values: built.footer.values } }), [title, cols, built]);

  return <ClientesCategoriaTable data={data} />;
}

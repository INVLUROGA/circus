import React from "react";

/**
 * ClientsByOriginTable
 * --------------------------------------------------------------
 * Tabla: "CLIENTES POR ORIGEN DEL <initialDay> HASTA <cutDay>".
 * Cuenta clientes únicos por origen y por mes (o ventas si uniqueByClient = false).
 *
 * Props:
 *  - ventas: Array<{ fecha_venta: ISOString, id_cli: number|string, id_origen: number|string }>
 *  - fechas: Array<{ label: string; anio: string|number; mes: string }>
 *  - initialDay?: number  // default 1
 *  - cutDay?: number      // default 21
 *  - originMap?: Record<string|number, string>
 *  - uniqueByClient?: boolean // default true (si false, cuenta ventas)
 */
export const ClientesPorOrigen = ({
  ventas = [],
  fechas = [],
  initialDay = 1,
  cutDay = 21,
  originMap = {
    1454: "WALK-IN",
    1455: "DIGITAL",
    1456: "REFERIDO",
    1457: "CARTERA",
  },
  uniqueByClient = true,
}) => {
  // --------------------------- Helpers ---------------------------
  const MESES = [
    "enero","febrero","marzo","abril","mayo","junio",
    "julio","agosto","setiembre","octubre","noviembre","diciembre",
  ];

  const aliasMes = (m) =>
    (m === "septiembre" ? "setiembre" : String(m || "").toLowerCase());

  const monthIdx = (mes) => MESES.indexOf(aliasMes(mes));

  const toLimaDate = (iso) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
      return new Date(utcMs - 5 * 60 * 60000); // UTC-5
    } catch {
      return null;
    }
  };

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const labelOfOrigin = (id) => {
    const k = String(id ?? "0");
    return String(originMap?.[k] || originMap?.[Number(k)] || k).toUpperCase();
  };

  // --------------------------- Aggregation ---------------------------
  // Meses visibles (en el orden llegado por `fechas`)
  const monthKeys = (fechas || []).map((f) => ({
    key: `${f.anio}-${aliasMes(f.mes)}`,
    anio: Number(f.anio),
    mes: aliasMes(f.mes),
    label: String(f.label || "").toUpperCase(),
    idx: monthIdx(f.mes),
  }));

  // Estructura: Map<keyMes, Map<origin, Set|number>>
  const base = new Map();
  monthKeys.forEach((m) => base.set(m.key, new Map()));

  for (const v of ventas) {
    const d = toLimaDate(v?.fecha_venta);
    if (!d) continue;

    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const from = clamp(Number(initialDay || 1), 1, last);
    const to = clamp(Number(cutDay || last), from, last);
    const dia = d.getDate();
    if (dia < from || dia > to) continue;

    const mesAliased = MESES[d.getMonth()];
    const keyMes = `${d.getFullYear()}-${mesAliased}`;
    if (!base.has(keyMes)) continue; // sólo contamos lo que se muestra

    const originId = v?.id_origen ?? 0;
    const origin = labelOfOrigin(originId);

    const bucket = base.get(keyMes);
    if (!bucket.has(origin)) bucket.set(origin, uniqueByClient ? new Set() : 0);

    if (uniqueByClient) {
      const set = bucket.get(origin);
      const idCli = v?.id_cli ?? `venta-${v?.id ?? Math.random()}`;
      set.add(String(idCli));
    } else {
      bucket.set(origin, Number(bucket.get(origin) || 0) + 1);
    }
  }

  // Orígenes presentes + los del originMap (aunque queden en 0)
  const allOrigins = new Set();
  for (const m of base.values()) for (const o of m.keys()) allOrigins.add(o);
  Object.values(originMap || {}).forEach((name) =>
    allOrigins.add(String(name).toUpperCase())
  );

  // Orden base: primero en el orden del originMap, luego alfabético
  const prefer = Object.values(originMap || {}).map((n) => String(n).toUpperCase());
  const orderedOrigins = Array.from(allOrigins).sort((a, b) => {
    const ia = prefer.indexOf(a);
    const ib = prefer.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });

  const getCount = (keyMes, origin) => {
    const m = base.get(keyMes);
    if (!m) return 0;
    const v = m.get(origin);
    if (!v) return 0;
    return uniqueByClient ? v.size : Number(v);
  };

  const lastMonthKey = monthKeys[monthKeys.length - 1]?.key;

  const sortedOrigins = React.useMemo(() => {
    if (!lastMonthKey) return orderedOrigins;
    return [...orderedOrigins].sort((a, b) => {
      const vb = getCount(lastMonthKey, b);
      const va = getCount(lastMonthKey, a);
      if (vb !== va) return vb - va; // descendente por último mes
      const sumA = monthKeys.reduce((acc, m) => acc + getCount(m.key, a), 0);
      const sumB = monthKeys.reduce((acc, m) => acc + getCount(m.key, b), 0);
      return sumB - sumA; // desempate por total
    });
  }, [orderedOrigins, monthKeys, lastMonthKey]);
const filteredOrigins = React.useMemo(() => {
  return sortedOrigins.filter((origin) => {
    if (!origin || origin === "0" || origin.trim() === "") return false;
    const total = monthKeys.reduce((acc, m) => acc + getCount(m.key, origin), 0);
    return total > 0;
  });
}, [sortedOrigins, monthKeys]);
  // --------------------------- Styles ---------------------------
  const C = {
    black: "#000000",
    gold: "#EEBE00",
    white: "#ffffff",
    border: "1px solid #333",
  };

  const sTitle = {
    background: C.black,
    color: C.white,
    textAlign: "center",
    padding: "25px 12px",
    fontWeight: 700,
    letterSpacing: 0.2,
    fontSize: 25,
  };

  const sTable = { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" };
  const sHeadLeft = {
    background: C.gold,
    color: C.white,
    padding: "10px",
    border: C.border,
    textAlign: "left",
    width: 260,
  };
  const sHead = {
    background: C.gold,
    color: C.white,
    padding: "10px",
    border: C.border,
    textAlign: "center",
  };
  const sCell = {
    background: C.white,
    color: "#000",
    padding: "10px",
    border: C.border,
    fontSize: 19,
    textAlign: "center",
  };
  const sCellLeft = { ...sCell, textAlign: "left", fontWeight: 700, fontSize: 15 };

  // --------------------------- Render ---------------------------
  return (
  <div style={{ fontFamily: "Inter, system-ui, Segoe UI, Roboto, sans-serif" }}>
    <div style={sTitle}>
      CLIENTES POR ORIGEN DEL {initialDay} HASTA {cutDay}
    </div>

    <table style={sTable}>
      <thead>
        <tr>
          <th style={sHeadLeft}>ORIGEN</th>
          {monthKeys.map((m, idx) => {
            const isLast = idx === monthKeys.length - 1;
            return (
              <th
                key={m.key}
                style={{
                  ...sHead,
                  background: isLast ? "#ffc000" : sHead.background,
                  color: "#fff",
                  fontSize: isLast ? 22 : sHead.fontSize,
                }}
              >
                {m.label}
              </th>
            );
          })}
        </tr>
      </thead>

      <tbody>
        {filteredOrigins.map((origin) => (
          <tr key={origin}>
<td
  style={{
    ...sCellLeft,
    background: "#EEBE00",
    color: "#fff",
    fontWeight: 800,
  }}
>
  {origin}
</td>

            {monthKeys.map((m, idx) => {
              const value = getCount(m.key, origin);
              const isLast = idx === monthKeys.length - 1;
              return (
                <td
                  key={`${m.key}-${origin}`}
                  style={{
                    ...sCell,
                    background: isLast ? "#ffc000" : sCell.background,
                    color: isLast ? "#fff" : sCell.color,
                    fontWeight: isLast ? 700 : "normal",
                    fontSize: isLast ? 22 : sCell.fontSize,
                  }}
                >
                  {value}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
}
import React, { useState, useMemo } from "react";
import {
  sWrap,
  sTable,
  sThMes,
  sThLeft,
  sCell,
  sCellBold,
  sRowBlack,
  rowBlackStyle,
  rowRedFooterStyle,
  cellBlack,
  cellWhite,
  cellFooterRed,
  cellStyle,
  thStyle,
  pctCellStyle,
  gold,
  chipContainer,
  chipTitle,
  sSelectorContainer,
  sMonthSelect,
} from "./ExecutiveTable.styles";

// === HELPERS ===
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre",
];

const aliasMes = (m) => (m === "septiembre" ? "setiembre" : m);

const normalizeName = (s) => 
  String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();

const toLimaDate = (iso) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
    return new Date(utcMs - 5 * 60 * 60000);
  } catch {
    return null;
  }
};

const getAvailableMonthsFromVentas = (ventas) => {
  const map = new Map();
  ventas.forEach((v) => {
    const d = toLimaDate(v?.fecha_venta || v?.fecha);
    if (!d) return;
    const anio = d.getFullYear();
    const mesIdx = d.getMonth();
    const mesNombre = MESES[mesIdx];
    const label = `${mesNombre.toUpperCase()} ${anio}`;
    const key = `${anio}-${mesNombre}`;
    if (!map.has(key)) {
      map.set(key, { key, label, anio: String(anio), mes: mesNombre, dateObj: d });
    }
  });
  return Array.from(map.values()).sort((a, b) => b.dateObj - a.dateObj);
};

export default function ExecutiveTable({
  ventas = [],
  fechas = [],
  dataMktByMonth = {},
  initialDay = 1,
  cutDay = 27,
  originMap = {},
  selectedMonth,
  tasaCambio = 3.37,
}) {
  
  const [monthOverride, setMonthOverride] = useState(null);
  const allMonthOptions = useMemo(() => getAvailableMonthsFromVentas(ventas), [ventas]);

  // LISTA DE COLABORADORES A MOSTRAR
  const TARGET_EMPLOYEES = [ "MIGUEL", "FELIX", "ANDREA", "KATIA"]; //"YOHANDRI",AGREGAR SI EN UN FUTURO ES NECESARIO

  const finalFechas = useMemo(() => {
    if (!fechas || fechas.length === 0) return [];
    const newFechas = [...fechas];
    if (monthOverride) {
      const foundOption = allMonthOptions.find(o => o.key === monthOverride);
      if (foundOption) {
        newFechas[0] = {
          label: foundOption.label,
          anio: foundOption.anio,
          mes: foundOption.mes
        };
      }
    }
    return newFechas;
  }, [fechas, monthOverride, allMonthOptions]);

  const selectedMonthAlias = selectedMonth
    ? aliasMes((MESES[selectedMonth - 1] || "").toLowerCase())
    : null;

  const isSelectedMonth = (m) => {
    if (!selectedMonthAlias) return false;
    const mesItemAlias = aliasMes(String(m?.mes || "").toLowerCase());
    return mesItemAlias === selectedMonthAlias;
  };

  const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n || 0)));
  const fmtMoney = (n) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(n || 0));
  const fmtNum = (n, d = 0) => new Intl.NumberFormat("es-PE", { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(n || 0));
  const fmtMoneyUSD = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n || 0));

  const getDetalleServicios = (v) => v?.detalle_ventaservicios || v?.detalle_ventaServicios || [];
  const getDetalleProductos = (v) => v?.detalle_ventaProductos || v?.detalle_ventaproductos || [];

  const ORIGIN_SYNONYMS = {
    tiktok: new Set(["1514", "695", "tiktok", "tik tok", "tik-tok"]),
    facebook: new Set(["694", "facebook", "fb"]),
    instagram: new Set(["693", "instagram", "ig"]),
    meta: new Set(["1515", "meta"]),
  };

  const canonicalKeyFromRaw = (originMap, raw) => {
    const rawStr = String(raw ?? "").trim();
    const mapped = originMap?.[rawStr] ?? originMap?.[Number(rawStr)] ?? rawStr;
    const low = String(mapped).trim().toLowerCase();
    for (const [key, set] of Object.entries(ORIGIN_SYNONYMS)) {
      if (set.has(low) || set.has(rawStr.toLowerCase()) || set.has(String(raw).toLowerCase())) return key;
    }
    return low.replace(/\s+/g, "_");
  };

  const labelFromKey = (key) => {
    if (key === "tiktok") return "TIKTOK";
    if (key === "facebook") return "FACEBOOK";
    if (key === "instagram") return "INSTAGRAM";
    if (key === "meta") return "META (FB+IG)";
    return String(key || "OTROS").replace(/_/g, " ").toUpperCase();
  };

  function computeMetricsForMonth(anio, mesNombre) {
    const mesAlias = aliasMes(String(mesNombre).toLowerCase());
    const monthIdx = MESES.indexOf(mesAlias);
    if (monthIdx < 0) return null;

    let totalServ = 0, cantServ = 0, totalProd = 0, cantProd = 0;
    let totalServFull = 0, cantServFull = 0, totalProdFull = 0, cantProdFull = 0;

    const byOrigin = {};
    const byOriginFull = {};
    const byOriginCliSet = {};
    const byOriginCliSetFull = {};

    // Acumulador por Empleado
    const byEmployee = {}; 

    let metaServTotalCut = 0, metaServCantCut = 0;
    let metaServTotalFull = 0, metaServCantFull = 0;
    const metaCliSetCut = new Set();
    const metaCliSetFull = new Set();

    const addTo = (bucket, key, label, linea, cantidad) => {
      if (!bucket[key]) bucket[key] = { label, total: 0, cant: 0 };
      bucket[key].total += Number(linea || 0);
      bucket[key].cant += Number(cantidad || 0);
    };
    
    // === CORRECCIÓN: AHORA RECIBE idCli PARA CONTAR CLIENTES ===
    const addToEmployee = (empNameRaw, linea, cantidad, idCli) => {
        const nameNorm = normalizeName(empNameRaw);
        // Busca coincidencia parcial (ej: "MIGUEL" en "MIGUEL ANGEL")
        const target = TARGET_EMPLOYEES.find(t => nameNorm.includes(t));
        
        if (target) {
            if (!byEmployee[target]) byEmployee[target] = { label: target, total: 0, cant: 0, clients: new Set() };
            byEmployee[target].total += Number(linea || 0);
            byEmployee[target].cant += Number(cantidad || 0);
            if (idCli) byEmployee[target].clients.add(String(idCli)); // Agrega al set de clientes únicos
        }
    };

    const addCli = (map, key, idCli) => {
      if (!map[key]) map[key] = new Set();
      map[key].add(String(idCli));
    };

    const from = clamp(Number(initialDay || 1), 1, 31);

    for (const v of ventas) {
      const d = toLimaDate(v?.fecha_venta);
      if (!d) continue;
      if (d.getFullYear() !== Number(anio)) continue;
      if (d.getMonth() !== monthIdx) continue;

      const pagos = v?.detalleVenta_pagoVenta || v?.detalle_pagoVenta || [];
      const totalPagado = pagos.reduce((acc, p) => acc + Number(p.monto || p.parcial_monto || 0), 0);

      const rawServs = getDetalleServicios(v);
      const rawProds = getDetalleProductos(v);
      let totalTeorico = 0;
      rawServs.forEach(s => totalTeorico += Number(s.cantidad||1) * Number(s.tarifa_monto||0));
      rawProds.forEach(p => totalTeorico += Number(p.cantidad||1) * Number(p.tarifa_monto||p.precio_unitario||0));

      let factor = totalTeorico > 0 ? totalPagado / totalTeorico : 0;

      const rawOrigin = v?.id_origen ?? v?.parametro_origen?.id_param ?? v?.origen;
      const oKey = canonicalKeyFromRaw(originMap, rawOrigin);
      const oLabel = labelFromKey(oKey);
      const idCli = v?.id_cli ?? `venta-${v?.id}`;

      // FULL MES
      if (rawServs.length > 0) {
        if (oKey !== "meta") addCli(byOriginCliSetFull, oKey, idCli);
        else metaCliSetFull.add(String(idCli));
      }
      for (const s of rawServs) {
        const cant = Number(s.cantidad || 1);
        const linea = Number(s.tarifa_monto || 0) * cant * factor;
        totalServFull += linea; cantServFull += cant;
        if (oKey !== "meta") addTo(byOriginFull, oKey, oLabel, linea, cant);
        else { metaServTotalFull += linea; metaServCantFull += cant; }
      }
      for (const p of rawProds) {
        const cant = Number(p.cantidad || 1);
        const linea = Number(p.tarifa_monto || p.precio_unitario || 0) * cant * factor;
        totalProdFull += linea; cantProdFull += cant;
      }

      // === CORTE ===
      const lastDay = new Date(Number(anio), monthIdx + 1, 0).getDate();
      const to = clamp(Number(cutDay || lastDay), from, lastDay);
      
      if (d.getDate() < from || d.getDate() > to) continue;

      if (rawServs.length > 0) {
        if (oKey !== "meta") addCli(byOriginCliSet, oKey, idCli);
        else metaCliSetCut.add(String(idCli));
      }

      // --- PROCESAR SERVICIOS ---
      for (const s of rawServs) {
        const cant = Number(s.cantidad || 1);
        const linea = Number(s.tarifa_monto || 0) * cant * factor;
        totalServ += linea; cantServ += cant;
        
        if (oKey !== "meta") addTo(byOrigin, oKey, oLabel, linea, cant);
        else { metaServTotalCut += linea; metaServCantCut += cant; }

        // ACUMULAR EMPLEADO + CLIENTE
        const empName = s?.empleado_servicio?.nombres_apellidos_empl || "";
        addToEmployee(empName, linea, cant, idCli); // Pasamos idCli
      }

      // --- PROCESAR PRODUCTOS ---
      for (const p of rawProds) {
        const cant = Number(p.cantidad || 1);
        const linea = Number(p.tarifa_monto || p.precio_unitario || 0) * cant * factor;
        totalProd += linea; cantProd += cant;

        // ACUMULAR EMPLEADO + CLIENTE
        const empName = p?.empleado_producto?.nombres_apellidos_empl || "";
        addToEmployee(empName, linea, cant, idCli); // Pasamos idCli
      }
    }

    // Reparto META
    const keyMonth = `${anio}-${mesAlias}`;
    const mk = dataMktByMonth?.[keyMonth] || {};
    const por_red = mk?.por_red || {};
    const rawFB = Number(por_red?.facebook || 0);
    const rawIG = Number(por_red?.instagram || 0);
    let fbShare = 0.5, igShare = 0.5;
    if (rawFB + rawIG > 0) { fbShare = rawFB / (rawFB + rawIG); igShare = 1 - fbShare; }

    if (metaServTotalCut > 0) {
      addTo(byOrigin, "facebook", "FACEBOOK", metaServTotalCut * fbShare, metaServCantCut * fbShare);
      addTo(byOrigin, "instagram", "INSTAGRAM", metaServTotalCut * igShare, metaServCantCut * igShare);
    }
    
    const invVal = (kArr) => kArr.reduce((a, k) => a + Number(por_red?.[k] ?? 0), 0);
    const invMetaUSD = invVal(["1515", "meta", "facebook", "instagram"]);
    const invTikTokUSD = invVal(["1514", "tiktok", "tik tok"]);
    const invMetaPEN = invMetaUSD ; 
    const invTikTokPEN = invTikTokUSD/(tasaCambio) *tasaCambio;
    const invTotalPEN = invMetaUSD * tasaCambio + invTikTokPEN;
  
    const leads_por_red = mk?.leads_por_red || {};
    const leadVal = (kArr) => kArr.reduce((a, k) => a + Number(leads_por_red?.[k] ?? 0), 0);
    const leadsMeta = leadVal(["1515", "meta", "facebook", "instagram", "1452", "1453", "1454"]);
    const leadsTikTok = leadVal(["1514", "tiktok", "tik tok", "1526"]);
    const leadsTotal = leadsMeta + leadsTikTok;

    const safeDiv0 = (n, d) => (Number(d) > 0 ? n / d : 0);
    const cplMeta = safeDiv0(invMetaPEN, leadsMeta);
    const cplTikTok = safeDiv0(invTikTokPEN, leadsTikTok);
    const cplTotal = safeDiv0(invTotalPEN, leadsTotal);

    const clientesMetaReal = Number(mk?.clientes_meta ?? 0);
    const clientesTikTokReal = Number(mk?.clientes_tiktok ?? 0);
    const clientesTotalReal = clientesMetaReal + clientesTikTokReal;
    const cacMeta = safeDiv0(invMetaPEN, clientesMetaReal);
    const cacTikTok = safeDiv0(invTikTokPEN, clientesTikTokReal);
    const cacTotal = safeDiv0(invTotalPEN, clientesTotalReal);

    const byOriginCli = Object.fromEntries(Object.entries(byOriginCliSet).map(([k, s]) => [k, s.size]));

    return {
      invMetaPEN, leadsMeta, cplMeta, cacMeta,
      invTikTokPEN, leadsTikTok, cplTikTok, cacTikTok,
      invTotalPEN, leadsTotal, cplTotal, cacTotal,
      totalServ, cantServ, ticketServ: cantServ ? totalServ/cantServ : 0,
      totalProd, cantProd, ticketProd: cantProd ? totalProd/cantProd : 0,
      totalMes: totalServ + totalProd,
      totalServFull, totalProdFull, totalMesFull: totalServFull + totalProdFull,
      byOrigin, byEmployee, 
      byOriginCli
    };
  }

  const perMonth = finalFechas.map((f) => ({
    label: String(f?.label || "").toUpperCase(),
    anio: f?.anio,
    mes: String(f?.mes || "").toLowerCase(),
    metrics: computeMetricsForMonth(f?.anio, f?.mes),
  }));

  const selectedMonthKey = selectedMonth ? aliasMes(MESES[selectedMonth - 1]) : "";
  const getVentaMesSeleccionado = (key) => {
    if (!selectedMonthAlias) return 0;
    const mData = perMonth.find(m => aliasMes(m.mes) === selectedMonthAlias);
    return Number(mData?.metrics?.byOrigin?.[key]?.total || 0);
  };
  const sumTotalServ = (key) => perMonth.reduce((acc, m) => acc + Number(m?.metrics?.byOrigin?.[key]?.total || 0), 0);

  const originKeysAll = Array.from(new Set(perMonth.flatMap((m) => Object.keys(m.metrics?.byOrigin || {}))))
    .filter((k) => k !== "meta");

  const sortedOriginKeys = [...originKeysAll].sort((a, b) => {
    const valA = getVentaMesSeleccionado(a);
    const valB = getVentaMesSeleccionado(b);
    if (valA !== valB) return valB - valA;
    return a.localeCompare(b);
  });

  const getPerMonthSortedByOrigin = (okey) => [...perMonth].sort((a, b) => {
    const totalA = Number(a.metrics?.byOrigin?.[okey]?.total || 0);
    const totalB = Number(b.metrics?.byOrigin?.[okey]?.total || 0);
    return totalA - totalB;
  });

  const getPerMonthSortedByEmployee = (empKey) => [...perMonth].sort((a, b) => {
    const totalA = Number(a.metrics?.byEmployee?.[empKey]?.total || 0);
    const totalB = Number(b.metrics?.byEmployee?.[empKey]?.total || 0);
    return totalA - totalB;
  });

  const rows = [
    { key: "invMetaPEN", label: "INVERSIÓN META", type: "money-usd" },
    { key: "leadsMeta", label: "CANTIDAD LEADS META", type: "int" },
    { key: "cplMeta", label: "COSTO POR LEAD META", type: "float2-usd" },
    { key: "cacMeta", label: "COSTO ADQUISICION DE CLIENTES META", type: "float2-usd" },
    { key: "invTikTokPEN", label: "INVERSIÓN TIKTOK", type: "money" },
    { key: "leadsTikTok", label: "CANTIDAD LEADS TIKTOK", type: "int" },
    { key: "cplTikTok", label: "COSTO POR LEAD TIKTOK", type: "float2" },
    { key: "cacTikTok", label: "COSTO ADQUISICION DE CLIENTES TIKTOK", type: "float2" },
    { key: "invTotalPEN", label: "INVERSIÓN TOTAL REDES", type: "money" },
    { key: "leadsTotal", label: "TOTAL LEADS DE META + TIKTOK", type: "int" },
    { key: "cplTotal", label: "COSTO TOTAL POR LEADS", type: "float2" },
    { key: "cacTotal", label: "COSTO ADQUISICION DE CLIENTES", type: "float2" },
    { key: "totalServ", label: "VENTA SERVICIOS", type: "money" },
    { key: "cantServ", label: "CANTIDAD SERVICIOS", type: "int" },
    { key: "ticketServ", label: "TICKET MEDIO SERVICIOS", type: "money" },
    { key: "totalProd", label: "VENTA PRODUCTOS", type: "money" },
    { key: "cantProd", label: "CANTIDAD PRODUCTOS", type: "int" },
    { key: "ticketProd", label: "TICKET MEDIO PRODUCTOS", type: "money" },
  ];
  const rowsParte1 = rows.slice(0, 12);
  const rowsParte2 = rows.slice(12);

  const rowsPerOrigin = (okey) => [
    { key: `o:${okey}:total`, label: "VENTA SERVICIOS", type: "money" },
    { key: `o:${okey}:cant`, label: "CANTIDAD SERVICIOS", type: "int" },
    { key: `o:${okey}:cli`, label: "CANTIDAD CLIENTES", type: "int" },
    { key: `o:${okey}:ticket`, label: "TICKET MEDIO SERVICIOS", type: "money" },
    { key: `o:${okey}:pct`, label: "% PARTICIPACIÓN", type: "float2" },
  ];

  // === FILAS PARA EMPLEADO: ACTIVADO CLIENTES ===
  const rowsPerEmployee = (empKey) => [
    { key: `e:${empKey}:total`, label: "VENTA SERVICIOS", type: "money" },
    { key: `e:${empKey}:cant`, label: "CANTIDAD SERVICIOS", type: "int" },
    { key: `e:${empKey}:cli`, label: "CLIENTES ATENDIDOS", type: "int" }, 
    { key: `e:${empKey}:ticket`, label: "TICKET MEDIO SERVICIOS", type: "money" },
    { key: `e:${empKey}:pct`, label: "% PARTICIPACIÓN VENTA", type: "float2" },
  ];

  const MonthSelector = ({ currentKey, onChange }) => {
    const otherDisplayedKeys = new Set(
      finalFechas.slice(1).map(f => `${f.anio}-${aliasMes(String(f.mes || "").toLowerCase())}`)
    );
    const available = allMonthOptions.filter(o => !otherDisplayedKeys.has(`${o.anio}-${aliasMes(String(o.mes || "").toLowerCase())}`));

    return (
      <div style={sSelectorContainer}>
        <select
          value={currentKey}
          onChange={(e) => onChange(e.target.value)}
          style={sMonthSelect}
          onClick={(e) => e.stopPropagation()} 
        >
          {available.map(opt => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  };

  const TableHeadForEmployee = ({ empKey }) => {
    const perMonthSorted = getPerMonthSortedByEmployee(empKey);
    return (
      <thead>
        <tr>
          <th style={{ ...sThLeft, background: gold, color: "#000" }} />
          {perMonthSorted.map((m, idx) => {
            const highlight = isSelectedMonth(m);
            const currentKey = `${m.anio}-${aliasMes(String(m.mes).toLowerCase())}`;
            const isFirstColumnOriginal = (
              String(m.anio) === String(finalFechas[0].anio) && 
              aliasMes(String(m.mes).toLowerCase()) === aliasMes(String(finalFechas[0].mes).toLowerCase())
            );
            return (
              <th key={idx} style={thStyle(highlight)}>
                {isFirstColumnOriginal ? (
                  <MonthSelector currentKey={currentKey} onChange={setMonthOverride} />
                ) : (
                  m.label
                )}
              </th>
            );
          })}
        </tr>
      </thead>
    );
  };

  const renderRowsForEmployee = (empKey, rowsToRender) => {
    const perMonthSorted = getPerMonthSortedByEmployee(empKey);
    return rowsToRender.map((r) => (
      <tr key={r.key}>
        <td style={{ ...sCellBold, background: gold, color: "#000", fontWeight: 800 }}>
          {r.label}
        </td>
        {perMonthSorted.map((m, idx) => {
          const eData = m.metrics?.byEmployee?.[empKey] || { total: 0, cant: 0 };
          let val = 0, isPct = false;

          if (r.key.endsWith(":total")) val = eData.total;
          else if (r.key.endsWith(":cant")) val = eData.cant;
          else if (r.key.endsWith(":cli")) val = eData.clients ? eData.clients.size : 0; // <--- TOMA EL TAMAÑO DEL SET
          else if (r.key.endsWith(":ticket")) val = eData.cant ? eData.total / eData.cant : 0;
          else if (r.key.endsWith(":pct")) {
            const base = Number(m.metrics?.totalMes || 0);
            val = base > 0 ? (eData.total / base) * 100 : 0;
            isPct = true;
          }
          const txt = isPct 
            ? `${fmtNum(val, 2)} %` 
            : r.type === "money" 
            ? fmtMoney(val) 
            : r.type === "int" 
            ? fmtNum(val, 0) 
            : fmtNum(val, 2);

          const highlight = isSelectedMonth(m);
          return (
            <td key={idx} style={cellStyle(highlight)}>
              {txt}
            </td>
          );
        })}
      </tr>
    ));
  };

  const TableHeadForOrigin = ({ okey }) => {
    const perMonthSorted = getPerMonthSortedByOrigin(okey);
    return (
      <thead>
        <tr>
          <th style={{ ...sThLeft, background: gold, color: "#000" }} />
          {perMonthSorted.map((m, idx) => {
            const highlight = isSelectedMonth(m);
            const currentKey = `${m.anio}-${aliasMes(String(m.mes).toLowerCase())}`;
            const isFirstColumnOriginal = (
                String(m.anio) === String(finalFechas[0].anio) && 
                aliasMes(String(m.mes).toLowerCase()) === aliasMes(String(finalFechas[0].mes).toLowerCase())
              );
            return (
              <th key={idx} style={thStyle(highlight)}>
                 {isFirstColumnOriginal ? (
                  <MonthSelector currentKey={currentKey} onChange={setMonthOverride} />
                ) : (
                  m.label
                )}
              </th>
            );
          })}
        </tr>
      </thead>
    );
  };

  const renderRowsForOrigin = (okey, rowsToRender) => {
    const perMonthSorted = getPerMonthSortedByOrigin(okey);
    return rowsToRender.map((r) => (
      <tr key={r.key}>
        <td style={{ ...sCellBold, background: gold, color: "#000", fontWeight: 800 }}>
          {r.label}
        </td>
        {perMonthSorted.map((m, idx) => {
          const o = m.metrics?.byOrigin?.[okey] || { total: 0, cant: 0 };
          const cliCount = m.metrics?.byOriginCli?.[okey] ?? 0;
          let val = 0, isPct = false;

          if (r.key.endsWith(":total")) val = o.total;
          else if (r.key.endsWith(":cant")) val = o.cant;
          else if (r.key.endsWith(":cli")) val = cliCount;
          else if (r.key.endsWith(":ticket")) val = o.cant ? o.total / o.cant : 0;
          else if (r.key.endsWith(":pct")) {
            const base = Number(m.metrics?.totalServ || 0);
            val = base > 0 ? (o.total / base) * 100 : 0;
            isPct = true;
          }
          const txt = isPct 
            ? `${fmtNum(val, 2)} %` 
            : r.type === "money" 
            ? fmtMoney(val) 
            : r.type === "int" 
            ? fmtNum(val, 0) 
            : fmtNum(val, 2);

          const highlight = isSelectedMonth(m);
          return (
            <td key={idx} style={cellStyle(highlight)}>
              {txt}
            </td>
          );
        })}
      </tr>
    ));
  };

  const TableHead = () => (
    <thead>
      <tr>
        <th style={{ ...sThLeft, background: gold, color: "#000" }} />
        {perMonth.map((m, idx) => {
          const highlight = isSelectedMonth(m);
          const currentKey = `${m.anio}-${aliasMes(String(m.mes).toLowerCase())}`;
          return (
            <th key={idx} style={thStyle(highlight)}>
              {idx === 0 ? (
                <MonthSelector currentKey={currentKey} onChange={setMonthOverride} />
              ) : (
                m.label
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );

  const renderRows = (rowsToRender) =>
    rowsToRender.map((r) => (
      <tr key={r.key}>
        <td style={{ ...sCellBold, background: gold, color: "#000", fontWeight: 800 }}>
          {r.label}
        </td>
        {perMonth.map((m, idx) => {
          const val = m.metrics?.[r.key] ?? 0;
          let txt = "";
          if (r.type === "money") txt = fmtMoney(val);
          else if (r.type === "money-usd") txt = fmtMoneyUSD(val);
          else if (r.type === "float2") txt = fmtNum(val, 2);
          else if (r.type === "float2-usd") txt = `$${fmtNum(val, 2)}`;
          else txt = fmtNum(val, 0);
          const highlight = isSelectedMonth(m);
          return (
            <td key={idx} style={cellStyle(highlight)}>
              {txt}
            </td>
          );
        })}
      </tr>
    ));

  const getCuotaForMonth = () => 50000;
  const cuotaPorMes = perMonth.map((m, i) => getCuotaForMonth(m, i));
  const ventaAlCortePorMes = perMonth.map((m) => m.metrics?.totalMes ?? 0);
  const ventaMesCompletoPorMes = perMonth.map((m) => m.metrics?.totalMesFull ?? 0);
  const alcancePctPorMes = perMonth.map((_, i) => (cuotaPorMes[i] || 0) > 0 ? (ventaAlCortePorMes[i] / cuotaPorMes[i]) * 100 : 0);
  const restantePctPorMes = alcancePctPorMes.map((alc) => alc >= 100 ? 0 : 100 - alc);

  return (
    <div style={sWrap}>
      <div style={chipContainer}>
        {sortedOriginKeys.map((okey) => (
          <div key={okey} style={{ marginTop: 40 }}>
            <div style={chipContainer}>
              <span style={chipTitle}>{labelFromKey(okey)}</span>
            </div>
            <table style={sTable}>
              <TableHeadForOrigin okey={okey} />
              <tbody>{renderRowsForOrigin(okey, rowsPerOrigin(okey))}</tbody>
            </table>
          </div>
        ))}
        
        <div style={{width:'100%', marginTop: 60, marginBottom: 20, borderBottom:'2px solid #000'}}/>
        <span style={{...chipTitle, background: '#000', color: gold, padding: '10px 20px', borderRadius: 8}}>
            RENDIMIENTO POR COLABORADOR
        </span>

        {TARGET_EMPLOYEES.map((empKey) => (
          <div key={empKey} style={{ marginTop: 40 }}>
            <div style={chipContainer}>
              <span style={chipTitle}>{empKey}</span>
            </div>
            <table style={sTable}>
              <TableHeadForEmployee empKey={empKey} />
              <tbody>{renderRowsForEmployee(empKey, rowsPerEmployee(empKey))}</tbody>
            </table>
          </div>
        ))}

        <div style={{width:'100%', marginTop: 60, marginBottom: 20, borderBottom:'2px solid #000'}}/>
        <span style={chipTitle}>DETALLE DE INVERSIÓN EN REDES VS RESULTADOS EN LEADS</span>
      </div>

      <table style={sTable}>
        <TableHead />
        <tbody>{renderRows(rowsParte1)}</tbody>
      </table>

      <div style={chipContainer}>
        <span style={chipTitle}>DETALLE DE VENTAS AL {cutDay}</span>
      </div>

      <table style={sTable}>
        <TableHead />
        <tbody>{renderRows(rowsParte2)}</tbody>
        <tfoot>
          <tr style={sRowBlack}>
            <td style={cellBlack}>VENTA TOTAL AL {cutDay}</td>
            {perMonth.map((m, idx) => (
              <td key={idx} style={cellBlack}>{fmtMoney(m.metrics?.totalMes || 0)}</td>
            ))}
          </tr>
          <tr>
            <td style={{ ...sCellBold, background: gold, color: "#fff", textAlign: "center", fontWeight: 800 }} />
            {perMonth.map((m, idx) => (
              <td key={`footer-month-${idx}`} style={{ ...sCellBold, background: gold, color: "#000", textAlign: "center" }}>
                {m.label}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>

      <div style={chipContainer}>
        <span style={chipTitle}>ALCANCE DE CUOTA POR MES</span>
      </div>
      <table style={sTable}>
        <thead>
          <tr>
            <th style={{ ...sThLeft, background: "#000", color: "#fff" }} />
            {perMonth.map((m, idx) => (
              <th key={idx} style={{ ...sThMes, background: "#000", color: "#fff" }}>
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...cellWhite, backgroundColor: gold }}>CUOTA DEL MES</td>
            {cuotaPorMes.map((q, i) => <td key={i} style={cellWhite}>{fmtMoney(q)}</td>)}
          </tr>
          <tr>
            <td style={{ ...cellWhite, backgroundColor: gold }}>% ALCANCE DE CUOTA</td>
            {alcancePctPorMes.map((p, i) => <td key={i} style={pctCellStyle(p)}>{`${fmtNum(p, 2)} %`}</td>)}
          </tr>
          <tr>
            <td style={{ ...cellWhite, backgroundColor: gold }}>% RESTANTE PARA CUOTA</td>
            {restantePctPorMes.map((p, i) => <td key={i} style={pctCellStyle(100 - p === 100 ? 100 : 0 + (100 - p))}>{`${fmtNum(p, 2)} %`}</td>)}
          </tr>
        </tbody>
        <tfoot>
          <tr style={rowRedFooterStyle}>
            <td style={cellFooterRed}>VENTA TOTAL MES</td>
            {ventaMesCompletoPorMes.map((m, i) => <td key={i} style={cellFooterRed}>{fmtMoney(m)}</td>)}
          </tr>
          <tr style={rowBlackStyle}>
            <td style={cellBlack}>VENTA TOTAL AL {cutDay}</td>
            {ventaAlCortePorMes.map((m, i) => <td key={i} style={cellBlack}>{fmtMoney(m)}</td>)}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
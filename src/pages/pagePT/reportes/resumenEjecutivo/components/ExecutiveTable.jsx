import React from "react";
// Importamos todos los estilos desde el archivo nuevo
import {
  sWrap,
  sTable,
  sThMes,
  sThLeft,
  sCell,
  sCellBold,
  sRowBlack,
  sRowRed,
  chipContainer,
  chipTitle,
  rowBlackStyle,
  rowRedFooterStyle,
  cellBlack,
  cellWhite,
  cellFooterRed,
  cellStyle,
  thStyle,
  pctCellStyle,
  gold, // Usado inline en algunos backgrounds
} from "./ExecutiveTable.styles";

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
  const MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre",
  ];

  const aliasMes = (m) => (m === "septiembre" ? "setiembre" : m);

  // ==== Mes seleccionado (TopControls) ====
  const selectedMonthAlias = selectedMonth
    ? aliasMes(MESES[selectedMonth - 1])
    : null;

  const isSelectedMonth = (m) => {
    if (!selectedMonthAlias) return false;
    const mesItemAlias = aliasMes(String(m?.mes || "").toLowerCase());
    return mesItemAlias === selectedMonthAlias;
  };

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

  const clamp = (n, min, max) =>
    Math.max(min, Math.min(max, Number(n || 0)));

  // Formateadores
  const fmtMoney = (n) =>
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(Number(n || 0));

  const fmtNum = (n, d = 0) =>
    new Intl.NumberFormat("es-PE", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }).format(Number(n || 0));

  const fmtMoneyUSD = (n) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(n || 0));

  const getDetalleServicios = (v) =>
    v?.detalle_ventaservicios ||
    v?.detalle_ventaServicios ||
    v?.detalle_servicios ||
    v?.detalle_venta_servicios ||
    [];

  const getDetalleProductos = (v) =>
    v?.detalle_ventaProductos || v?.detalle_ventaproductos || [];

  const ORIGIN_SYNONYMS = {
    tiktok: new Set(["1514", "695", "tiktok", "tik tok", "tik-tok"]),
    facebook: new Set(["694", "facebook", "fb"]),
    instagram: new Set(["693", "instagram", "ig"]),
    meta: new Set(["1515", "meta", "1454"]),
  };

  const canonicalKeyFromRaw = (originMap, raw) => {
    const rawStr = String(raw ?? "").trim();
    const mapped =
      originMap?.[rawStr] ?? originMap?.[Number(rawStr)] ?? rawStr;
    const low = String(mapped).trim().toLowerCase();
    for (const [key, set] of Object.entries(ORIGIN_SYNONYMS)) {
      if (
        set.has(low) ||
        set.has(rawStr.toLowerCase()) ||
        set.has(String(raw).toLowerCase())
      )
        return key;
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

  // ================== MÉTRICAS POR MES ==================
  function computeMetricsForMonth(anio, mesNombre) {
    const mesAlias = aliasMes(String(mesNombre).toLowerCase());
    const monthIdx = MESES.indexOf(mesAlias);
    if (monthIdx < 0) return null;

    let totalServ = 0,
      cantServ = 0,
      totalProd = 0,
      cantProd = 0;
    let totalServFull = 0,
      cantServFull = 0,
      totalProdFull = 0,
      cantProdFull = 0;

    const byOrigin = {};
    const byOriginFull = {};
    const byOriginCliSet = {};
    const byOriginCliSetFull = {};

    let metaServTotalCut = 0,
      metaServCantCut = 0;
    let metaServTotalFull = 0,
      metaServCantFull = 0;
    const metaCliSetCut = new Set();
    const metaCliSetFull = new Set();

    const addTo = (bucket, key, label, linea, cantidad) => {
      if (!bucket[key]) bucket[key] = { label, total: 0, cant: 0 };
      bucket[key].total += Number(linea || 0);
      bucket[key].cant += Number(cantidad || 0);
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

      const pagos = Array.isArray(v?.detalleVenta_pagoVenta)
        ? v.detalleVenta_pagoVenta
        : Array.isArray(v?.detalle_pagoVenta)
        ? v.detalle_pagoVenta
        : [];
      const totalPagado = pagos.reduce(
        (acc, p) => acc + Number(p.monto || p.parcial_monto || 0),
        0
      );

      const rawServs = getDetalleServicios(v);
      const rawProds = getDetalleProductos(v);
      let totalTeorico = 0;

      for (const s of rawServs) {
        const c = Number(s?.cantidad || 1);
        const p = Number(s?.tarifa_monto || s?.precio_unitario || 0);
        totalTeorico += c * p;
      }
      for (const p of rawProds) {
        const c = Number(p?.cantidad || 1);
        const pr = Number(p?.tarifa_monto || p?.precio_unitario || 0);
        totalTeorico += c * pr;
      }

      let factor = 1;
      if (totalTeorico > 0) factor = totalPagado / totalTeorico;
      else factor = 0;

      const rawOrigin =
        v?.id_origen ??
        v?.parametro_origen?.id_param ??
        v?.origen ??
        v?.source ??
        v?.canal ??
        v?.parametro_origen?.label_param;

      const oKey = canonicalKeyFromRaw(originMap, rawOrigin);
      const oLabel = labelFromKey(oKey);

      const idCli = v?.id_cli ?? `venta-${v?.id ?? Math.random()}`;

      // FULL MES - SERVICIOS
      if (rawServs.length > 0) {
        if (oKey !== "meta") addCli(byOriginCliSetFull, oKey, idCli);
        else metaCliSetFull.add(String(idCli));
      }

      for (const s of rawServs) {
        const cant = Number(s?.cantidad || 1);
        const precioUnit = Number(
          s?.tarifa_monto || s?.precio_unitario || 0
        );
        const lineaTotal = precioUnit * cant * factor;

        totalServFull += lineaTotal;
        cantServFull += cant;

        if (oKey !== "meta") {
          addTo(byOriginFull, oKey, oLabel, lineaTotal, cant);
        } else {
          metaServTotalFull += lineaTotal;
          metaServCantFull += cant;
        }
      }

      // FULL MES - PRODUCTOS
      for (const p of rawProds) {
        const cant = Number(p?.cantidad || 1);
        const precioUnit = Number(
          p?.tarifa_monto || p?.precio_unitario || 0
        );
        const lineaTotal = precioUnit * cant * factor;
        totalProdFull += lineaTotal;
        cantProdFull += cant;
      }

      // CORTE
      const lastDay = new Date(
        d.getFullYear(),
        d.getMonth() + 1,
        0
      ).getDate();
      const to = clamp(Number(cutDay || lastDay), from, lastDay);
      const dia = d.getDate();
      if (dia < from || dia > to) continue;

      // AL CORTE - SERVICIOS
      if (rawServs.length > 0) {
        if (oKey !== "meta") addCli(byOriginCliSet, oKey, idCli);
        else metaCliSetCut.add(String(idCli));
      }
      for (const s of rawServs) {
        const cant = Number(s?.cantidad || 1);
        const precioUnit = Number(
          s?.tarifa_monto || s?.precio_unitario || 0
        );
        const lineaTotal = precioUnit * cant * factor;

        totalServ += lineaTotal;
        cantServ += cant;

        if (oKey !== "meta") {
          addTo(byOrigin, oKey, oLabel, lineaTotal, cant);
        } else {
          metaServTotalCut += lineaTotal;
          metaServCantCut += cant;
        }
      }

      // AL CORTE - PRODUCTOS
      for (const p of rawProds) {
        const cant = Number(p?.cantidad || 1);
        const precioUnit = Number(
          p?.tarifa_monto || p?.precio_unitario || 0
        );
        const lineaTotal = precioUnit * cant * factor;
        totalProd += lineaTotal;
        cantProd += cant;
      }
    }

    const keyMonth = `${anio}-${mesAlias}`;
    const mk = dataMktByMonth?.[keyMonth] || {};
    const por_red = mk?.por_red || {};
    const val = (obj, k) => Number(obj?.[k] ?? 0);
    const rawFB = val(por_red, "facebook");
    const rawIG = val(por_red, "instagram");

    let fbShare = 0.5,
      igShare = 0.5;
    if (rawFB + rawIG > 0) {
      fbShare = rawFB / (rawFB + rawIG);
      igShare = 1 - fbShare;
    }

    // Reparto META corte
    if (metaServTotalCut > 0) {
      addTo(
        byOrigin,
        "facebook",
        "FACEBOOK",
        metaServTotalCut * fbShare,
        metaServCantCut * fbShare
      );
      addTo(
        byOrigin,
        "instagram",
        "INSTAGRAM",
        metaServTotalCut * igShare,
        metaServCantCut * igShare
      );
    }

    if (metaCliSetCut.size > 0) {
      const tot = metaCliSetCut.size;
      const fbInt = Math.round(tot * fbShare);
      const igInt = Math.max(0, tot - fbInt);
      if (!byOriginCliSet["facebook"])
        byOriginCliSet["facebook"] = new Set();
      if (!byOriginCliSet["instagram"])
        byOriginCliSet["instagram"] = new Set();
      for (let i = 0; i < fbInt; i++)
        byOriginCliSet["facebook"].add(`fb-${i}`);
      for (let i = 0; i < igInt; i++)
        byOriginCliSet["instagram"].add(`ig-${i}`);
    }

    // Reparto META full
    if (metaServTotalFull > 0) {
      addTo(
        byOriginFull,
        "facebook",
        "FACEBOOK",
        metaServTotalFull * fbShare,
        metaServCantFull * fbShare
      );
      addTo(
        byOriginFull,
        "instagram",
        "INSTAGRAM",
        metaServTotalFull * igShare,
        metaServCantFull * igShare
      );
    }

    if (metaCliSetFull.size > 0) {
      const tot = metaCliSetFull.size;
      const fbInt = Math.round(tot * fbShare);
      const igInt = Math.max(0, tot - fbInt);
      if (!byOriginCliSetFull["facebook"])
        byOriginCliSetFull["facebook"] = new Set();
      if (!byOriginCliSetFull["instagram"])
        byOriginCliSetFull["instagram"] = new Set();
      for (let i = 0; i < fbInt; i++)
        byOriginCliSetFull["facebook"].add(`fb-${i}`);
      for (let i = 0; i < igInt; i++)
        byOriginCliSetFull["instagram"].add(`ig-${i}`);
    }

    const ticketServ = cantServ ? totalServ / cantServ : 0;
    const ticketProd = cantProd ? totalProd / cantProd : 0;
    const ticketServFull = cantServFull
      ? totalServFull / cantServFull
      : 0;
    const ticketProdFull = cantProdFull
      ? totalProdFull / cantProdFull
      : 0;

    const safeDiv0 = (n, d) =>
      Number(d || 0) > 0 ? Number(n || 0) / Number(d || 0) : 0;
    const invVal = (kArr) =>
      kArr.reduce(
        (acc, k) => acc + Number(por_red?.[k] ?? 0),
        0
      );

    const invMetaUSD = invVal(["1515", "meta", "facebook", "instagram"]);
    const invTikTokUSD = invVal(["1514", "tiktok", "tik tok"]);

    const invMetaDisplayed = invMetaUSD;
    const invTikTokDisplayed = invTikTokUSD * 1.18;
    const invTotalDisplayed = invMetaUSD * tasaCambio + invTikTokDisplayed;

    const invMetaPEN = invMetaDisplayed;
    const invTikTokPEN = invTikTokDisplayed;
    const invTotalPEN = invTotalDisplayed;

    const leads_por_red = mk?.leads_por_red || {};
    const leadVal = (kArr) =>
      kArr.reduce(
        (acc, k) => acc + Number(leads_por_red?.[k] ?? 0),
        0
      );

    const leadsMeta = leadVal([
      "1515",
      "meta",
      "facebook",
      "instagram",
    ]);
    const leadsTikTok = leadVal(["1514", "tiktok", "tik tok"]);
    const leadsTotal = leadsMeta + leadsTikTok;

    const cplMeta = safeDiv0(invMetaPEN, leadsMeta);
    const cplTikTok = safeDiv0(invTikTokPEN, leadsTikTok);
    const cplTotal = safeDiv0(invTotalPEN, leadsTotal);

    const clientesMetaReal = Number(mk?.clientes_meta ?? 0);
    const clientesTikTokReal = Number(mk?.clientes_tiktok ?? 0);
    const clientesTotalReal =
      clientesMetaReal + clientesTikTokReal;

    const cacMeta = safeDiv0(invMetaPEN, clientesMetaReal);
    const cacTikTok = safeDiv0(invTikTokPEN, clientesTikTokReal);
    const cacTotal = safeDiv0(invTotalPEN, clientesTotalReal);

    const byOriginCli = Object.fromEntries(
      Object.entries(byOriginCliSet).map(([k, s]) => [
        k,
        s?.size || 0,
      ])
    );
    const byOriginCliFull = Object.fromEntries(
      Object.entries(byOriginCliSetFull).map(([k, s]) => [
        k,
        s?.size || 0,
      ])
    );

    return {
      invMetaPEN,
      leadsMeta,
      cplMeta,
      cacMeta,
      invTikTokPEN,
      leadsTikTok,
      cplTikTok,
      cacTikTok,
      invTotalPEN,
      leadsTotal,
      cplTotal,
      cacTotal,
      totalServ,
      cantServ,
      ticketServ,
      totalProd,
      cantProd,
      ticketProd,
      totalMes: totalServ + totalProd,
      totalServFull,
      cantServFull,
      ticketServFull,
      totalProdFull,
      cantProdFull,
      ticketProdFull,
      totalMesFull: totalServFull + totalProdFull,
      byOrigin,
      byOriginFull,
      byOriginCli,
      byOriginCliFull,
    };
  }

  // ================== DEFINICIÓN DE FILAS ==================
  const rows = [
    { key: "invTotalPEN", label: "INVERSIÓN TOTAL REDES", type: "money" },
    { key: "leadsTotal", label: "TOTAL LEADS DE META + TIKTOK", type: "int" },
    {
      key: "cplTotal",
      label: "COSTO TOTAL POR LEADS DE META + TIKTOK",
      type: "float2",
    },
    {
      key: "cacTotal",
      label: "COSTO ADQUISICION DE CLIENTES",
      type: "float2",
    },
    { key: "invMetaPEN", label: "INVERSIÓN META", type: "money-usd" },
    { key: "leadsMeta", label: "CANTIDAD LEADS META", type: "int" },
    { key: "cplMeta", label: "COSTO POR LEAD META", type: "float2-usd" },
    {
      key: "cacMeta",
      label: "COSTO ADQUISICION DE CLIENTES META",
      type: "float2-usd",
    },
    { key: "invTikTokPEN", label: "INVERSIÓN TIKTOK", type: "money" },
    { key: "leadsTikTok", label: "CANTIDAD LEADS TIKTOK", type: "int" },
    { key: "cplTikTok", label: "COSTO POR LEAD TIKTOK", type: "float2" },
    {
      key: "cacTikTok",
      label: "COSTO ADQUISICION DE CLIENTES TIKTOK",
      type: "float2",
    },
    { key: "totalServ", label: "VENTA SERVICIOS", type: "money" },
    { key: "cantServ", label: "CANTIDAD SERVICIOS", type: "int" },
    {
      key: "ticketServ",
      label: "TICKET MEDIO SERVICIOS",
      type: "money",
    },
    { key: "totalProd", label: "VENTA PRODUCTOS", type: "money" },
    { key: "cantProd", label: "CANTIDAD PRODUCTOS", type: "int" },
    {
      key: "ticketProd",
      label: "TICKET MEDIO PRODUCTOS",
      type: "money",
    },
  ];

  const rowsParte1 = rows.slice(0, 12);
  const rowsParte2 = rows.slice(12);

  // ================== perMonth BASE (orden original) ==================
  const perMonth = (fechas || []).map((f) => ({
    label: String(f?.label || "").toUpperCase(),
    anio: f?.anio,
    mes: String(f?.mes || "").toLowerCase(),
    metrics: computeMetricsForMonth(f?.anio, f?.mes),
  }));

  // Helper: ordenar meses POR ORIGEN según VENTA SERVICIOS (ASCENDENTE)
  const getPerMonthSortedByOrigin = (okey) =>
    [...perMonth].sort((a, b) => {
      const totalA = Number(a.metrics?.byOrigin?.[okey]?.total || 0);
      const totalB = Number(b.metrics?.byOrigin?.[okey]?.total || 0);
      return totalA - totalB; // ascendente -> menor venta primero
    });

  // Orígenes ordenados globalmente por venta total (para el orden de las secciones)
  const originKeysAll = Array.from(
    new Set(
      perMonth.flatMap((m) => Object.keys(m.metrics?.byOrigin || {}))
    )
  ).filter((k) => k !== "meta");

  const sumTotalServ = (key) =>
    perMonth.reduce(
      (acc, m) => acc + Number(m?.metrics?.byOrigin?.[key]?.total || 0),
      0
    );

  const sortedOriginKeys = [...originKeysAll].sort((a, b) => {
    const sb = sumTotalServ(b);
    const sa = sumTotalServ(a);
    if (sb !== sa) return sb - sa; // descendente por venta total
    return a.localeCompare(b);
  });

  const rowsPerOrigin = (okey) => [
    { key: `o:${okey}:total`, label: "VENTA SERVICIOS", type: "money" },
    { key: `o:${okey}:cant`, label: "CANTIDAD SERVICIOS", type: "int" },
    { key: `o:${okey}:cli`, label: "CANTIDAD CLIENTES", type: "int" },
    {
      key: `o:${okey}:ticket`,
      label: "TICKET MEDIO SERVICIOS",
      type: "money",
    },
    { key: `o:${okey}:pct`, label: "% PARTICIPACIÓN", type: "float2" },
  ];

  // ================== CABECERAS TABLAS GENERALES ==================
  const TableHead = () => (
    <thead>
      <tr>
        <th style={{ ...sThLeft, background: gold, color: "#000" }} />
        {perMonth.map((m, idx) => {
          const highlight = isSelectedMonth(m);
          return (
            <th key={idx} style={thStyle(highlight)}>
              {m.label}
            </th>
          );
        })}
      </tr>
    </thead>
  );

  const renderRows = (rowsToRender) =>
    rowsToRender.map((r) => (
      <tr key={r.key}>
        <td
          style={{
            ...sCellBold,
            background: gold,
            color: "#000",
            fontWeight: 800,
          }}
        >
          {r.label}
        </td>
        {perMonth.map((m, idx) => {
          const val = m.metrics?.[r.key] ?? 0;

          let txt = "";
          if (r.type === "money") txt = fmtMoney(val);
          else if (r.type === "money-usd") txt = fmtMoneyUSD(val);
          else if (r.type === "float2") txt = fmtNum(val, 2);
          else if (r.type === "float2-usd") {
            const symbol = fmtMoneyUSD(0).charAt(0);
            txt = `${symbol}${fmtNum(val, 2)}`;
          } else txt = fmtNum(val, 0);

          const highlight = isSelectedMonth(m);
          return (
            <td key={idx} style={cellStyle(highlight)}>
              {txt}
            </td>
          );
        })}
      </tr>
    ));

  // ================== CABECERAS TABLAS POR ORIGEN ==================
  const TableHeadForOrigin = ({ okey }) => {
    const perMonthSorted = getPerMonthSortedByOrigin(okey);
    return (
      <thead>
        <tr>
          <th
            style={{ ...sThLeft, background: gold, color: "#000" }}
          />
          {perMonthSorted.map((m, idx) => {
            const highlight = isSelectedMonth(m);
            return (
              <th key={idx} style={thStyle(highlight)}>
                {m.label}
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
        <td
          style={{
            ...sCellBold,
            background: gold,
            color: "#000",
            fontWeight: 800,
          }}
        >
          {r.label}
        </td>
        {perMonthSorted.map((m, idx) => {
          const o =
            m.metrics?.byOrigin?.[okey] || { total: 0, cant: 0 };
          const cliCount = m.metrics?.byOriginCli?.[okey] ?? 0;

          let val = 0;
          let isPct = false;

          if (r.key.endsWith(":total")) val = o.total;
          else if (r.key.endsWith(":cant")) val = o.cant;
          else if (r.key.endsWith(":cli")) val = cliCount;
          else if (r.key.endsWith(":ticket"))
            val = o.cant ? o.total / o.cant : 0;
          else if (r.key.endsWith(":pct")) {
            const base = Number(m.metrics?.totalServ || 0);
            val = base > 0 ? (o.total / base) * 100 : 0;
            isPct = true;
          }

          const txt = isPct
            ? `${fmtNum(val, 2)} %`
            : r.type === "money"
            ? fmtMoney(val)
            : r.type === "float2"
            ? fmtNum(val, 2)
            : fmtNum(val, 0);

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

  // ================== CUOTAS / ALCANCE ==================
  const getCuotaForMonth = () => 50000;

  const cuotaPorMes = perMonth.map((m, i) => getCuotaForMonth(m, i));
  const ventaAlCortePorMes = perMonth.map(
    (m) => m.metrics?.totalMes ?? 0
  );
  const ventaMesCompletoPorMes = perMonth.map(
    (m) => m.metrics?.totalMesFull ?? 0
  );
  const alcancePctPorMes = perMonth.map((_, i) =>
    (cuotaPorMes[i] || 0) > 0
      ? (ventaAlCortePorMes[i] / cuotaPorMes[i]) * 100
      : 0
  );
  const restantePctPorMes = alcancePctPorMes.map((alc) =>
    alc >= 100 ? 0 : 100 - alc
  );

  // ================== RENDER ==================
  return (
    <div style={sWrap}>
      {/* === TABLAS POR ORIGEN === */}
      <div style={chipContainer}>
        {sortedOriginKeys.map((okey) => (
          <div key={okey} style={{ marginTop: 40 }}>
            <div style={chipContainer}>
              <span style={chipTitle}>{labelFromKey(okey)}</span>
            </div>
            <table style={sTable}>
              <TableHeadForOrigin okey={okey} />
              <tbody>
                {renderRowsForOrigin(okey, rowsPerOrigin(okey))}
              </tbody>
            </table>
          </div>
        ))}
        <span style={chipTitle}>
          DETALLE DE INVERSIÓN EN REDES VS RESULTADOS EN LEADS
        </span>
      </div>

      {/* === TABLAS GENERALES === */}
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
              <td key={idx} style={cellBlack}>
                {fmtMoney(m.metrics?.totalMes || 0)}
              </td>
            ))}
          </tr>
          <tr>
            <td
              style={{
                ...sCellBold,
                background: gold,
                color: "#fff",
                textAlign: "center",
                fontWeight: 800,
              }}
            />
            {perMonth.map((m, idx) => (
              <td
                key={`footer-month-${idx}`}
                style={{
                  ...sCellBold,
                  background: gold,
                  color: "#000",
                  textAlign: "center",
                }}
              >
                {m.label}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>

      {/* === ALCANCE CUOTA === */}
      <div style={chipContainer}>
        <span style={chipTitle}>ALCANCE DE CUOTA POR MES</span>
      </div>

      <table style={sTable}>
        <thead>
          <tr>
            <th
              style={{
                ...sThLeft,
                background: "#000",
                color: "#fff",
              }}
            />
            {perMonth.map((m, idx) => (
              <th
                key={idx}
                style={{ ...sThMes, background: "#000", color: "#fff" }}
              >
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td
              style={{ ...cellWhite, backgroundColor: "#ffc000" }}
            >
              CUOTA DEL MES
            </td>
            {cuotaPorMes.map((q, i) => (
              <td key={i} style={cellWhite}>
                {fmtMoney(q)}
              </td>
            ))}
          </tr>
          <tr>
            <td
              style={{ ...cellWhite, backgroundColor: "#ffc000" }}
            >
              % ALCANCE DE CUOTA
            </td>
            {alcancePctPorMes.map((p, i) => (
              <td key={i} style={pctCellStyle(p)}>
                {`${fmtNum(p, 2)} %`}
              </td>
            ))}
          </tr>
          <tr>
            <td
              style={{ ...cellWhite, backgroundColor: "#ffc000" }}
            >
              % RESTANTE PARA CUOTA
            </td>
            {restantePctPorMes.map((p, i) => (
              <td
                key={i}
                style={pctCellStyle(
                  100 - p === 100 ? 100 : 0 + (100 - p)
                )}
              >
                {`${fmtNum(p, 2)} %`}
              </td>
            ))}
          </tr>
        </tbody>
        <tfoot>
          <tr style={rowRedFooterStyle}>
            <td style={cellFooterRed}>VENTA TOTAL MES</td>
            {ventaMesCompletoPorMes.map((m, i) => (
              <td key={i} style={cellFooterRed}>
                {fmtMoney(m)}
              </td>
            ))}
          </tr>
          <tr style={rowBlackStyle}>
            <td style={cellBlack}>VENTA TOTAL AL {cutDay}</td>
            {ventaAlCortePorMes.map((m, i) => (
              <td key={i} style={cellBlack}>
                {fmtMoney(m)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

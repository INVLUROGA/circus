import React from "react";

export default function ExecutiveTable({
  ventas = [],
  fechas = [],
  dataMktByMonth = {},
  initialDay = 1,
  cutDay = 27,
}) {
  const MESES = [
    "enero","febrero","marzo","abril","mayo","junio",
    "julio","agosto","setiembre","octubre","noviembre","diciembre",
  ];
  const aliasMes = (m) => (m === "septiembre" ? "setiembre" : m);

  // ---------- Helpers básicos ----------
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

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

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

  const formatPct = (val) => `${fmtNum(val, 2)} %`;

  // Detalles
  const getDetalleServicios = (v) => v?.detalle_ventaservicios || [];
  const getDetalleProductos = (v) =>
    v?.detalle_ventaProductos || v?.detalle_ventaproductos || [];

  // ---------- Métricas por mes ----------
function computeMetricsForMonth(anio, mesNombre) {
  const mesAlias = aliasMes(String(mesNombre).toLowerCase());
  const monthIdx = MESES.indexOf(mesAlias);
  if (monthIdx < 0) return null;

  // ====== 1. VENTAS / SERVICIOS / PRODUCTOS ======
  let totalServ = 0, cantServ = 0, totalProd = 0, cantProd = 0;
  let totalServFull = 0, cantServFull = 0, totalProdFull = 0, cantProdFull = 0;

  const from = clamp(Number(initialDay || 1), 1, 31);

  for (const v of ventas) {
    const d = toLimaDate(v?.fecha_venta);
    if (!d) continue;
    if (d.getFullYear() !== Number(anio)) continue;
    if (d.getMonth() !== monthIdx) continue;

    // ---- totales FULL MES (sin corte) ----
    for (const s of (v?.detalle_ventaservicios || [])) {
      const cant = Number(s?.cantidad || 1);
      const linea = Number(s?.tarifa_monto || 0);
      totalServFull += linea;
      cantServFull += cant;
    }
    for (const p of (v?.detalle_ventaProductos || v?.detalle_ventaproductos || [])) {
      const cant = Number(p?.cantidad || 1);
      const linea = Number(p?.tarifa_monto || 0);
      totalProdFull += linea;
      cantProdFull += cant;
    }

    // ---- totales SOLO hasta cutDay ----
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const to = clamp(Number(cutDay || lastDay), from, lastDay);
    const dia = d.getDate();
    if (dia < from || dia > to) continue;

    for (const s of (v?.detalle_ventaservicios || [])) {
      const cant = Number(s?.cantidad || 1);
      const linea = Number(s?.tarifa_monto || 0);
      totalServ += linea;
      cantServ += cant;
    }
    for (const p of (v?.detalle_ventaProductos || v?.detalle_ventaproductos || [])) {
      const cant = Number(p?.cantidad || 1);
      const linea = Number(p?.tarifa_monto || p?.precio_unitario || 0);
      totalProd += linea;
      cantProd += cant;
    }
  }

  const ticketServ     = cantServ     ? totalServ     / cantServ     : 0;
  const ticketProd     = cantProd     ? totalProd     / cantProd     : 0;
  const ticketServFull = cantServFull ? totalServFull / cantServFull : 0;
  const ticketProdFull = cantProdFull ? totalProdFull / cantProdFull : 0;

  const key = `${anio}-${mesAlias}`;
  const mk = dataMktByMonth?.[key] || {};

  const safeDiv0 = (n, d) => {
    const nn = Number(n || 0);
    const dd = Number(d || 0);
    return dd > 0 ? nn / dd : 0;
  };

  const por_red = mk?.por_red || {};
  const invVal = (kArr) =>
    kArr.reduce((acc, k) => acc + Number(por_red?.[k] ?? 0), 0);

  
  const invMetaUSD   = invVal(["1515","meta","facebook","instagram"]);
  const invTikTokUSD = invVal(["1514","tiktok","tik tok"]);
  const invMetaPEN   = invMetaUSD   * 3.39;
  const invTikTokPEN = invTikTokUSD * 3.39;
  const invTotalPEN  = invMetaPEN + invTikTokPEN;

  const leads_por_red = mk?.leads_por_red || {};
  const leadVal = (kArr) =>
    kArr.reduce((acc, k) => acc + Number(leads_por_red?.[k] ?? 0), 0);

  const leadsMeta   = leadVal(["1515","meta","facebook","instagram"]);
  const leadsTikTok = leadVal(["1514","tiktok","tik tok"]);
  const leadsTotal  = leadsMeta + leadsTikTok;

  // CPL (costo por lead)
  const cplMeta   = safeDiv0(invMetaPEN,   leadsMeta);
  const cplTikTok = safeDiv0(invTikTokPEN, leadsTikTok);
  const cplTotal  = safeDiv0(invTotalPEN,  leadsTotal);

  // --- clientes cerrados (CAC) ---
  // estos vienen ya calculados en App:
  //   mk.clientes_digitales -> clientes cerrados FB+IG (lo que se ve en tu tabla de origenes: INSTAGRAM + FACEBOOK)
  //   mk.clientes_tiktok    -> clientes cerrados por TikTok (a futuro)
  const clientesMetaReal   = Number(mk?.clientes_digitales ?? 0); // FB + IG
  const clientesTikTokReal = Number(mk?.clientes_tiktok    ?? 0);
  const clientesTotalReal  = clientesMetaReal + clientesTikTokReal;

  // CAC (costo adquisición de cliente = inversión / clientes cerrados)
  const cacMeta   = safeDiv0(invMetaPEN,   clientesMetaReal);
  const cacTikTok = safeDiv0(invTikTokPEN, clientesTikTokReal);
  const cacTotal  = safeDiv0(invTotalPEN,  clientesTotalReal);

  return {
    // ---- métricas de marketing que vamos a pintar ----
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

    // ---- métricas de ventas que ya tenías ----
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
  };
}


  // Filas de las primeras dos tablas (ya las tenías)
  const rows = [
    { key: "invTotalPEN",         label: "INVERSIÓN TOTAL REDES",                 type: "money" },
        { key: "leadsTotal",       label: "TOTAL LEADS DE META + TIKTOK",          type: "int"   },
    { key: "cplTotal",         label: "COSTO TOTAL POR LEADS DE META + TIKTOK",type: "float2"},
    { key: "cacTotal",         label: "COSTO ADQUISICION DE CLIENTES",         type: "float2"},
  { key: "invMetaPEN",   label: "INVERSIÓN META",                            type: "money"  },
  { key: "leadsMeta",    label: "CANTIDAD LEADS META",                      type: "int"    },
  { key: "cplMeta",      label: "COSTO POR LEAD META",                      type: "float2" },
  { key: "cacMeta",      label: "COSTO ADQUISICION DE CLIENTES META",       type: "float2" },
    { key: "invTikTokPEN",   label: "INVERSIÓN TIKTOK",                        type: "money"  },
  { key: "leadsTikTok",    label: "CANTIDAD LEADS TIKTOK",                   type: "int"    },
  { key: "cplTikTok",      label: "COSTO POR LEAD TIKTOK",                   type: "float2" },
  { key: "cacTikTok",      label: "COSTO ADQUISICION DE CLIENTES TIKTOK",    type: "float2" },

    { key: "totalServ",     label: "VENTA SERVICIOS",                       type: "money" },
    { key: "cantServ",      label: "CANTIDAD SERVICIOS",                    type: "int"   },
    { key: "ticketServ",    label: "TICKET MEDIO SERVICIOS",                type: "money" },
    { key: "totalProd",     label: "VENTA PRODUCTOS",                       type: "money" },
    { key: "cantProd",      label: "CANTIDAD PRODUCTOS",                    type: "int"   },
    { key: "ticketProd",    label: "TICKET MEDIO PRODUCTOS",                type: "money" },
  ];

  const rowsParte1 = rows.slice(0, 12);
  const rowsParte2 = rows.slice(12);

  const perMonth = fechas.map((f) => ({
    label: String(f?.label || "").toUpperCase(),
    anio: f?.anio,
    mes: String(f?.mes || "").toLowerCase(),
    metrics: computeMetricsForMonth(f?.anio, f?.mes),
  }));

  // ---------- Estilos base ----------
  const cBlack = "#000";
  const cWhite = "#fff";
  const gold = "#ffc000";
  const redStrong = "#c00000";

  const border = "1px solid #333";

  const sTable = {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
  };
  const sThMes = {
    color: cWhite,
    border,
    textAlign: "center",
    fontWeight: 700,
    fontSize: 20,
    padding: "10px",
  };
  const sThLeft = {
    ...sThMes,
    textAlign: "center",
    width: 260,
    fontSize: 20,
  };
  const sCell = {
    border,
    padding: "8px 10px",
    background: cWhite,
    fontSize: 20,
    textAlign: "center",
  };
  const sCellBold = {
    border,
    padding: "8px 10px",
    background: cWhite,
    fontWeight: 700,
    fontSize: 17,
    textAlign: "center",
  };
  const sRowBlack = { background: cBlack, color: cWhite, fontWeight: 700 };

  const cellStyle = (isLast) => ({
    ...sCell,
    background: isLast ? gold : "#fff",
    color: isLast ? "#fff" : sCell.color,
    fontWeight: isLast ? 700 : "normal",
    fontSize: isLast ? 25 : sCell.fontSize,
  });

  const thStyle = (isLast) => ({
    ...sThMes,
    background: gold,
    color: "#000",
    fontSize: isLast ? 24 : 20,
  });

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
          const txt =
            r.type === "money"
              ? fmtMoney(val)
              : r.type === "float2"
              ? fmtNum(val, 2)
              : fmtNum(val, 0);
          const isLast = idx === perMonth.length - 1;
          return (
            <td key={idx} style={cellStyle(isLast)}>
              {txt}
            </td>
          );
        })}
      </tr>
    ));


  const getCuotaForMonth = (_monthObj, _idx) => 50000;

  const rowBlackStyle = {
    background: "#000",
    color: "#fff",
    fontWeight: 700,
    fontSize: 22,
  };
  const rowWhiteLabelStyle = {
    background: "#000",
    color: "#000",
    fontWeight: 700,
    fontSize: 22,
  };
  const rowRedFooterStyle = {
    background: redStrong,
    color: "#000",
    fontWeight: 700,
    fontSize: 24,
  };
  const cellBlack = {
    ...sCellBold,
    background: "transparent",
    color: "#fff",
    fontWeight: 700,
    fontSize: 22,
    border,
  };
  const cellWhite = {
    ...sCellBold,
    background: "#fff",
    color: "#000",
    fontWeight: 700,
    fontSize: 22,
    border,
  };
  const cellFooterRed = {
    ...sCellBold,
    background: "gold",
    color: "#fff",
    fontWeight: 700,
    fontSize: 24,
    border,
  };

  const pctCellStyle = (pctAlcance) => {
    const reached = pctAlcance >= 100;
    return {
      ...sCellBold,
      background: "#fff",
      color: reached ? "#00a100" : redStrong,
      fontWeight: 700,
      fontSize: 22,
      border,
    };
  };

  const cuotaPorMes = perMonth.map((m, idx) => {
    return getCuotaForMonth(m, idx);
  });

  const ventaAlCortePorMes = perMonth.map(
    (m) => m.metrics?.totalMes ?? 0
  );
  const ventaMesCompletoPorMes = perMonth.map(
    (m) => m.metrics?.totalMesFull ?? 0
  );

  const alcancePctPorMes = perMonth.map((_, i) => {
    const cuota = cuotaPorMes[i] || 0;
    const ventaCorte = ventaAlCortePorMes[i] || 0;
    return cuota > 0 ? (ventaCorte / cuota) * 100 : 0;
  });

  const restantePctPorMes = alcancePctPorMes.map((alc) =>
    alc >= 100 ? 0 : 100 - alc
  );

  return (
    <div
      style={{
        fontFamily:
          "Inter, system-ui, Segoe UI, Roboto, sans-serif",
        color: "#000",
      }}
    >
      {/* === Primera tabla === */}
      <div
        style={{
          background: "#000",
          color: "#fff",
          textAlign: "center",
          padding: "25px 12px",
          fontWeight: 700,
          letterSpacing: 0.3,
          fontSize: 25,
        }}
      >
        DETALLE DE INVERSIÓN EN REDES VS RESULTADOS EN LEADS
      </div>

      <table style={sTable}>
        <thead>
          <tr>
            <th
              style={{
                ...sThLeft,
                background: gold,
                color: "#000",
              }}
            ></th>
            {perMonth.map((m, idx) => (
              <th
                key={idx}
                style={thStyle(idx === perMonth.length - 1)}
              >
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{renderRows(rowsParte1)}</tbody>
      </table>

      {/* === Segunda tabla === */}
      <div
        style={{
          background: "#000",
          color: "#fff",
          textAlign: "center",
          padding: "25px 12px",
          fontWeight: 700,
          letterSpacing: 0.3,
          fontSize: 25,
          marginTop: 40,
        }}
      >
        DETALLE DE VENTAS POR TIPO AL {cutDay} DE CADA MES
      </div>

      <table style={sTable}>
        <thead>
          <tr>
            <th
              style={{
                ...sThLeft,
                background: gold,
                color: "#000",
              }}
            ></th>
            {perMonth.map((m, idx) => (
              <th
                key={idx}
                style={thStyle(idx === perMonth.length - 1)}
              >
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{renderRows(rowsParte2)}</tbody>

        {/* Fila: Venta total al corte */}
        <tfoot>
          <tr style={sRowBlack}>
            <td
              style={{
                ...sCellBold,
                background: "transparent",
                color: "#fff",
              }}
            >
              VENTA TOTAL AL {cutDay}
            </td>
            {perMonth.map((m, idx) => (
              <td
                key={idx}
                style={{
                  ...sCellBold,
                  background: "transparent",
                  color: "#fff",
                  fontSize: 24,
                }}
              >
                {fmtMoney(m.metrics?.totalMes || 0)}
              </td>
            ))}
          </tr>

          {/* Fila: etiqueta MES */}
          <tr>
            <td
              style={{
                ...sCellBold,
                background: gold,
                color: "#fff",
                textAlign: "center",
                fontWeight: 800,
                fontSize: 25,
              }}
            >
            </td>
            {perMonth.map((m, idx) => (
              <td
                key={`footer-month-${idx}`}
                style={{
                  ...sCellBold,
                  background: gold,
                  color: "#000",
                  fontSize: 25,
                  textAlign: "center",
                }}
              >
                {m.label}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>

      {/* === TERCERA TABLA: ALCANCE DE CUOTA === */}
      <div
        style={{
          background: "#000",
          color: "#fff",
          textAlign: "center",
          padding: "25px 12px",
          fontWeight: 700,
          letterSpacing: 0.3,
          fontSize: 25,
          marginTop: 40,
        }}
      >
        ALCANCE DE CUOTA POR MES
      </div>

      <table style={sTable}>
        <thead>
          <tr>
            <th
              style={{
                ...sThLeft,
                background: "#000",
                color: "#fff",
                fontSize: 20,
              }}
            >
              {/* primera celda head vacía */}
            </th>
            {perMonth.map((m, idx) => (
              <th
                key={idx}
                style={{
                  ...sThMes,
                  background: "#000",
                  color: "#fff",
                  fontSize: 20,
                }}
              >
                {m.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
        

          <tr style={rowWhiteLabelStyle}>
            <td style={{...cellWhite,backgroundColor:"gold"}}>CUOTA DEL MES</td>
            {cuotaPorMes.map((cuota, i) => (
              <td key={i} style={cellWhite}>
                {fmtMoney(cuota)}
              </td>
            ))}
          </tr>

          <tr style={rowWhiteLabelStyle}>
            <td style={{...cellWhite,backgroundColor:"gold"}}>% ALCANCE DE CUOTA</td>
            {alcancePctPorMes.map((pct, i) => (
              <td key={i} style={pctCellStyle(pct)}>
                {formatPct(pct)}
              </td>
            ))}
          </tr>

          {/* 4. % RESTANTE PARA CUOTA */}
          <tr  style={rowWhiteLabelStyle}>
            <td  style={{...cellWhite,backgroundColor:"gold"}}>% RESTANTE PARA CUOTA</td>
            {restantePctPorMes.map((pctRest, i) => (
              <td key={i} style={pctCellStyle(100 - pctRest === 100 ? 100 : 0 + (100 - pctRest))}>
                {/* usamos mismo color rule basada en alcance: 
                    si ya llegaron, restante=0 y celda verde */}
                {formatPct(pctRest)}
              </td>
            ))}
          </tr>
        </tbody>

        <tfoot>
          <tr style={rowRedFooterStyle}>
            <td style={cellFooterRed}>VENTA TOTAL MES</td>
            {ventaMesCompletoPorMes.map((monto, i) => (
              <td key={i} style={cellFooterRed}>
                {fmtMoney(monto)}
              </td>
            ))}
          </tr>
            {/* 1. VENTA TOTAL AL {cutDay} (fila negra) */}
          <tr style={rowBlackStyle}>
            <td style={cellBlack}>
              VENTA TOTAL AL {cutDay}
            </td>
            {ventaAlCortePorMes.map((monto, i) => (
              <td key={i} style={cellBlack}>
                {fmtMoney(monto)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

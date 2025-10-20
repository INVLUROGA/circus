import React from "react";

/**
 * ExecutiveSummaryTable
 * --------------------------------------------------------------
 * Tabla de "RESUMEN EJECUTIVO HASTA EL <cutDay> DE CADA MES".
 */
export default function ExecutiveTable({
  ventas = [],
  fechas = [],
  dataMktByMonth = {},
  initialDay = 1,
  cutDay = 21,
}) {
  // --------------------------- Helpers ---------------------------
  const MESES = [
    "enero","febrero","marzo","abril","mayo","junio",
    "julio","agosto","setiembre","octubre","noviembre","diciembre",
  ];
  const aliasMes = (m) => (m === "septiembre" ? "setiembre" : m);

  const toLimaDate = (iso) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
      return new Date(utcMs - 5 * 60 * 60000);
    } catch (_) { return null; }
  };

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const fmtMoney = (n) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(n || 0));
  const fmtNum = (n, d = 0) =>
    new Intl.NumberFormat("es-PE", { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(n || 0));

  // Aceptar varias llaves de detalle para robustez
  const getDetalleServicios = (v) => v?.detalle_ventaservicios || v?.detalle_ventaservicios || [];
  const getDetalleProductos = (v) =>
    v?.detalle_ventaProductos || v?.detalle_ventaproductos || v?.detalle_venta_productos || [];

  // --------------------------- Métricas por mes ---------------------------
  const computeMetricsForMonth = (anio, mesNombre) => {
    const mesAlias = aliasMes(String(mesNombre).toLowerCase());
    const monthIdx = MESES.indexOf(mesAlias);
    if (monthIdx < 0) return null;

    // HASTA cutDay
    let totalServ = 0, cantServ = 0, totalProd = 0, cantProd = 0;
    // MES COMPLETO
    let totalServFull = 0, cantServFull = 0, totalProdFull = 0, cantProdFull = 0;

    const from = clamp(Number(initialDay || 1), 1, 31);

    for (const v of ventas) {
      const d = toLimaDate(v?.fecha_venta);
      if (!d) continue;
      if (d.getFullYear() !== Number(anio)) continue;
      if (d.getMonth() !== monthIdx) continue;

      // Mes completo
      for (const s of getDetalleServicios(v)) {
        const cantidad = Number(s?.cantidad || 1);
        const linea = Number(s?.tarifa_monto || 0);
        totalServFull += linea;
        cantServFull += cantidad;
      }
      for (const p of getDetalleProductos(v)) {
        const cantidad = Number(p?.cantidad || 1);
        const linea = Number(p?.tarifa_monto || 0);
        totalProdFull += linea;
        cantProdFull += cantidad;
      }

      // Hasta cutDay
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const to = clamp(Number(cutDay || lastDay), from, lastDay);
      const dia = d.getDate();
      if (dia < from || dia > to) continue;

      for (const s of getDetalleServicios(v)) {
        const cantidad = Number(s?.cantidad || 1);
        const linea = Number(s?.tarifa_monto || 0);
        totalServ += linea;
        cantServ += cantidad;
      }
      for (const p of getDetalleProductos(v)) {
        const cantidad = Number(p?.cantidad || 1);
        const linea = Number(p?.tarifa_monto || p?.precio_unitario || 0);
        totalProd += linea;
        cantProd += cantidad;
      }
    }

    const ticketServ = cantServ ? totalServ / cantServ : 0;
    const ticketProd = cantProd ? totalProd / cantProd : 0;

    // --- Marketing del mes ---
    const key = `${anio}-${mesAlias}`;
    const mk = dataMktByMonth?.[key] || {};

    // Ajustes (si usas factor 3.7 solo en inv/CPL)
    const mkInv = Number(mk?.inversiones_redes * 3.7 || 0);
    const mkLeads = Number(mk?.leads || 0);
    const mkCpl = Number(mk?.cpl * 3.7 || 0);
    const mkCac = Number(mk?.cac || 0);

   const leads_por_red = mk?.leads_por_red || {};
    const val = (k) => Number(leads_por_red?.[k] ?? 0);
const mkLeadsTikTok =
      val("1514") + val("tiktok") + val("tik tok");
    const mkLeadsMeta =
     val("1515") + val("meta") + val("facebook");

    return {
      mkInv,
      mkLeads,
      mkLeadsTikTok,
      mkLeadsMeta,
      mkCpl,
      mkCac,

      // HASTA cutDay
      totalServ,
      cantServ,
      ticketServ,
      totalProd,
      cantProd,
      ticketProd,
      totalMes: totalServ + totalProd,

      // MES COMPLETO
      totalServFull,
      cantServFull,
      ticketServFull: cantServFull ? totalServFull / cantServFull : 0,
      totalProdFull,
      cantProdFull,
      ticketProdFull: cantProdFull ? totalProdFull / cantProdFull : 0,
      totalMesFull: totalServFull + totalProdFull,
    };
  };

  const rows = [
    { key: "mkInv",      label: "INVERSIÓN REDES",           type: "money" },
    { key: "mkLeads",    label: "LEADS",                     type: "int"   },
    { key: "mkCpl",      label: "COSTO POR LEADS",           type: "float2"},
    { key: "totalServ",  label: "VENTA SERVICIOS",           type: "money" },
    { key: "ticketServ", label: "TICKET PROMEDIO SERVICIOS", type: "money" },
    { key: "totalProd",  label: "VENTA PRODUCTOS",           type: "money" },
    { key: "cantProd",   label: "CANTIDAD PRODUCTOS",        type: "int"   },
    { key: "cantServ",   label: "CANTIDAD SERVICIOS",        type: "int"   },
    { key: "ticketProd", label: "TICKET PROMEDIO PRODUCTOS", type: "money" },
  ];

  const perMonth = fechas.map((f) => ({
    label: String(f?.label || "").toUpperCase(),
    anio: f?.anio,
    mes: String(f?.mes || "").toLowerCase(),
    metrics: computeMetricsForMonth(f?.anio, f?.mes),
  }));

  // --------------------------- Styles ---------------------------
  const cBlack = "#000000";
  const cWhite = "#ffffff";
  const border = "1px solid #333";

  const sWrap = {
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif",
    color: cBlack,
  };
  const sHeader = {
    background: cBlack,
    color: cWhite,
    textAlign: "center",
    padding: "25px 12px",
    fontWeight: 700,
    letterSpacing: 0.2,
    fontSize: 25,
  };
  const sTable = { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" };
  const sThMes = { color: cWhite, border, textAlign: "center", fontWeight: 700, fontSize: 20, padding: "10px" };
  const sThLeft = { ...sThMes, textAlign: "center", width: 260, fontSize: 20 };
  const sCell = { border, padding: "8px 10px", background: cWhite, fontSize: 20,textAlign:"center" };
  const sCellBold = {  border, padding: "8px 10px",background: cWhite, fontWeight: 700, fontSize: 17 };
  const sRowBlack = { background: cBlack, color: cWhite, fontWeight: 700 };
  const gold = "#ffc000";
  const red = "#c00000";

  const cellStyle = (isLast) => ({
    ...sCell,
    background: isLast ? gold : "#fff",
    color: isLast ? "#fff" : sCell.color,
    fontWeight: isLast ? 700 : "normal",
    fontSize: isLast ? 25 : sCell.fontSize,
  });
  const thStyle = (isLast) => ({
    ...sThMes,
    background: isLast ? red : gold,
    color: isLast ? "#fff" : "#000",
    fontSize: isLast ? 24 : 20,
  });

  return (
    <div style={sWrap}>
      <div style={sHeader}>INFORME GERENCIAL HASTA EL {cutDay} DE CADA MES</div>

      <table style={sTable}>
        <thead>
          <tr>
            <th style={{ ...sThLeft, background: gold, color: "#000" }}>MES</th>
            {perMonth.map((m, idx) => {
              const isLast = idx === perMonth.length ;
              return (
                <th key={idx} style={thStyle(isLast)}>
                  <div>{m.label}</div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <React.Fragment key={r.key}>
              {/* fila original */}
              <tr>
<td
  style={{
    ...sCellBold,
    background: gold,
    color: "#000",
    fontWeight: 800,
  }}
>
  {r.label}
</td>                {perMonth.map((m, idx) => {
                  const val = m.metrics?.[r.key] ?? 0;
                  let txt = "";
                  if (r.type === "money") txt = fmtMoney(val);
                  else if (r.type === "float2") txt = fmtNum(val, 2);
                  else txt = fmtNum(val, 0);
                  const isLast = idx === perMonth.length - 1;
                  return (
                    <td key={idx} style={cellStyle(isLast)}>
                      {txt}
                    </td>
                  );
                })}
              </tr>

              {/* inyección: colocar dos filas justo después de LEADS */}
              {r.key === "mkLeads" && (
                <>
                  <tr>
                    <td   style={{
    ...sCellBold,
    background: gold,
    color: "#000",
    fontWeight: 800,
  }}>LEADS — META</td>
                    {perMonth.map((m, idx) => {
                      const isLast = idx === perMonth.length - 1;
                      const val = m.metrics?.mkLeadsMeta ?? 0;
                      return (
                        <td key={idx} style={cellStyle(isLast)}>
                          {fmtNum(val, 0)}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td   style={{
    ...sCellBold,
    background: gold,
    color: "#000",
    fontWeight: 800,
  }}>LEADS — TIKTOK</td>
                    {perMonth.map((m, idx) => {
                      const isLast = idx === perMonth.length - 1;
                      const val = m.metrics?.mkLeadsTikTok ?? 0;
                      return (
                        <td key={idx} style={cellStyle(isLast)}>
                          {fmtNum(val, 0)}
                        </td>
                      );
                    })}
                  </tr>
                </>
              )}
            </React.Fragment>
          ))}

          {/* TOTAL MES al corte */}
          <tr style={sRowBlack}>
            <td style={{ ...sCellBold, background: "transparent", color: "#fff" }}>VENTA TOTAL AL {cutDay}</td>
            {perMonth.map((m, idx) => {
              const isLast = idx === perMonth.length - 1;
              return (
                <td key={idx} style={{ ...sCellBold, background : "transparent", color: "#fff", fontSize: isLast ? 25 : 24 }}>
                  {fmtMoney(m.metrics?.totalMes || 0)}
                </td>
              );
            })}
          </tr>

          {/* CAC */}
          <tr>
            <td   style={{
    ...sCellBold,
    background: gold,
    color: "#000",
    fontWeight: 800,
  }}>CALCULO ADQUISICION DE CLIENTES</td>
            {perMonth.map((m, idx) => {
              const isLast = idx === perMonth.length - 1;
              return (
                <td key={idx} style={cellStyle(isLast)}>
                  {fmtNum(m.metrics?.mkCac || 0, 2)}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>

      {/* Banda inferior */}
      <table style={sTable}>
        <thead>
          <tr style={{ color: "#fff", fontWeight: 800, background: gold }}>
            <th style={{ ...sThLeft, }}>
              VENTA TOTAL <br /> ACUMULADA POR MES
            </th>
            {perMonth.map((m, idx) => {
              const isLast = idx === perMonth.length - 1;
              return (
                <th key={idx} style={{ ...sThMes, background: isLast ? gold : gold, color: isLast ? "#fff" : "#fff", fontSize: isLast ? 25 : sThMes.fontSize }}>
                  {fmtMoney(m.metrics?.totalMesFull || 0)}
                </th>
              );
            })}
          </tr>
        </thead>
      </table>
    </div>
  );
}

import { m } from "framer-motion";
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

// Leads por red (ya lo tenías)
const leads_por_red = mk?.leads_por_red || {};
const valLead = (k) => Number(leads_por_red?.[k] ?? 0);
const mkLeadsTikTok = valLead("1514") + valLead("tiktok") + valLead("tik tok");
const mkLeadsMeta   = valLead("1515") + valLead("meta") + valLead("facebook") + valLead("instagram");
const cpl_por_red = mk?.cpl_por_red || {};
const sumFrom = (obj, keys) => keys.reduce((a,k)=> a + Number(obj?.[k] ?? 0), 0);

const mkCplTikTok = sumFrom(cpl_por_red, ["1514","tiktok","tik tok"]) * 3.7;
const mkCplMeta   = sumFrom(cpl_por_red, ["1515","meta","facebook","instagram"]) * 3.7;
const por_red = mk?.por_red || {};
const valInv = (k) => Number(por_red?.[k] ?? 0);

const mkInvTikTokRaw = valInv("1514") + valInv("tiktok") + valInv("tik tok");
const mkInvMetaRaw   = valInv("1515") + valInv("meta") + valInv("facebook") + valInv("instagram");

const mkInvTikTok = mkInvTikTokRaw * 3.7;
const mkInvMeta   = mkInvMetaRaw * 3.7;

     

    return {
      mkInv,
      mkLeads,
      mkLeadsTikTok,
      mkLeadsMeta,
      mkCpl,
      mkCac,
 mkInvTikTok, mkInvMeta,
 mkCplTikTok, mkCplMeta,
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
  { key: "mkInv",       label: "INVERSIÓN TOTAL REDES",type: "money" },
  { key: "mkInvMeta",   label: "INVERSIÓN  META",type: "money" },
    { key: "mkLeadsMeta", label: "CANTIDAD LEADS META",type: "int"   },
      { key: "mkCplMeta",   label: "COSTO POR LEAD  META",type: "float2"},
  { key: "mkInvTikTok", label: "INVERSIÓN  TIKTOK",type: "money" },
  { key: "mkLeadsTikTok",label:"CANTIDAD LEADS  TIKTOK",type: "int"   },
    { key: "mkCplTikTok", label: "COSTO POR LEAD TIKTOK",type: "float2"},
  { key: "mkLeads",     label: "TOTAL LEADS DE META Y TIKTOK",type: "int"   },
 { key: "mkCpl",       label: "COSTO TOTAL POR LEADS DE META Y TIKTOK ",     type: "float2"},
  { key: "totalServ",   label: "VENTA SERVICIOS",type: "money" },
    { key: "cantServ",    label: "CANTIDAD SERVICIOS",type: "int"   },
  { key: "ticketServ",  label: "TICKET MEDIO SERVICIOS",   type: "money" },
  { key: "totalProd",   label: "VENTA PRODUCTOS",type: "money" },
  { key: "cantProd",    label: "CANTIDAD PRODUCTOS",type: "int"   },
  { key: "ticketProd",  label: "TICKET MEDIO PRODUCTOS",   type: "money" },
];


  const perMonth = fechas.map((f) => ({
    label: String(f?.label || "").toUpperCase(),
    anio: f?.anio,
    mes: String(f?.mes || "").toLowerCase(),
    metrics: computeMetricsForMonth(f?.anio, f?.mes),
  }));

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

  const cellStyle = (isLast) => ({
    ...sCell,
    background: isLast ? gold : "#fff",
    color: isLast ? "#fff" : sCell.color,
    fontWeight: isLast ? 700 : "normal",
    fontSize: isLast ? 25 : sCell.fontSize,
  });
  const thStyle = (isLast) => ({
    ...sThMes,
    background: isLast ? gold : gold,
    color: isLast ? "#fff" : "#000",
    fontSize: isLast ? 24 : 20,
  });
return (
  <div style={sWrap}>
    <div style={sHeader}>INFORME GERENCIAL HASTA EL {cutDay} DE CADA MES</div>

    <table style={sTable}>
      <thead>
        <tr>
          <th style={{ ...sThLeft, background: gold, color: "#000" }}></th>
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
          <tr key={r.key}>
            <td style={{ ...sCellBold, background: gold, color: "#000", fontWeight: 800 }}>
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
        ))}

        {/* TOTAL MES AL CORTE */}
        <tr style={sRowBlack}>
          <td style={{ ...sCellBold, background: "transparent", color: "#fff" }}>
            VENTA TOTAL AL {cutDay}
          </td>
          {perMonth.map((m, idx) => {
            const isLast = idx === perMonth.length - 1;
            return (
              <td
                key={idx}
                style={{
                  ...sCellBold,
                  background: "transparent",
                  color: "#fff",
                  fontSize: isLast ? 25 : 24,
                }}
              >
                {fmtMoney(m.metrics?.totalMes || 0)}
              </td>
            );
          })}
        </tr>

        {/* CAC */}
        <tr>
          <td style={{ ...sCellBold, background: gold, color: "#000", fontWeight: 800 }}>
            COSTO ADQUISICION DE CLIENTES
          </td>
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
          <th style={{ ...sThLeft }}>
            VENTA TOTAL <br /> ACUMULADA POR MES
          </th>
          {perMonth.map((m, idx) => {
            return (
              <th
                key={idx}
                style={{
                  ...sThMes,
                  background: gold,
                  color: "#fff",
                  fontSize: 25,
                }}
              >
                {fmtMoney(m.metrics?.totalMesFull || 0)}
              </th>
            );
          })}
        </tr>
        <tr>
          <td style={{...sCellBold,background:gold,color:"#fff"
            ,textAlign:"center",fontWeight:800,fontSize:25
          }}
          > </td>
        
          {perMonth.map((m, idx) => {
            const isLast = idx === perMonth.length - 1;
            return (
              <td
                key={`footer-month-${idx}`}
                style={{
                  ...sCellBold,
                  background: gold,
                  color: "#000",
                  fontSize: isLast ? 23 : 23,
                  textAlign: "center",
                }}
              >
                {m.label}
              </td>
            );
          })}
        </tr>
      </thead>
    </table>
  </div>
);
}
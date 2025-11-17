import React from "react";

export default function ExecutiveTable({
  ventas = [],
  fechas = [],
  dataMktByMonth = {},
  initialDay = 1,
  cutDay = 27,
  originMap = {},
  selectedMonth,
  tasaCambio = 3.37, // Prop recibida
}) {
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
    } catch { return null; }
  };
  const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n || 0)));
  
  // --- SECCIÓN 1 (SIN CAMBIOS, YA LO TENÍAS) ---
  // Funciones de formato para Soles (PEN) y Dólares (USD)
  const fmtMoney = (n) => new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN"}).format(Number(n||0));
  const fmtNum   = (n,d=0)=> new Intl.NumberFormat("es-PE",{minimumFractionDigits:d,maximumFractionDigits:d}).format(Number(n||0));
  const fmtMoneyUSD = (n) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(n||0));
  // --- FIN SECCIÓN 1 ---

  const getDetalleServicios = (v) =>
    v?.detalle_ventaservicios ||
    v?.detalle_ventaServicios ||
    v?.detalle_servicios ||
    v?.detalle_venta_servicios || [];
  const getDetalleProductos = (v) =>
    v?.detalle_ventaProductos || v?.detalle_ventaproductos || [];

  const ORIGIN_SYNONYMS = {
    tiktok:   new Set(["1514","695","tiktok","tik tok","tik-tok"]),
    facebook: new Set(["694","facebook","fb"]),
    instagram:new Set(["693","instagram","ig"]),
    meta:     new Set(["1515","meta","1454"]),
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

  // --- SECCIÓN 2: LÓGICA DE CÁLCULO CORREGIDA ---
  function computeMetricsForMonth(anio, mesNombre) {
    const mesAlias = aliasMes(String(mesNombre).toLowerCase());
    const monthIdx = MESES.indexOf(mesAlias);
    if (monthIdx < 0) return null;

    // ... (toda tu lógica de 'for (const v of ventas)' sigue igual) ...
    let totalServ=0,cantServ=0,totalProd=0,cantProd=0;
    let totalServFull=0,cantServFull=0,totalProdFull=0,cantProdFull=0;
    const byOrigin = {};       
    const byOriginFull = {};   
    const byOriginCliSet = {};      
    const byOriginCliSetFull = {}; 
    let metaServTotalCut=0,  metaServCantCut=0;
    let metaServTotalFull=0, metaServCantFull=0;
    const metaCliSetCut = new Set();
    const metaCliSetFull = new Set();
    const addTo = (bucket, key, label, linea, cantidad) => {
      if (!bucket[key]) bucket[key] = { label, total: 0, cant: 0 };
      bucket[key].total += Number(linea || 0);
      bucket[key].cant  += Number(cantidad || 0);
    };
    const addCli = (map, key, idCli) => {
      if (!map[key]) map[key] = new Set();
      map[key].add(String(idCli));
    };
    const from = clamp(Number(initialDay || 1), 1, 31);
    for (const v of ventas) {
      const d = toLimaDate(v?.fecha_venta || v?.fecha || v?.createdAt);
      if (!d) continue;
      if (d.getFullYear() !== Number(anio)) continue;
      if (d.getMonth() !== monthIdx) continue;
      const rawOrigin =
        v?.id_origen ?? v?.parametro_origen?.id_param ??
        v?.origen ?? v?.source ?? v?.canal ?? v?.parametro_origen?.label_param;
      const oKey   = canonicalKeyFromRaw(originMap, rawOrigin);
      const oLabel = labelFromKey(oKey);
      const servicios = getDetalleServicios(v);
      const idCli = v?.id_cli ?? `venta-${v?.id ?? Math.random()}`;
      if (servicios.length > 0) {
        if (oKey !== "meta") addCli(byOriginCliSetFull, oKey, idCli);
        else metaCliSetFull.add(String(idCli));
      }
      for (const s of servicios) {
        const cant = Number(s?.cantidad || 1);
        const linea = Number(s?.tarifa_monto || s?.precio_unitario || 0);
        totalServFull += linea; cantServFull += cant;
        if (oKey !== "meta") addTo(byOriginFull, oKey, oLabel, linea, cant);
        else { metaServTotalFull += linea; metaServCantFull += cant; }
      }
      for (const p of getDetalleProductos(v)) {
        const cant = Number(p?.cantidad || 1);
        const linea = Number(p?.tarifa_monto || 0);
        totalProdFull += linea; cantProdFull += cant;
      }
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const to = clamp(Number(cutDay || lastDay), from, lastDay);
      const dia = d.getDate();
      if (dia < from || dia > to) continue;
      if (servicios.length > 0) {
        if (oKey !== "meta") addCli(byOriginCliSet, oKey, idCli);
        else metaCliSetCut.add(String(idCli));
      }
      for (const s of servicios) {
        const cant = Number(s?.cantidad || 1);
        const linea = Number(s?.tarifa_monto || s?.precio_unitario || 0);
        totalServ += linea; cantServ += cant;
        if (oKey !== "meta") addTo(byOrigin, oKey, oLabel, linea, cant);
        else { metaServTotalCut += linea; metaServCantCut += cant; }
      }
      for (const p of getDetalleProductos(v)) {
        const cant = Number(p?.cantidad || 1);
        const linea = Number(p?.tarifa_monto || p?.precio_unitario || 0);
        totalProd += linea; cantProd += cant;
      }
    }
    const keyMonth = `${anio}-${mesAlias}`;
    const mk = dataMktByMonth?.[keyMonth] || {};
    const por_red = mk?.por_red || {};
    const val = (obj, k) => Number(obj?.[k] ?? 0);
    const rawFB = val(por_red, "facebook");
    const rawIG = val(por_red, "instagram");
    let fbShare = 0.5, igShare = 0.5;
    if ((rawFB + rawIG) > 0) { fbShare = rawFB / (rawFB + rawIG); igShare = 1 - fbShare; }
    if (metaServTotalCut > 0) {
      addTo(byOrigin, "facebook",  "FACEBOOK",  metaServTotalCut * fbShare,  metaServCantCut * fbShare);
      addTo(byOrigin, "instagram", "INSTAGRAM", metaServTotalCut * igShare,  metaServCantCut * igShare);
    }
    if (metaCliSetCut.size > 0) {
      const tot = metaCliSetCut.size;
      const fbInt = Math.round(tot * fbShare);
      const igInt = Math.max(0, tot - fbInt);
      if (!byOriginCliSet["facebook"])  byOriginCliSet["facebook"]  = new Set();
      if (!byOriginCliSet["instagram"]) byOriginCliSet["instagram"] = new Set();
      for (let i=0;i<fbInt;i++) byOriginCliSet["facebook"].add(`fb-${i}`);
      for (let i=0;i<igInt;i++) byOriginCliSet["instagram"].add(`ig-${i}`);
    }
    if (metaServTotalFull > 0) {
      addTo(byOriginFull, "facebook",  "FACEBOOK",  metaServTotalFull * fbShare,  metaServCantFull * fbShare);
      addTo(byOriginFull, "instagram", "INSTAGRAM", metaServTotalFull * igShare,  metaServCantFull * igShare);
    }
    if (metaCliSetFull.size > 0) {
      const tot = metaCliSetFull.size;
      const fbInt = Math.round(tot * fbShare);
      const igInt = Math.max(0, tot - fbInt);
      if (!byOriginCliSetFull["facebook"])  byOriginCliSetFull["facebook"]  = new Set();
      if (!byOriginCliSetFull["instagram"]) byOriginCliSetFull["instagram"] = new Set();
      for (let i=0;i<fbInt;i++) byOriginCliSetFull["facebook"].add(`fb-${i}`);
      for (let i=0;i<igInt;i++) byOriginCliSetFull["instagram"].add(`ig-${i}`);
    }
    const ticketServ     = cantServ     ? totalServ     / cantServ     : 0;
    const ticketProd     = cantProd     ? totalProd     / cantProd     : 0;
    const ticketServFull = cantServFull ? totalServFull / cantServFull : 0;
    const ticketProdFull = cantProdFull ? totalProdFull / cantProdFull : 0;
    
    // --- INICIO DE LA CORRECCIÓN DE CÁLCULO ---
    const safeDiv0 = (n, d) => (Number(d||0) > 0 ? Number(n||0)/Number(d||0) : 0);
    const invVal = (kArr) => kArr.reduce((acc, k) => acc + Number(por_red?.[k] ?? 0), 0);
    
    // 1. Obtener valores base en Dólares (USD)
    const invMetaUSD   = invVal(["1515","meta","facebook","instagram"]);
    const invTikTokUSD = invVal(["1514","tiktok","tik tok"]);
    
    // 2. Calcular el TOTAL en Dólares (USD)
    const invTotalUSD  = invMetaUSD + invTikTokUSD;

    // 3. Preparar los valores para las filas de la tabla
    const invMetaPEN   = invMetaUSD; // Se mostrará en $
    const invTikTokPEN = invTikTokUSD * tasaCambio; // Se mostrará en S/
    const invTotalPEN  = invTotalUSD;  // Se mostrará en $ (este es el total real en USD)

    // 4. Calcular Leads
    const leads_por_red = mk?.leads_por_red || {};
    const leadVal = (kArr) => kArr.reduce((acc, k) => acc + Number(leads_por_red?.[k] ?? 0), 0);
    const leadsMeta   = leadVal(["1515","meta","facebook","instagram"]);
    const leadsTikTok = leadVal(["1514","tiktok","tik tok"]);
    const leadsTotal  = leadsMeta + leadsTikTok;

    // 5. Calcular CPL (Costo por Lead)
    const cplMeta   = safeDiv0(invMetaPEN,   leadsMeta);   // $ / leads
    const cplTikTok = safeDiv0(invTikTokPEN, leadsTikTok); // S/ / leads
    const cplTotal  = safeDiv0(invTotalUSD,  leadsTotal);  // $ / leads (usa el total USD)

    // 6. Calcular CAC (Costo de Adquisición de Cliente)
    const clientesMetaReal   = Number(mk?.clientes_meta   ?? 0);
    const clientesTikTokReal = Number(mk?.clientes_tiktok ?? 0);
    const clientesTotalReal  = clientesMetaReal + clientesTikTokReal; // Total clientes

    const cacMeta   = safeDiv0(invMetaPEN,   clientesMetaReal);    // $ / clientes
    const cacTikTok = safeDiv0(invTikTokPEN, clientesTikTokReal);  // S/ / clientes
    const cacTotal  = safeDiv0(invTotalUSD,  clientesTotalReal);   // $ / clientes (usa el total USD)
    // --- FIN DE LA CORRECCIÓN DE CÁLCULO ---

    const byOriginCli = Object.fromEntries(
      Object.entries(byOriginCliSet).map(([k, s]) => [k, (s?.size || 0)])
    );
    const byOriginCliFull = Object.fromEntries(
      Object.entries(byOriginCliSetFull).map(([k, s]) => [k, (s?.size || 0)])
    );

    return {
      invMetaPEN, leadsMeta, cplMeta, cacMeta,
      invTikTokPEN, leadsTikTok, cplTikTok, cacTikTok,
      invTotalPEN, leadsTotal, cplTotal, cacTotal, // Retorna los valores correctos

      totalServ, cantServ, ticketServ,
      totalProd, cantProd, ticketProd,
      totalMes: totalServ + totalProd,

      totalServFull, cantServFull, ticketServFull,
      totalProdFull, cantProdFull, ticketProdFull,
      totalMesFull: totalServFull + totalProdFull,

      byOrigin, byOriginFull,
      byOriginCli,       
      byOriginCliFull,   
    };
  }
  // --- FIN SECCIÓN 2 ---

  // --- SECCIÓN 3: DEFINICIÓN DE FILAS CORREGIDA ---
  // Aquí corregimos la 'key' y los 'type' para el total.
  const rows = [
    // --- TOTALES (en USD) ---
    { key: "invTotalPEN", label: "INVERSIÓN TOTAL REDES", type: "money-usd" },
    { key: "leadsTotal",  label: "TOTAL LEADS DE META + TIKTOK", type: "int" },
    { key: "cplTotal",    label: "COSTO TOTAL POR LEADS DE META + TIKTOK", type: "float2-usd" },
    { key: "cacTotal",    label: "COSTO ADQUISICION DE CLIENTES", type: "float2-usd" },
    
    // --- META (en USD) ---
    { key: "invMetaPEN",  label: "INVERSIÓN META", type: "money-usd"  },
    { key: "leadsMeta",   label: "CANTIDAD LEADS META", type: "int"    },
    { key: "cplMeta",     label: "COSTO POR LEAD META", type: "float2-usd" },
    { key: "cacMeta",     label: "COSTO ADQUISICION DE CLIENTES META", type: "float2-usd" },
    
    // --- TIKTOK (en PEN) ---
    { key: "invTikTokPEN",label: "INVERSIÓN TIKTOK", type: "money"  }, // 'money' usará fmtMoney (Soles)
    { key: "leadsTikTok", label: "CANTIDAD LEADS TIKTOK", type: "int"    },
    { key: "cplTikTok",   label: "COSTO POR LEAD TIKTOK", type: "float2" }, // 'float2' usará fmtNum (Soles)
    { key: "cacTikTok",   label: "COSTO ADQUISICION DE CLIENTES TIKTOK", type: "float2" }, // 'float2' usará fmtNum (Soles)
    
    // --- VENTAS (en PEN) ---
    { key: "totalServ",   label: "VENTA SERVICIOS", type: "money" },
    { key: "cantServ",    label: "CANTIDAD SERVICIOS", type: "int"   },
    { key: "ticketServ",  label: "TICKET MEDIO SERVICIOS", type: "money" },
    { key: "totalProd",   label: "VENTA PRODUCTOS", type: "money" },
    { key: "cantProd",    label: "CANTIDAD PRODUCTOS", type: "int"   },
    { key: "ticketProd",  label: "TICKET MEDIO PRODUCTOS", type: "money" },
  ];
  // --- FIN SECCIÓN 3 ---

  const rowsParte1 = rows.slice(0, 12);
  const rowsParte2 = rows.slice(12);

  const perMonth = (fechas || []).map((f) => ({
    label: String(f?.label || "").toUpperCase(),
    anio: f?.anio,
    mes: String(f?.mes || "").toLowerCase(),
    metrics: computeMetricsForMonth(f?.anio, f?.mes),
  }));

  const originKeysAll = Array.from(
    new Set(perMonth.flatMap(m => Object.keys(m.metrics?.byOrigin || {})))
  ).filter(k => k !== "meta").sort();

  const lastIdx = Math.max(0, perMonth.length - 1);
  const lastCant = (key) =>
    Number(perMonth[lastIdx]?.metrics?.byOrigin?.[key]?.cant || 0);
  const sumCant = (key) =>
    perMonth.reduce((acc, m) => acc + Number(m?.metrics?.byOrigin?.[key]?.cant || 0), 0);
  const priority = (key) => (key === "wsp_organico" ? 1 : 0);
  const sortedOriginKeys = [...originKeysAll].sort((a, b) => {
    const lb = lastCant(b), la = lastCant(a);
    if (lb !== la) return lb - la;
    const sb = sumCant(b), sa = sumCant(a);
    if (sb !== sa) return sb - sa;
    const pb = priority(b), pa = priority(a);
    if (pb !== pa) return pb - pa;
    return a.localeCompare(b);
  });

  const rowsPerOrigin = (okey) => ([
    { key: `o:${okey}:total`,  label: "VENTA SERVICIOS", type: "money" },
    { key: `o:${okey}:cant`,   label: "CANTIDAD SERVICIOS", type: "int" },
    { key: `o:${okey}:cli`,    label: "CANTIDAD CLIENTES", type: "int" }, 
    { key: `o:${okey}:ticket`, label: "TICKET MEDIO SERVICIOS", type: "money" },
    { key: `o:${okey}:pct`,    label: "% PARTICIPACIÓN", type: "float2" },
  ]);

  // ======== Estilos (sin cambios) ========
  const cBlack="#000", cWhite="#fff", gold="#ffc000", redStrong="#c00000";
  const border="1px solid #333";
  const sTable={ width:"100%", borderCollapse:"collapse", tableLayout:"fixed" }
  const sThMes={ color:cWhite, border, textAlign:"center", fontWeight:700, fontSize:25, padding:"10px" };
  const sThLeft={ ...sThMes, textAlign:"center", width:260, fontSize:25 };
  const sCell={ border, padding:"8px 10px", background:cWhite, fontSize:25, textAlign:"center" };
  const sCellBold={ border, padding:"8px 10px", background:cWhite, fontWeight:700, fontSize:22, textAlign:"center" };
  const sRowBlack={ background:cBlack, color:cWhite, fontWeight:700 };
  const cellStyle=(isLast)=>({ ...sCell, background:isLast?gold:"#fff", color:isLast?"#fff":sCell.color, fontWeight:isLast?700:"normal", fontSize:isLast?25:sCell.fontSize });
  const thStyle=(isLast)=>({ ...sThMes, background:gold, color:"#000", fontSize:isLast?25:25 });

  const TableHead = () => (
    <thead>
      <tr>
        <th style={{ ...sThLeft, background: gold, color: "#000" }} />
        {perMonth.map((m, idx) => (
          <th key={idx} style={thStyle(idx === perMonth.length - 1)}>{m.label}</th>
        ))}
      </tr>
    </thead>
  );

  // --- SECCIÓN 4: FUNCIÓN DE RENDERIZADO CORREGIDA ---
  // Esta función ahora entiende los 'type' (money, money-usd, float2, float2-usd)
  // y usa la función de formato correcta (fmtMoney o fmtMoneyUSD)
  const renderRows = (rowsToRender) =>
    rowsToRender.map((r) => (
      <tr key={r.key}>
        <td style={{ ...sCellBold, background: gold, color: "#000", fontWeight: 800 }}>{r.label}</td>
        {perMonth.map((m, idx) => {
          const val = m.metrics?.[r.key] ?? 0;
          
          let txt = "";
          if (r.type === "money") {
            txt = fmtMoney(val); // S/ (PEN)
          } else if (r.type === "money-usd") {
            txt = fmtMoneyUSD(val); // $ (USD)
          } else if (r.type === "float2") {
            txt = fmtNum(val, 2); // Número (para PEN)
          } else if (r.type === "float2-usd") {
            const symbol = fmtMoneyUSD(0).charAt(0); // Obtiene '$'
            txt = `${symbol}${fmtNum(val, 2)}`; // Ejemplo: $12.34
          } else {
            // Default para 'int'
            txt = fmtNum(val, 0);
          }

          return <td key={idx} style={cellStyle(idx === perMonth.length - 1)}>{txt}</td>;
        })}
      </tr>
    ));
  // --- FIN SECCIÓN 4 ---

  const TableHeadForOrigin = () => (
    <thead>
      <tr>
        <th style={{ ...sThLeft, background: gold, color: "#000" }} />
        {perMonth.map((m, idx) => (
          <th key={idx} style={thStyle(idx === perMonth.length - 1)}>{m.label}</th>
        ))}
      </tr>
    </thead>
  );

  const renderRowsForOrigin = (okey, rowsToRender) =>
    rowsToRender.map((r) => (
      <tr key={r.key}>
        <td style={{ ...sCellBold, background: gold, color: "#000", fontWeight: 800 }}>{r.label}</td>
        {perMonth.map((m, idx) => {
          const o = m.metrics?.byOrigin?.[okey] || { total: 0, cant: 0 };
          const cliCount = m.metrics?.byOriginCli?.[okey] ?? 0; 
          let val = 0, isPct = false;
          if (r.key.endsWith(":total"))   val = o.total;
          else if (r.key.endsWith(":cant"))   val = o.cant;
          else if (r.key.endsWith(":cli"))    val = cliCount;                
          else if (r.key.endsWith(":ticket")) val = o.cant ? o.total/o.cant : 0;
          else if (r.key.endsWith(":pct")) { const base = Number(m.metrics?.totalServ || 0); val = base>0 ? (o.total/base)*100 : 0; isPct = true; }

          const txt = isPct ? `${fmtNum(val,2)} %` : (r.type==="money" ? fmtMoney(val) : r.type==="float2" ? fmtNum(val,2) : fmtNum(val,0));
          return <td key={idx} style={cellStyle(idx === perMonth.length - 1)}>{txt}</td>;
        })}
      </tr>
    ));

  // ... (Resto del código: getCuotaForMonth, estilos de footer, etc.) ...
  // (El return final tampoco cambia)
  const getCuotaForMonth = () => 50000;
  const rowBlackStyle = { background:"#000", color:"#fff", fontWeight:700, fontSize:25 };
  const rowRedFooterStyle = { background:redStrong, color:"#000", fontWeight:700, fontSize:25 };
  const cellBlack = { ...sCellBold, background:"transparent", color:"#fff", fontWeight:700, fontSize:25, border };
  const cellWhite = { ...sCellBold, background:"#fff", color:"#000", fontWeight:700, fontSize:25, border };
  const cellFooterRed = { ...sCellBold, background:"gold", color:"#fff", fontWeight:700, fontSize:25, border };
  const pctCellStyle = (pct) => ({ ...sCellBold, background:"#fff", color: pct>=100 ? "#00a100" : redStrong, fontWeight:700, fontSize:25, border });

  const cuotaPorMes = perMonth.map((m,i)=>getCuotaForMonth(m,i));
  const ventaAlCortePorMes     = perMonth.map(m => m.metrics?.totalMes ?? 0);
  const ventaMesCompletoPorMes = perMonth.map(m => m.metrics?.totalMesFull ?? 0);
  const alcancePctPorMes = perMonth.map((_,i)=> (cuotaPorMes[i]||0) > 0 ? (ventaAlCortePorMes[i]/cuotaPorMes[i])*100 : 0);
  const restantePctPorMes = alcancePctPorMes.map((alc)=> alc>=100?0:100-alc);

  return (
    <div style={{ fontFamily:"Inter, system-ui, Segoe UI, Roboto, sans-serif", color:"#000" }}>
      <div style={{ background:"#000", color:"#fff", textAlign:"center", padding:"25px 12px", fontWeight:700, letterSpacing:0.3,fontSize:25 }}>
        DETALLE DE INVERSIÓN EN REDES VS RESULTADOS EN LEADS
      </div>
      <table style={sTable}><TableHead /><tbody>{renderRows(rowsParte1)}</tbody></table>

      <div style={{ background:"#000", color:"#fff", textAlign:"center", padding:"25px 12px", fontWeight:700, letterSpacing:0.3, marginTop:40 ,fontSize:25}}>
        DETALLE DE VENTAS POR TIPO AL {cutDay} DE CADA MES
      </div>
      <table style={sTable}>
        <TableHead />
        <tbody>{renderRows(rowsParte2)}</tbody>
        <tfoot>
          <tr style={sRowBlack}>
            <td style={{ ...sCellBold, background:"transparent", color:"#fff" }}>VENTA TOTAL AL {cutDay}</td>
            {perMonth.map((m,idx)=>(
              <td key={idx} style={{ ...sCellBold, background:"transparent", color:"#fff" }}>
                {fmtMoney(m.metrics?.totalMes || 0)}
              </td>
            ))}
          </tr>
          <tr>
            <td style={{ ...sCellBold, background:gold, color:"#fff", textAlign:"center", fontWeight:800}} />
            {perMonth.map((m,idx)=>(
              <td key={`footer-month-${idx}`} style={{ ...sCellBold, background:gold, color:"#000", textAlign:"center" }}>
                {m.label}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>

      {/* UNA TABLA POR CADA ORIGEN (ahora con CANTIDAD CLIENTES) */}
      {sortedOriginKeys.map((okey)=>(
        <div key={okey} style={{ marginTop:40 }}>
          <div style={{ background:"#000", color:"#fff", textAlign:"center", padding:"25px 12px", fontWeight:700, letterSpacing:0.3, fontSize:25 }}>
            {` ${labelFromKey(okey)}`}
          </div>
          <table style={sTable}>
            <TableHeadForOrigin />
            <tbody>{renderRowsForOrigin(okey, rowsPerOrigin(okey))}</tbody>
          </table>
        </div>
      ))}

      <div style={{ background:"#000", color:"#fff", textAlign:"center", padding:"25px 12px", fontWeight:700, letterSpacing:0.3, fontSize:25, marginTop:40 }}>
        ALCANCE DE CUOTA POR MES
      </div>
      <table style={sTable}>
        <thead>
          <tr>
            <th style={{ ...sThLeft, background:"#000", color:"#fff" }} />
            {perMonth.map((m,idx)=>(
              <th key={idx} style={{ ...sThMes, background:"#000", color:"#fff" }}>{m.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr><td style={{ ...cellWhite, backgroundColor:"gold" }}>CUOTA DEL MES</td>{cuotaPorMes.map((q,i)=><td key={i} style={cellWhite}>{fmtMoney(q)}</td>)}</tr>
          <tr><td style={{ ...cellWhite, backgroundColor:"gold" }}>% ALCANCE DE CUOTA</td>{alcancePctPorMes.map((p,i)=><td key={i} style={pctCellStyle(p)}>{`${fmtNum(p,2)} %`}</td>)}</tr>
          <tr><td style={{ ...cellWhite, backgroundColor:"gold" }}>% RESTANTE PARA CUOTA</td>{restantePctPorMes.map((p,i)=><td key={i} style={pctCellStyle(100-p===100?100:0+(100-p))}>{`${fmtNum(p,2)} %`}</td>)}</tr>
        </tbody>
        <tfoot>
          <tr style={rowRedFooterStyle}>
            <td style={cellFooterRed}>VENTA TOTAL MES</td>
            {ventaMesCompletoPorMes.map((m,i)=><td key={i} style={cellFooterRed}>{fmtMoney(m)}</td>)}
          </tr>
          <tr style={rowBlackStyle}>
            <td style={cellBlack}>VENTA TOTAL AL {cutDay}</td>
            {ventaAlCortePorMes.map((m,i)=><td key={i} style={cellBlack}>{fmtMoney(m)}</td>)}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
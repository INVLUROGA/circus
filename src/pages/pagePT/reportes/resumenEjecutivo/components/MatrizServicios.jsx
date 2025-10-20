import React, { useMemo } from "react";

export default function MatrizServicios({
  ventas = [],
  fechas = [],            
  initialDay = 1,
  cutDay = null,
  serviciosConCostoIds = null,  
  esTratamiento = null,         
  serviciosConCostoLista = null, 
  maxColsPorTabla = 12,
}) {
  // ====== Utils ======
  const MESES = [
    "enero","febrero","marzo","abril","mayo","junio",
    "julio","agosto","setiembre","octubre","noviembre","diciembre"
  ];
  const aliasMes = (m) =>
    (m === "septiembre" ? "setiembre" : String(m || "").toLowerCase());
  const norm = (s) => String(s ?? "").trim().toUpperCase();

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
  const firstNameUpper = (full = "") =>
    String(full).trim().split(/\s+/)[0]?.toUpperCase() || "—";

  const chunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  // ====== Mes a mostrar (último de `fechas`) ======
  const lastMonth = useMemo(() => {
    if (!fechas?.length) return null;
    const f = fechas[fechas.length - 1];
    return { y: Number(f.anio), mName: aliasMes(f.mes) };
  }, [fechas]);

  // ====== Helpers de “con costo / tratamiento” ======
  const idsSet = useMemo(
    () => new Set(Array.isArray(serviciosConCostoIds) ? serviciosConCostoIds : []),
    [serviciosConCostoIds]
  );

  const NOMBRES_WHITELIST = useMemo(() => {
    const base = [
      "GOLD FILLER",
      "K-PACK JOICO",
      "OIRCH OIL RECONSTRUCTION",
      "SENJAL MULTIVITAMINICO",
      "WELLAPLEX",
      "ALISADO ORGANICO",
      "RETIRO DE GEL"
    ];
    const lista = Array.isArray(serviciosConCostoLista) && serviciosConCostoLista.length
      ? serviciosConCostoLista.map(norm)
      : base.map(norm);
    return new Set(lista);
  }, [serviciosConCostoLista]);

  const precioCompraOf = (it) => {
    const raw = it?.circus_servicio?.precio_compra ?? it?.precio_compra ?? null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const idServicioOf = (it) =>
    it?.circus_servicio?.id_servicio ??
    it?.id_servicio ??
    it?.tb_servicio?.id_servicio ??
    null;

  const esConCosto = (it, srvName) => {
    if (typeof esTratamiento === "function") return !!esTratamiento(it);

    const idSrv = idServicioOf(it);
    if (idSrv != null && idsSet.has(idSrv)) return true;

    if (NOMBRES_WHITELIST.has(norm(srvName))) return true;

    const pc = precioCompraOf(it);
    return pc != null && pc > 0;
  };

  // ====== Cálculo puro (depende de cutDay, initialDay, ventas, etc.) ======
  const { sinCostoData, conCostoData } = useMemo(() => {
    const mkBucket = () => ({ empSet: new Set(), srvSet: new Set(), matrix: new Map() });
    const noCosto  = mkBucket();
    const conCosto = mkBucket();

    if (!lastMonth) {
      const empty = { employees: [], services: [], matrix: new Map() };
      return { sinCostoData: empty, conCostoData: empty };
    }

    const monthIdx = MESES.indexOf(lastMonth.mName);
    const now = new Date();
    const lastDayOfMonth = new Date(lastMonth.y, monthIdx + 1, 0).getDate();

    let to = Number(cutDay || lastDayOfMonth);
    if (now.getFullYear() === lastMonth.y && now.getMonth() === monthIdx) {
      to = clamp(to, 1, now.getDate());
    }
    const from = clamp(Number(initialDay || 1), 1, lastDayOfMonth);
    to = clamp(to, from, lastDayOfMonth);

    const pushToBucket = (bucket, emp, srv, qty) => {
      bucket.empSet.add(emp);
      bucket.srvSet.add(srv);
      if (!bucket.matrix.has(emp)) bucket.matrix.set(emp, new Map());
      const row = bucket.matrix.get(emp);
      row.set(srv, (row.get(srv) || 0) + qty);
    };

    for (const v of ventas) {
      const d = toLimaDate(v?.fecha_venta ?? v?.fecha ?? v?.createdAt);
      if (!d) continue;
      if (d.getFullYear() !== lastMonth.y) continue;
      if (MESES[d.getMonth()] !== lastMonth.mName) continue;

      const day = d.getDate();
      if (day < from || day > to) continue;

      const detalles = Array.isArray(v?.detalle_ventaservicios) ? v.detalle_ventaservicios : [];
      for (const it of detalles) {
        const empFull =
          it?.empleado_servicio?.nombres_apellidos_empl ||
          v?.tb_ventum?.tb_empleado?.nombres_apellidos_empl ||
          v?.tb_ventum?.tb_empleado?.nombre_empl ||
          "";
        const emp = firstNameUpper(empFull);

        const srv =
          it?.circus_servicio?.nombre_servicio ||
          it?.nombre_servicio ||
          "—";
        if (!emp || emp === "—") continue;

        const qty = it?.cantidad == null ? 1 : Number(it.cantidad) || 0;
        const bucket = esConCosto(it, srv) ? conCosto : noCosto;
        pushToBucket(bucket, emp, srv, qty);
      }
    }

    const ordenarBucket = (bucket) => {
      const employees = Array.from(bucket.empSet);
      const services  = Array.from(bucket.srvSet);

      const serviceTotals = new Map();
      for (const s of services) {
        serviceTotals.set(
          s,
          employees.reduce((a, e) => a + (bucket.matrix.get(e)?.get(s) || 0), 0)
        );
      }
      services.sort(
        (a, b) => (serviceTotals.get(b) - serviceTotals.get(a)) || norm(a).localeCompare(norm(b))
      );

      const empTotals = new Map();
      for (const e of employees) {
        empTotals.set(
          e,
          services.reduce((a, s) => a + (bucket.matrix.get(e)?.get(s) || 0), 0)
        );
      }
      employees.sort(
        (a, b) => (empTotals.get(b) - empTotals.get(a)) || norm(a).localeCompare(norm(b))
      );

      return { employees, services, matrix: bucket.matrix };
    };

    return {
      sinCostoData: ordenarBucket(noCosto),
      conCostoData: ordenarBucket(conCosto),
    };
  }, [ventas, lastMonth, initialDay, cutDay, idsSet, NOMBRES_WHITELIST, esTratamiento]);

  // ====== Estilos (los tuyos) ======
  const C = { head: "#EEBE00", border: "#333", white: "#fff", black: "#000" };
  const sTable = {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    wordWrap: "break-word",
  };
  const th = {
    background: C.head,
    color: C.black,
    padding: "10px",
    border: `1px solid ${C.border}`,
    textAlign: "center",
    fontWeight: 800,
    fontSize: 15,
  };
  const thLeft = { ...th, textAlign: "center", width: 110, whiteSpace: "normal", wordBreak: "break-word" };
  const td = {
    background: C.white,
    color: C.black,
    padding: "8px",
    border: `1px solid ${C.border}`,
    textAlign: "center",
    fontSize: 20,
    fontWeight: 700,
  };
  const tdLeft = { ...td, background: C.head, color: C.black, fontSize: 16 };

  const tituloBloque = (texto) => (
    <div
      style={{
        background: C.black,
        color: "#fff",
        textAlign: "center",
        padding: "20px 12px",
        fontWeight: 800,
        letterSpacing: 0.3,
        fontSize: 22,
        margin: "18px 0 8px",
      }}
    >
      {texto}
    </div>
  );

  const renderDataset = ({ title }, data) => {
    if (!data.services.length) {
      return (
        <>
          {tituloBloque(title)}
          <div style={{ textAlign: "center", padding: 16, opacity: 0.7 }}>Sin datos</div>
        </>
      );
    }

    const getQty = (emp, srv) => data.matrix.get(emp)?.get(srv) || 0;
    const columnasEnChunks = chunk(data.services, Math.max(1, maxColsPorTabla));

    return (
      <>
        {tituloBloque(title)}
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {columnasEnChunks.map((cols, idxChunk) => {
            const colTotals = cols.map(
              (s) => data.employees.reduce((acc, e) => acc + (data.matrix.get(e)?.get(s) || 0), 0)
            );
            return (
              <table key={idxChunk} style={sTable}>
                <thead>
                  <tr>
                    <th style={thLeft}>COLABORADOR</th>
                    {cols.map((s) => (
                      <th key={s} style={th}>{norm(s)}</th>
                    ))}
                    <th style={th}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {data.employees.map((emp) => {
                    const totalRow = cols.reduce((a, s) => a + getQty(emp, s), 0);
                    return (
                      <tr key={emp}>
                        <td style={tdLeft}>{emp}</td>
                        {cols.map((srv) => (
                          <td key={`${emp}-${srv}`} style={td}>{getQty(emp, srv)}</td>
                        ))}
                        <td className="bg-primary" style={{ ...td, fontWeight: 900,fontSize:22 }}>{totalRow}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-primary " style={{ color: "#000", fontSize: 22 }}>
                    <td className="bg-primary " style={{ ...tdLeft, fontWeight: 900, color: "#000" }}>TOTAL</td>
                    {colTotals.map((t, i) => (
                      <td className="bg-primary " key={`tot-${i}`} style={{ ...td, fontWeight: 900, fontSize: 22 }}>
                        {t || ""}
                      </td>
                    ))}
                    <td className="bg-primary" style={{ ...td, fontWeight: 900, fontSize: 22 }}>
                      {colTotals.reduce((a, b) => a + b, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            );
          })}
        </div>
      </>
    );
  };

  const rango = lastMonth ? ` – ${lastMonth.mName.toUpperCase()}/${lastMonth.y}` : "";
  const corte = cutDay ? ` (DEL ${initialDay} AL ${cutDay})` : "";
return (
  <div
    style={{
      marginBottom: "100px",
      fontFamily: "Inter, system-ui, Segoe UI, Roboto, sans-serif",
      marginTop: 100,
    }}
  >
    <div className="mb-4">
      {renderDataset(
        { title: `SERVICIOS ${rango}${corte}` },
        sinCostoData
      )}
    </div>

    <div className="mb-4">
      {renderDataset(
        { title: `CANTIDAD POR TIPO DE TRATAMIENTO ${rango}${corte}` },
        conCostoData
      )}
    </div>
  </div>
);

}

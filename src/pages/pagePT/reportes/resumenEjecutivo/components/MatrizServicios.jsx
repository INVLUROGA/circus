import React, { useMemo } from "react";

export default function MatrizServicios({
  ventas = [],
  fechas = [],
  initialDay = 1,
  cutDay = null,
}) {
  const MESES = [
    "enero","febrero","marzo","abril","mayo","junio",
    "julio","agosto","setiembre","octubre","noviembre","diciembre"
  ];
  const aliasMes = (m) =>
    (m === "septiembre" ? "setiembre" : String(m || "").toLowerCase());

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

  const lastMonth = useMemo(() => {
    if (!fechas?.length) return null;
    const f = fechas[fechas.length - 1];
    return { y: Number(f.anio), mName: aliasMes(f.mes) };
  }, [fechas]);

  const { employees, services, matrix, colTotals, grandTotal } = useMemo(() => {
    const employeesSet = new Set();
    const servicesSet = new Set();
    const matrix = new Map();

    if (!lastMonth) {
      return { employees: [], services: [], matrix, colTotals: [], grandTotal: 0 };
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

    for (const v of ventas) {
      const d = toLimaDate(v?.fecha_venta ?? v?.fecha ?? v?.createdAt);
      if (!d) continue;
      if (d.getFullYear() !== lastMonth.y) continue;
      if (MESES[d.getMonth()] !== lastMonth.mName) continue;
      const day = d.getDate();
      if (day < from || day > to) continue;

      const detalles = Array.isArray(v?.detalle_ventaservicios)
      
        ? v.detalle_ventaservicios
        : [];
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
        employeesSet.add(emp);
        servicesSet.add(srv);

        if (!matrix.has(emp)) matrix.set(emp, new Map());
        const row = matrix.get(emp);
        row.set(srv, (row.get(srv) || 0) + qty);
      }
    }

    const employees = Array.from(employeesSet);
    const services = Array.from(servicesSet);

    const serviceTotals = new Map();
    for (const s of services) {
      let sum = 0;
      for (const e of employees) sum += matrix.get(e)?.get(s) || 0;
      serviceTotals.set(s, sum);
    }
    services.sort((a, b) => (serviceTotals.get(b) || 0) - (serviceTotals.get(a) || 0));
    const empTotals= new Map();
    for(const e of employees){
      let sum=0;
      for(const s of services) sum+=(matrix.get(e)?.get(s) || 0);
      empTotals.set(e,sum);
    }
    employees.sort((a,b)=>(empTotals.get(b)||0) -(empTotals.get(a) ||0));

    const colTotals = services.map((s) =>
      employees.reduce((acc, e) => acc + (matrix.get(e)?.get(s) || 0), 0)
    );
    const grandTotal = colTotals.reduce((a, b) => a + b, 0);

    return { employees, services, matrix, colTotals, grandTotal };
  }, [ventas, lastMonth, initialDay, cutDay]);

  const getQty = (emp, srv) => matrix.get(emp)?.get(srv) || 0;

  // --- estilos ---
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
  const thLeft = {
    ...th,
    textAlign: "center",
    width: 100, 
    whiteSpace: "normal", 
    wordBreak: "break-word",
  };
  const td = {
    background: C.white,
    color: C.black,
    padding: "8px",
    border: `1px solid ${C.border}`,
    textAlign: "center",
    fontSize: 15,
    fontWeight: 700,
  };
  const tdLeft = {
    ...td,
    background: C.head,
    color: C.black,
    fontSize: 16,
    wordBreak: "break-word",
    whiteSpace: "normal",
  };

  return (
    <div style={{ marginBottom:"100px", fontFamily: "Inter, system-ui, Segoe UI, Roboto, sans-serif",marginTop:100 }}>
      <div
        style={{
          background: C.black,
          color: "#fff",
          textAlign: "center",
          padding: "20px 12px",
          fontWeight: 800,
          letterSpacing: 0.3,
          fontSize: 22,
          marginBottom: 8,
        }}
      >
        SERVICIOS (CANTIDADES) –{" "}
        {lastMonth ? `${MESES.indexOf(lastMonth.mName) + 1}/${lastMonth.y}` : ""}{" "}
        (DEL {initialDay} AL {cutDay ?? "FIN DE MES"})
      </div>

      <table style={sTable}>
        <thead>
          <tr>
            <th style={thLeft}>COLABORADOR</th>
            {services.map((s) => (
              <th key={s} style={th}>
                {String(s).toUpperCase()}
              </th>
            ))}
       
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp}>
              <td style={tdLeft}>{emp}</td>
              {services.map((srv) => (
                <td key={`${emp}-${srv}`} style={td}>
                  {getQty(emp, srv) }
                </td>
              ))}
            </tr>
          ))}
          {employees.length === 0 && (
            <tr>
              <td style={td} colSpan={services.length + 1}>
                Sin datos para este periodo
              </td>
            </tr>
          )}
        </tbody>
        {employees.length > 0 && (
          <tfoot>
            <tr>
              <td style={{ ...tdLeft, fontWeight: 900 }}>TOTAL</td>
              {colTotals.map((t, i) => (
                <td key={`tot-${i}`} style={{ ...td, fontWeight: 900 }}>
                  {t || ""}
                </td>
              ))}
              {/* 🔹 La celda del total general se mueve debajo de la última columna */}
            </tr>
            <tr>
              <td
                colSpan={services.length}
                style={{
                  border: "none",
                  textAlign: "right",
                  fontWeight: 900,
                  fontSize: 18,
                  paddingTop: 10,
                }}
              >
                TOTAL GENERAL: {grandTotal}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

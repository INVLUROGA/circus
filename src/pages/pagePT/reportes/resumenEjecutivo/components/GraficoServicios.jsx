import React, { useMemo } from "react";
import Chart from "react-apexcharts";

export function GraficoServicios({
  ventas = [],
  fechas = [],
  initialDay = 1,
  cutDay = null,
  maxEmployees = 5,
  stacked = false,
  height = 420,
}) {
  const MESES = [
    "enero","febrero","marzo","abril","mayo","junio",
    "julio","agosto","setiembre","octubre","noviembre","diciembre"
  ];
  const aliasMes = (m) =>
    (m === "septiembre" ? "setiembre" : String(m || "").toLowerCase());
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const firstNameUpper = (full = "") =>
    String(full).trim().split(/\s+/)[0]?.toUpperCase() || "SIN ASIGNAR";
  const toLimaDate = (iso) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
      return new Date(utcMs - 5 * 60 * 60000);
    } catch { return null; }
  };

  const lastMonth = useMemo(() => {
    if (!fechas?.length) return null;
    const f = fechas[fechas.length - 1];
    return { y: Number(f.anio), mName: aliasMes(f.mes) };
  }, [fechas]);

  const { employees, services, matrix } = useMemo(() => {
    const employeesSet = new Set();
    const servicesSet = new Set();
    const matrix = new Map();

    if (!lastMonth) return { employees: [], services: [], matrix };

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
if (!emp) continue;

   
        const srv =
          it?.circus_servicio?.nombre_servicio ||
          it?.nombre_servicio ||
          "OTROS";

        const qty = it?.cantidad == null ? 1 : Number(it.cantidad) || 0;

        employeesSet.add(emp);
        servicesSet.add(srv);

        if (!matrix.has(emp)) matrix.set(emp, new Map());
        const row = matrix.get(emp);
        row.set(srv, (row.get(srv) || 0) + qty);
      }
    }

    const services = Array.from(servicesSet);
    const employeesBase = Array.from(employeesSet);

    const serviceTotals = new Map();
    for (const s of services) {
      let sum = 0;
      for (const e of employeesBase) sum += matrix.get(e)?.get(s) || 0;
      serviceTotals.set(s, sum);
    }
    services.sort((a, b) => (serviceTotals.get(b) || 0) - (serviceTotals.get(a) || 0));

    const empTotals = new Map();
    for (const e of employeesBase) {
      let sum = 0;
      for (const s of services) sum += matrix.get(e)?.get(s) || 0;
      empTotals.set(e, sum);
    }
    const employees = employeesBase
      .sort((a, b) => (empTotals.get(b) || 0) - (empTotals.get(a) || 0))
      .slice(0, Math.max(1, maxEmployees));

    return { employees, services, matrix };
  }, [ventas, fechas, initialDay, cutDay, maxEmployees, lastMonth]);

  const getQty = (emp, srv) => matrix.get(emp)?.get(srv) || 0;

  const series = useMemo(() => {
    return employees.map((emp) => ({
      name: emp,
      data: services.map((srv) => getQty(emp, srv)),
    }));
  }, [employees, services, matrix]);

  const options = useMemo(() => ({
    chart: {
      type: "bar",
      stacked,
      toolbar: { show: false },
      parentHeightOffset: 0,
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 3,
        columnWidth: "60%",
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2 },
xaxis: {
  categories: services.map((s) => {
    const upper = String(s).toUpperCase();
    // 🔹 Si tiene más de 12 caracteres, dividimos en 2 líneas
    if (upper.length > 12) {
      const mid = Math.ceil(upper.length / 2);
      return upper.slice(0, mid) + "\n" + upper.slice(mid);
    }
    return upper;
  }),
  labels: {
    rotate: -90,
    rotateAlways: true,
    offsetY: 10,
    style: {
      fontSize: "11px",
      fontWeight: 700,
      colors: "#900",
      whiteSpace: "normal",
    },
    formatter: (val) => val, // 🔹 conserva los \n como saltos de línea
  },
  tickPlacement: "on",
},
grid: {
  padding: { bottom: 180, left: 8, right: 8 }, // 🔹 da espacio para los nombres largos
},


  }), [services, stacked]);

  return (
    <div style={{ textAlign: "center", marginTop: 20 }}>
      <h3
        style={{
          fontWeight: 800,
          fontSize: 22,
          marginBottom: 10,
          color: "#000",
        }}
      >
        💇‍♀️ SERVICIOS MÁS VENDIDOS (TOP {maxEmployees} EMPLEADOS)
      </h3>

      <Chart options={options} series={series} type="bar" height={height} />
    </div>
  );
}

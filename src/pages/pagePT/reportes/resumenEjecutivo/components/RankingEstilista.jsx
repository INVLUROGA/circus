import { NumberFormatMoney } from '@/components/CurrencyMask';
import React from 'react';

const mesAIndice = (m = '') => {
  const k = m.trim().toLowerCase();
  const mapa = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9,
    noviembre: 10, diciembre: 11,
  };
  return mapa[k] ?? -1;
};

function filtrarVentasPorMes(ventas = [], filtro, initialDayArg = 1, cutDayArg) {
  if (!filtro || !filtro.mes || !filtro.anio) return ventas;

  const mapa = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9,
    noviembre: 10, diciembre: 11,
  };
  const monthIdx = mapa[String(filtro.mes).toLowerCase().trim()] ?? -1;
  const yearNum = Number(filtro.anio);
  if (monthIdx < 0 || !Number.isFinite(yearNum)) return ventas;

  const toLimaDate = (iso) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return null;
      const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
      return new Date(utcMs - 5 * 60 * 60000); 
    } catch {
      return null;
    }
  };

  const lastDay = new Date(yearNum, monthIdx + 1, 0).getDate();
  const from = Math.max(1, Math.min(Number(filtro.fromDay ?? initialDayArg ?? 1), lastDay));
  const to   = Math.max(from, Math.min(Number(filtro.toDay ?? cutDayArg ?? lastDay), lastDay));

  return ventas.filter((v) => {
    const d = toLimaDate(v?.fecha_venta ?? v?.createdAt ?? v?.fecha);
    if (!d) return false;
    return (
      d.getFullYear() === yearNum &&
      d.getMonth() === monthIdx &&
      d.getDate() >= from && d.getDate() <= to
    );
  });
}


function rankingPorEmpleado(ventas = []) {
  const map = new Map();
  const ventasPorEmpleado = new Map();
  const getAcc = (empleado) => {
    if (!map.has(empleado)) {
      map.set(empleado, {
        empleado,
        totalVentas: 0,
        cantidadVentas: 0,
        ventasProductos: 0,
        cantidadProductos: 0,
        ventasServicios: 0,
        cantidadServicios: 0,
      });
      ventasPorEmpleado.set(empleado, new Set());
    }
    return map.get(empleado);
  };

  for (const v of ventas) {
    const idVenta = v?.id ?? v?.numero_transac;
    if (Array.isArray(v?.detalle_ventaProductos)) {
      for (const it of v.detalle_ventaProductos) {
        const empleado = it?.empleado_producto?.nombres_apellidos_empl;
        if (!empleado) continue;
        const cantidad = Number(it?.cantidad) || 0;
        const precio = Number(it?.tarifa_monto) || Number(it?.tb_producto?.prec_venta) || 0;
        const importe = precio * cantidad;
        const acc = getAcc(empleado);
        acc.ventasProductos += importe;
        acc.cantidadProductos += cantidad;
        ventasPorEmpleado.get(empleado).add(idVenta);
      }
    }
    if (Array.isArray(v?.detalle_ventaservicios)) {
      for (const it of v.detalle_ventaservicios) {
        const empleado = it?.empleado_servicio?.nombres_apellidos_empl;
        if (!empleado) continue;
        const cantidad = Number(it?.cantidad) || 0;
        const precio = Number(it?.tarifa_monto) || 0;
        const importe = precio * cantidad;
        const acc = getAcc(empleado);
        acc.ventasServicios += importe;
        acc.cantidadServicios += cantidad;
        ventasPorEmpleado.get(empleado).add(idVenta);
      }
    }
  }

  const out = [];
  for (const [empleado, acc] of map.entries()) {
    acc.totalVentas = acc.ventasProductos + acc.ventasServicios;
    acc.cantidadVentas = ventasPorEmpleado.get(empleado)?.size ?? 0;
    out.push(acc);
  }
  return out.sort((a, b) => b.totalVentas - a.totalVentas);
}

function TablaRanking({ titulo, ventas, excluirNombres = [] }) {
  const rankingBase = rankingPorEmpleado(ventas);

  const excluirSet = new Set(excluirNombres.map(n => n.trim().toUpperCase()));
  const ranking = rankingBase.filter(r => {
    const nombreCompleto = r.empleado?.toUpperCase?.() || "";
    const primerNombre = nombreCompleto.split(" ")[0] || "";
    return !(
      excluirSet.has(primerNombre) ||
      [...excluirSet].some(n => nombreCompleto.includes(n))
    );
  });

  // 🔹 RETURN COMPLETO CON TÍTULO NUEVO
  return (
    <div style={{ marginBottom: 24 }}>
      {/* 🔴 TÍTULO AGREGADO */}
      <div
        style={{
          textAlign: "center",
          fontSize: 30,
          fontWeight: 800,
          marginBottom: 20,
          textTransform: "uppercase",
        }}
      >
        DETALLE DE VENTAS TOTAL POR MES
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr className="bg-primary fs-3">
              <th style={thStyle}>Colaborador</th>
              <th style={thStyle}>Cantidad de clientes</th>
              <th style={thStyle}>Cantidad Servicios</th>
              <th style={thStyle}>Ventas Servicios</th>
              <th style={thStyle}>Cantidad Productos</th>
              <th style={thStyle}>Ventas Productos</th>
              <th style={thStyle}>Total Ventas</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((r, idx) => (
              <tr key={idx}>
                <td className='bg-primary' style={tdStyle}>{r.empleado.split(" ")[0]}</td>
                <td style={tdStyle}>{r.cantidadVentas}</td>
                <td style={tdStyle}>{r.cantidadServicios}</td>
                <td style={tdStyle}>
                  <NumberFormatMoney amount={r.ventasServicios} />
                </td>
                <td style={tdStyle}>{r.cantidadProductos}</td>
                <td style={tdStyle}>
                  <NumberFormatMoney amount={r.ventasProductos} />
                </td>
                <td className='bg-primary' style={tdStyle}>
                  <NumberFormatMoney amount={r.totalVentas} />
                </td>
              </tr>
            ))}

            {ranking.length > 0 && (
              <tr className="bg-primary text-white fw-bold">
                <td style={tdStyle}>TOTAL</td>
                <td style={tdStyle}>{ranking.reduce((a, b) => a + b.cantidadVentas, 0)}</td>
                <td style={tdStyle}>{ranking.reduce((a, b) => a + b.cantidadServicios, 0)}</td>
                <td style={tdStyle}>
                  <NumberFormatMoney amount={ranking.reduce((a, b) => a + b.ventasServicios, 0)} />
                </td>
                <td style={tdStyle}>{ranking.reduce((a, b) => a + b.cantidadProductos, 0)}</td>
                <td style={tdStyle}>
                  <NumberFormatMoney amount={ranking.reduce((a, b) => a + b.ventasProductos, 0)} />
                </td>
                <td style={tdStyle}>
                  <NumberFormatMoney amount={ranking.reduce((a, b) => a + b.totalVentas, 0)} />
                </td>
              </tr>
            )}

            {ranking.length === 0 && (
              <tr>
                <td style={tdStyle} colSpan={7}>
                  Sin datos para este periodo
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


export const RankingEstilista = ({
  dataVenta = [],
  filtrarFecha,
  initialDay = 1,
  cutDay,
  excluirNombres = ["LUIS", "JESUS", "FATIMA", "MIA", "TIBISAY"],
}) => {
  if (Array.isArray(filtrarFecha)) {
    return (
      <div>
        {filtrarFecha.map((f, i) => {
          const ventasMes = filtrarVentasPorMes(dataVenta, f, initialDay, cutDay);
          const titulo = `${f?.label ?? f?.mes?.toUpperCase?.() ?? ""} ${f?.anio ?? ""}`.trim();
          return (
            <TablaRanking
              key={i}
              titulo={titulo}
              ventas={ventasMes}
              excluirNombres={excluirNombres}
            />
          );
        })}
      </div>
    );
  }

  const ventasFiltradas = filtrarVentasPorMes(dataVenta, filtrarFecha, initialDay, cutDay);
  const tituloUnico = filtrarFecha
    ? `${filtrarFecha?.label ?? filtrarFecha?.mes?.toUpperCase?.()} ${filtrarFecha?.anio ?? ""}`.trim()
    : "Todos los meses";

  return <TablaRanking titulo={tituloUnico} ventas={ventasFiltradas} excluirNombres={excluirNombres} />;
};

const thStyle = {
  border: "1px solid #ccc",
  padding: "8px",
  textAlign: "center",
  fontWeight: "bold",
};

const tdStyle = {
  border: "1px solid #ccc",
  padding: "8px",
  textAlign: "center",
  fontSize: "20px",
};

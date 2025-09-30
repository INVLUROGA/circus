import { NumberFormatMoney } from '@/components/CurrencyMask';
import React from 'react';

// --- helper: mes en español -> índice (0..11)
const mesAIndice = (m = '') => {
  const k = m.trim().toLowerCase();
  const mapa = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
    'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
    'septiembre': 8, 'setiembre': 8, 'octubre': 9,
    'noviembre': 10, 'diciembre': 11,
  };
  return mapa[k] ?? -1;
};

// --- Filtra ventas por { mes, anio } (usa UTC para fechas con "Z")
function filtrarVentasPorMes(ventas = [], filtro) {
  if (!filtro || !filtro.mes || !filtro.anio) return ventas;
  const monthIdx = mesAIndice(filtro.mes);
  const yearNum = Number(filtro.anio);
  if (monthIdx < 0 || !Number.isFinite(yearNum)) return ventas;

  return ventas.filter(v => {
    const d = new Date(v?.fecha_venta);
    if (isNaN(d)) return false;
    return d.getUTCFullYear() === yearNum && d.getUTCMonth() === monthIdx;
  });
}

// --- Construye ranking por empleado
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

    // Productos
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

    // Servicios
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

// --- Tabla reutilizable para un mes ---
function TablaRanking({ titulo, ventas }) {
  const ranking = rankingPorEmpleado(ventas);
  return (
    <div style={{ marginBottom: 24 }}>
      {/* {titulo && <h4 style={{ margin: '12px 0' }}>{titulo}</h4>} */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr className='bg-primary fs-3'>
              <th style={thStyle}>Empleado</th>
              <th style={thStyle}>Total Ventas</th>
              <th style={thStyle}>Cant. Ventas</th>
              <th style={thStyle}>Ventas Productos</th>
              <th style={thStyle}>Cant. Productos</th>
              <th style={thStyle}>Ventas Servicios</th>
              <th style={thStyle}>Cant. Servicios</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((r, idx) => (
              <tr key={idx}>
                <td style={tdStyle}>{r.empleado}</td>
                <td style={tdStyle}><NumberFormatMoney amount={r.totalVentas} /></td>
                <td style={tdStyle}>{r.cantidadVentas}</td>
                <td style={tdStyle}><NumberFormatMoney amount={r.ventasProductos} /></td>
                <td style={tdStyle}>{r.cantidadProductos}</td>
                <td style={tdStyle}><NumberFormatMoney amount={r.ventasServicios} /></td>
                <td style={tdStyle}>{r.cantidadServicios}</td>
              </tr>
            ))}
            {ranking.length === 0 && (
              <tr>
                <td style={tdStyle} colSpan={7}>Sin datos para este periodo</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Componente principal ---
// filtrarFecha puede ser: { label, anio, mes }  O  [ { ... }, { ... } ]
export const RankingEstilista = ({ dataVenta = [], filtrarFecha }) => {
  // Si pasan varios meses, pinto una tabla por cada mes.
  if (Array.isArray(filtrarFecha)) {
    return (
      <div>
        {filtrarFecha.map((f, i) => {
          const ventasMes = filtrarVentasPorMes(dataVenta, f);
          const titulo = `${f?.label ?? f?.mes?.toUpperCase?.() ?? ''} ${f?.anio ?? ''}`.trim();
          return <TablaRanking key={i} titulo={titulo} ventas={ventasMes} />;
        })}
      </div>
    );
  }

  // Si pasan un único filtro (o ninguno), muestro una sola tabla.
  const ventasFiltradas = filtrarVentasPorMes(dataVenta, filtrarFecha);
  const tituloUnico = filtrarFecha
    ? `${filtrarFecha?.label ?? filtrarFecha?.mes?.toUpperCase?.()} ${filtrarFecha?.anio ?? ''}`.trim()
    : 'Todos los meses';

  return <TablaRanking titulo={tituloUnico} ventas={ventasFiltradas} />;
};

const thStyle = {
  border: '1px solid #ccc',
  padding: '8px',
  textAlign: 'center',
  fontWeight: 'bold',
};

const tdStyle = {
  border: '1px solid #ccc',
  padding: '8px',
  textAlign: 'center',
};

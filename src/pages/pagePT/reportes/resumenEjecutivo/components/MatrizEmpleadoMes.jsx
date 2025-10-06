import { NumberFormatMoney } from '@/components/CurrencyMask';
import React, { useMemo } from 'react';

/**
 * MatrizEmpleadoMes
 * -------------------------------------------------------------
 * Eje Y: empleados
 * Eje X: meses (array filtrarFecha: [{ label, anio, mes }, ...])
 * Celda: valor del datoEstadistico (ej. "Total Ventas", "Cant. Ventas", etc.)
 *
 * Props:
 *  - dataVenta: Array<Venta>
 *  - filtrarFecha: Array<{ label: string; anio: string|number; mes: string }>
 *  - datoEstadistico: string (una de las 6 opciones)
 */
const mesAIndice = (m = '') => {
	const k = m.trim().toLowerCase();
	const mapa = {
		enero: 0,
		febrero: 1,
		marzo: 2,
		abril: 3,
		mayo: 4,
		junio: 5,
		julio: 6,
		agosto: 7,
		septiembre: 8,
		setiembre: 8,
		octubre: 9,
		noviembre: 10,
		diciembre: 11,
	};
	return mapa[k] ?? -1;
};
function filtrarVentasPorMes(ventas = [], filtro) {
	if (!filtro || !filtro.mes || !filtro.anio) return ventas;
	const monthIdx = mesAIndice(filtro.mes);
	const yearNum = Number(filtro.anio);
	if (monthIdx < 0 || !Number.isFinite(yearNum)) return ventas;
	return ventas.filter((v) => {
		const d = new Date(v?.fecha_venta);
		if (isNaN(d)) return false;
		return d.getUTCFullYear() === yearNum && d.getUTCMonth() === monthIdx;
	});
}
// --- Construye ranking por empleado (versión con opciones)
function rankingPorEmpleado(
  ventas = [],
  {
    datoEstadistico = 'totalVentas', // métrica para ordenar
    sortDir = 'desc',                // 'desc' | 'asc'
    includeZero = false,             // incluir empleados con todo en 0
    normalizarNombre = true          // normalizar nombres (trim/lowercase colapsado)
  } = {}
) {
  const accMap = new Map();               // empleado -> acumulador
  const ventasPorEmpleado = new Map();    // empleado -> Set(ids de venta únicos)

  const norm = (s) =>
    !normalizarNombre || !s
      ? s
      : s.normalize('NFKC').trim().replace(/\s+/g, ' ');

  const getAcc = (empleadoRaw) => {
    const empleado = norm(empleadoRaw);
    if (!empleado) return null;
    if (!accMap.has(empleado)) {
      accMap.set(empleado, {
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
    return accMap.get(empleado);
  };

  for (let i = 0; i < ventas.length; i++) {
    const v = ventas[i];
    // Fallback estable si no hay id/numero_transac
    const idVenta = v?.id ?? v?.numero_transac ?? `venta_${i}`;

    // --- Productos (acepta camel y snake)
    const productos = Array.isArray(v?.detalle_ventaProductos)
      ? v.detalle_ventaProductos
      : Array.isArray(v?.detalle_ventaproductos)
      ? v.detalle_ventaproductos
      : [];

    for (const it of productos) {
      const empleado = it?.empleado_producto?.nombres_apellidos_empl;
      const acc = getAcc(empleado);
      if (!acc) continue;

      const cantidad = Number(it?.cantidad) || 0;
      const precio =
        Number(it?.tarifa_monto) ||
        Number(it?.tb_producto?.prec_venta) ||
        0;

      const importe = precio * cantidad;
      acc.ventasProductos += importe;
      acc.cantidadProductos += cantidad;
      ventasPorEmpleado.get(acc.empleado).add(idVenta);
    }

    // --- Servicios
    const servicios = Array.isArray(v?.detalle_ventaservicios)
      ? v.detalle_ventaservicios
      : [];

    for (const it of servicios) {
      const empleado = it?.empleado_servicio?.nombres_apellidos_empl;
      const acc = getAcc(empleado);
      if (!acc) continue;

      const cantidad = Number(it?.cantidad) || 0;
      const precio = Number(it?.tarifa_monto) || 0; // agrega aquí otros fallbacks si existen
      const importe = precio * cantidad;

      acc.ventasServicios += importe;
      acc.cantidadServicios += cantidad;
      ventasPorEmpleado.get(acc.empleado).add(idVenta);
    }
  }

  // Cierre: totales y cantidadVentas
  const out = [];
  for (const [empleado, acc] of accMap.entries()) {
    acc.totalVentas = acc.ventasProductos + acc.ventasServicios;
    acc.cantidadVentas = ventasPorEmpleado.get(empleado)?.size ?? 0;

    if (includeZero || acc.totalVentas > 0 || acc.cantidadVentas > 0) {
      out.push(acc);
    }
  }

  // Ordenar por métrica elegida
  out.sort((a, b) => {
    const va = Number(a?.[datoEstadistico]) || 0;
    const vb = Number(b?.[datoEstadistico]) || 0;
    return sortDir === 'asc' ? va - vb : vb - va;
  });

  return out;
}



export const MatrizEmpleadoMes = ({
  dataVenta = [],
  filtrarFecha = [],
  datoEstadistico = 'Total Ventas',
}) => {
  // Mapea la etiqueta elegida al campo del rankingPorEmpleado
  const METRIC_MAP = {
    'Total Ventas': 'totalVentas',
    'Cant. Ventas': 'cantidadVentas',
    'Ventas Productos': 'ventasProductos',
    'Cant. Productos': 'cantidadProductos',
    'Ventas Servicios': 'ventasServicios',
    'Cant. Servicios': 'cantidadServicios',
  };

  const metricKey = METRIC_MAP[datoEstadistico] ?? 'totalVentas';
  const isMoney =
    metricKey === 'totalVentas' ||
    metricKey === 'ventasProductos' ||
    metricKey === 'ventasServicios';

  // Normaliza meses: si te pasan un solo objeto, conviértelo en array
  const meses = Array.isArray(filtrarFecha) ? filtrarFecha : [filtrarFecha].filter(Boolean);

  // Precalcula por mes: rankingPorEmpleado(filtrado) -> Map(empleado -> valor)
  const { empleadosOrdenados, columnas, matriz, totalesFila, totalesCol } = useMemo(() => {
    // 1) Por cada mes, filtra ventas y arma ranking
    const columnas = meses.map((f) => {
      const ventasMes = filtrarVentasPorMes(dataVenta, f);
      const ranking = rankingPorEmpleado(ventasMes); // devuelve [{empleado, totalVentas, ...}]
      // armamos un map: empleado -> valor de la métrica elegida
      const map = new Map();
      for (const r of ranking) {
        map.set(r.empleado, Number(r[metricKey] || 0));
      }
      return {
        label: `${f?.label ?? f?.mes?.toUpperCase?.() ?? ''} ${f?.anio ?? ''}`.trim(),
        map,
      };
    });

    // 2) Conjunto de todos los empleados que aparezcan en cualquier mes
    const allEmpleados = new Set();
    for (const col of columnas) {
      for (const emp of col.map.keys()) allEmpleados.add(emp);
    }

    // 3) Construimos la matriz y totales por fila/columna
    const empleados = Array.from(allEmpleados);
    const matriz = empleados.map((emp) =>
      columnas.map((col) => Number(col.map.get(emp) || 0))
    );

    const totalesFila = matriz.map((row) => row.reduce((a, b) => a + b, 0));
    const totalesCol = columnas.map((_, j) =>
      matriz.reduce((acc, row) => acc + (row[j] || 0), 0)
    );

    // 4) Ordena empleados por total desc
    const idxs = empleados.map((_, i) => i);
    idxs.sort((i, j) => totalesFila[j] - totalesFila[i]);

    const empleadosOrdenados = idxs.map((i) => empleados[i]);
    const matrizOrdenada = idxs.map((i) => matriz[i]);
    const totalesFilaOrdenado = idxs.map((i) => totalesFila[i]);

    return {
      empleadosOrdenados,
      columnas,
      matriz: matrizOrdenada,
      totalesFila: totalesFilaOrdenado,
      totalesCol,
    };
  }, [dataVenta, filtrarFecha, datoEstadistico]);

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ marginBottom: 8, fontWeight: 600 }}>
        Métrica: {datoEstadistico}
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr className="bg-primary fs-3">
            <th style={thStyle}>Empleado</th>
            {columnas.map((c, i) => (
              <th key={i} style={thStyle}>{c.label}</th>
            ))}
            <th style={thStyle}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {empleadosOrdenados.length === 0 && (
            <tr>
              <td style={tdStyle} colSpan={columnas.length + 2}>
                Sin datos para este periodo
              </td>
            </tr>
          )}

          {empleadosOrdenados.map((emp, r) => (
            <tr key={emp}>
              <td style={tdStyle}>
                {/* si quieres solo el primer nombre como en tu otra tabla: */}
                {emp?.split?.(' ')?.[0] ?? emp}
              </td>

              {matriz[r].map((val, c) => (
                <td key={c} style={tdStyle}>
                  {isMoney ? <NumberFormatMoney amount={val} /> : val}
                </td>
              ))}

              <td style={{ ...tdStyle, fontWeight: 'bold' }}>
                {isMoney ? <NumberFormatMoney amount={totalesFila[r]} /> : totalesFila[r]}
              </td>
            </tr>
          ))}
        </tbody>

        {empleadosOrdenados.length > 0 && (
          <tfoot>
            <tr>
              <td style={{ ...tdStyle, fontWeight: 'bold' }}>TOTAL</td>
              {totalesCol.map((val, i) => (
                <td key={i} style={{ ...tdStyle, fontWeight: 'bold' }}>
                  {isMoney ? <NumberFormatMoney amount={val} /> : val}
                </td>
              ))}
              <td style={{ ...tdStyle, fontWeight: 'bold' }}>
                {isMoney
                  ? <NumberFormatMoney amount={totalesCol.reduce((a, b) => a + b, 0)} />
                  : totalesCol.reduce((a, b) => a + b, 0)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

// Reusa tus estilos
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

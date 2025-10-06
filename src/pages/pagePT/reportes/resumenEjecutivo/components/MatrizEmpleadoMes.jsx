import { NumberFormatMoney } from '@/components/CurrencyMask';
import React, { useMemo, useState, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/es';

dayjs.extend(utc);
dayjs.locale('es');

const mesAIndice = (m = '') => {
  const k = m.trim().toLowerCase();
  const mapa = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9,
    noviembre: 10, diciembre: 11,
  };
  return mapa[k] ?? -1;
};

const normalizeName = (s) =>
  !s ? '' : s.normalize('NFKC').trim().replace(/\s+/g, ' ');

function filtrarVentasPorMes(ventas = [], filtro) {
  if (!filtro || !filtro.mes || !filtro.anio) return ventas;
  const monthIdx = mesAIndice(filtro.mes);
  const yearNum = Number(filtro.anio);
  if (monthIdx < 0 || !Number.isFinite(yearNum)) return ventas;

  return ventas.filter((v) => {
    const d = dayjs.utc(v?.fecha_venta);
    if (!d.isValid()) return false;
    return d.year() === yearNum && d.month() === monthIdx;
  });
}

// --- igual que antes
function rankingPorEmpleado(
  ventas = [],
  {
    datoEstadistico = 'totalVentas',
    sortDir = 'desc',
    includeZero = false,
    normalizarNombre = true
  } = {}
) {
  const accMap = new Map();
  const ventasPorEmpleado = new Map();

  const norm = (s) => (!normalizarNombre ? s : normalizeName(s));

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
    const idVenta = v?.id ?? v?.numero_transac ?? `venta_${i}`;

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
      const importe = precio;

      acc.ventasProductos += importe;
      acc.cantidadProductos += cantidad;
      ventasPorEmpleado.get(acc.empleado).add(idVenta);
    }

    const servicios = Array.isArray(v?.detalle_ventaservicios)
      ? v.detalle_ventaservicios
      : [];

    for (const it of servicios) {
      const empleado = it?.empleado_servicio?.nombres_apellidos_empl;
      const acc = getAcc(empleado);
      if (!acc) continue;

      const cantidad = Number(it?.cantidad) || 0;
      const precio = Number(it?.tarifa_monto) || 0;
      const importe = precio;

      acc.ventasServicios += importe;
      acc.cantidadServicios += cantidad;
      ventasPorEmpleado.get(acc.empleado).add(idVenta);
    }
  }

  const out = [];
  for (const [empleado, acc] of accMap.entries()) {
    acc.totalVentas = acc.ventasProductos + acc.ventasServicios;
    acc.cantidadVentas = ventasPorEmpleado.get(empleado)?.size ?? 0;
    if (includeZero || acc.totalVentas > 0 || acc.cantidadVentas > 0) {
      out.push(acc);
    }
  }

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

  const meses = Array.isArray(filtrarFecha) ? filtrarFecha : [filtrarFecha].filter(Boolean);

  // ---- estado del modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRows, setModalRows] = useState([]); // [{id, fecha_venta}]
  const [modalTitle, setModalTitle] = useState('');

  // helper: lista de ventas (id, fecha_venta) por empleado + mes
  const getVentasDeCelda = useCallback(
    (empleadoNombre, idxMes) => {
      const filtroMes = meses[idxMes];
      const ventasMes = filtrarVentasPorMes(dataVenta, filtroMes);
      const objetivo = normalizeName(empleadoNombre);

      const filas = [];
      const seen = new Set();

      for (let i = 0; i < ventasMes.length; i++) {
        const v = ventasMes[i];
        const id = v?.id ?? v?.numero_transac ?? `venta_${i}_${idxMes}`;

        // ¿esta venta tiene participación de ese empleado en productos o servicios?
        const productos = Array.isArray(v?.detalle_ventaProductos)
          ? v.detalle_ventaProductos
          : Array.isArray(v?.detalle_ventaproductos)
          ? v.detalle_ventaproductos
          : [];

        const matchProd = productos.some(
          (it) => normalizeName(it?.empleado_producto?.nombres_apellidos_empl) === objetivo
        );

        const servicios = Array.isArray(v?.detalle_ventaservicios)
          ? v.detalle_ventaservicios
          : [];

        const matchServ = servicios.some(
          (it) => normalizeName(it?.empleado_servicio?.nombres_apellidos_empl) === objetivo
        );

        if (matchProd || matchServ) {
          if (!seen.has(id)) {
            seen.add(id);
            
            filas.push({
              id,
              fecha_venta: v?.fecha_venta ? dayjs(v.fecha_venta).toISOString() : '',
              ...v
            });
          }
        }
      }
      return filas;
    },
    [dataVenta, meses]
  );

  const { empleadosOrdenados, columnas, matriz, totalesFila, totalesCol } = useMemo(() => {
    const columnas = meses.map((f) => {
      const ventasMes = filtrarVentasPorMes(dataVenta, f);
      const ranking = rankingPorEmpleado(ventasMes);
      const map = new Map();
      for (const r of ranking) {
        map.set(r.empleado, Number(r[metricKey] || 0));
      }
      return {
        label: `${f?.label ?? f?.mes?.toUpperCase?.() ?? ''} ${f?.anio ?? ''}`.trim(),
        filtroMes: f, // guardo el filtro para accesos
        map,
      };
    });

    const allEmpleados = new Set();
    for (const col of columnas) for (const emp of col.map.keys()) allEmpleados.add(emp);

    const empleados = Array.from(allEmpleados);
    const matriz = empleados.map((emp) => columnas.map((col) => Number(col.map.get(emp) || 0)));

    const totalesFila = matriz.map((row) => row.reduce((a, b) => a + b, 0));
    const totalesCol = columnas.map((_, j) => matriz.reduce((acc, row) => acc + (row[j] || 0), 0));

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
  }, [dataVenta, filtrarFecha, metricKey, meses]);

  const onCellClick = (emp, colIndex, valor) => {
    if (!emp || !meses[colIndex]) return;
    // si la celda está en cero, igual abrimos por si quieren ver (o puedes bloquear aquí)
    const filas = getVentasDeCelda(emp, colIndex);
    setModalRows(filas);
    setModalTitle(`${emp?.split?.(' ')?.[0] ?? emp} — ${columnas[colIndex]?.label} (${isMoney ? 'monto' : 'valor'}: ${valor})`);
    setModalOpen(true);
  };

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>
          Métrica: {datoEstadistico}
        </div>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr className="bg-primary fs-3">
              <th style={thStyle}>Empleado</th>
              {columnas.map((c, i) => (
                <th 
                    className='fs-3'
                key={i} style={thStyle}>{c.label}</th>
              ))}
              <th 
                    className='fs-3'
              style={thStyle}>TOTAL</th>
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
                <td style={tdStyle} 
                    className='fs-3'
                >
                  {emp?.split?.(' ')?.[0] ?? emp}
                </td>

                {matriz[r].map((val, c) => (
                  <td
                    key={c}
                    className='fs-3'
                    style={{ ...tdStyle, cursor: 'pointer', textDecoration: 'underline dotted' }}
                    title="Ver ventas (id, fecha_venta)"
                    // onClick={() => onCellClick(emp, c, isMoney ? Number(val).toFixed(2) : val)}
                    aria-label="Abrir ventas de la celda"
                  >
                    {isMoney ? <NumberFormatMoney amount={val} /> : val}
                  </td>
                ))}

                <td
                    className='fs-3'
                style={{ ...tdStyle, fontWeight: 'bold' }}>
                  {isMoney ? <NumberFormatMoney amount={totalesFila[r]} /> : totalesFila[r]}
                </td>
              </tr>
            ))}
          </tbody>

          {empleadosOrdenados.length > 0 && (
            <tfoot>
              <tr>
                <td 
                    className='fs-3'
                style={{ ...tdStyle, fontWeight: 'bold' }}>TOTAL</td>
                {totalesCol.map((val, i) => (
                  <td key={i}
                  className='fs-3'
                  style={{ ...tdStyle, fontWeight: 'bold' }}>
                    {isMoney ? <NumberFormatMoney amount={val} /> : val}
                  </td>
                ))}
                <td
                    className='fs-3'
                style={{ ...tdStyle, fontWeight: 'bold' }}>
                  {isMoney
                    ? <NumberFormatMoney amount={totalesCol.reduce((a, b) => a + b, 0)} />
                    : totalesCol.reduce((a, b) => a + b, 0)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Modal con tabla (id, fecha_venta) */}
      <Dialog
        header={modalTitle || 'Ventas'}
        visible={modalOpen}
        style={{ width: '60rem', maxWidth: '95vw' }}
        modal
        onHide={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button label="Cerrar" onClick={() => setModalOpen(false)} />
          </div>
        }
      >
        {/* <pre>
          {JSON.stringify(modalRows, null, 2)}
        </pre> */}
        {modalRows.length === 0 ? (
          <div className="py-2">Sin ventas para esta celda.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>VENTA PRODUCTOS</th>
                  <th style={thStyle}>VENTA SERVICIOS</th>
                  <th style={thStyle}>FECHA_VENTA</th>
                </tr>
              </thead>
              <tbody>
                {modalRows.map((row) => (
                  <tr key={row.id}>
                    <td style={tdStyle}>{row.id}</td>
                    <td style={tdStyle}>{row.detalle_ventaProductos?.reduce((total, item)=>item?.tarifa_monto+total,0)}</td>
                    <td style={tdStyle}>{row.detalle_ventaservicios?.reduce((total, item)=>item?.tarifa_monto+total,0)}</td>
                    <td style={tdStyle}>
                      {/* ISO 8601 como prefieres */}
                      {row.fecha_venta || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Dialog>
    </>
  );
};

// estilos
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

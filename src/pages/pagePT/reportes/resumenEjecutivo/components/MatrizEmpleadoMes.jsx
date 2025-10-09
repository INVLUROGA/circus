import { NumberFormatMoney } from '@/components/CurrencyMask';
import React, { useMemo, useState, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/es';
import { set } from 'lodash';

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
const toKey = (s='') =>
  s
    .normalize('NFKD')                 // separa acentos
    .replace(/[\u0300-\u036f]/g, '')   // quita acentos
    .trim()
    .toLowerCase();

const firstWord = (s='') => toKey(s).split(' ')[0] || '';
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
  excluirNombres = ['LUIS', 'JESUS', 'FATIMA', 'MIA', 'KATIA', 'TIBISAY'],
}) => {
  // --- buscadores
const [q, setQ] = useState('');          // buscador principal (empleados)
const [qModal, setQModal] = useState(''); // buscador dentro del modal

const normq = (s='') =>
  s.normalize('NFKC')
   .toLowerCase()
   .trim()
   .replace(/\s+/g, ' ');

const matchIncludes = (haystack, needle) =>
  normq(haystack).includes(normq(needle));

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
  const RATE_IGV = 0.18;
  const RATE_RENTA=0.03;
  const RATE_TARJETA=0.045;



  // ---- estado del modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRows, setModalRows] = useState([]); // [{id, fecha_venta}]
  const [modalTitle, setModalTitle] = useState('');
  const [modalMonto, setModalMonto] = useState(0);
  const [modalResumen,setModalResumen]=useState(null);

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
  const buildBreakdown = (brutoNum = 0) => {
  const bruto = Number(brutoNum) || 0;
  const igv = +(bruto * RATE_IGV).toFixed(2);
  const renta = +(bruto * RATE_RENTA).toFixed(2);
  const tarjeta = +(bruto * RATE_TARJETA).toFixed(2);
  const neto = +(bruto - igv - renta - tarjeta).toFixed(2);
  return { bruto, igv, renta, tarjeta, neto };
};

const excluirSet = useMemo(() => {
  const set = new Set(excluirNombres.map(toKey));
  return set;
}, [excluirNombres]);

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

  // aplica el filtro por empleado (buscador principal)
const {
  empleadosFiltrados,
  matrizFiltrada,
  totalesFilaFiltrada
} = useMemo(() => {
  // Índices que pasan el filtro de buscador Y NO están excluidos
  const keepIdx = empleadosOrdenados
    .map((emp, i) => ({ emp, i }))
    .filter(({ emp }) => {
      // fuera si está en la lista de exclusión
      const empKey = toKey(emp);
      if (excluirSet.has(empKey) || excluirSet.has(firstWord(emp))) return false;

      // si no hay query, aceptarlo
      if (!q) return true;

      // si hay query, aplicar match
      return matchIncludes(emp, q);
    })
    .map(({ i }) => i);

  return {
    empleadosFiltrados: keepIdx.map(i => empleadosOrdenados[i]),
    matrizFiltrada: keepIdx.map(i => matriz[i]),
    totalesFilaFiltrada: keepIdx.map(i => totalesFila[i]),
  };
}, [q, empleadosOrdenados, matriz, totalesFila, excluirSet]);
const onCellClick = (emp, colIndex, valor) => {
  if (!emp || !meses[colIndex]) return;

  // 🔹 Obtiene las ventas del empleado en ese mes
  const filas = getVentasDeCelda(emp, colIndex);
  setModalRows(filas);

  // 🔹 Calcular total de compra de productos (prec_compra)
  let totalCompra = 0;

  for (const venta of filas) {
    const productos = Array.isArray(venta.detalle_ventaProductos)
      ? venta.detalle_ventaProductos
      : Array.isArray(venta.detalle_ventaproductos)
      ? venta.detalle_ventaproductos
      : [];

    for (const it of productos) {
      const costo = Number(it?.tb_producto?.prec_compra) || 0;
      const cantidad = Number(it?.cantidad) || 1;
      totalCompra += costo * cantidad;
    }
  }

  // 🔹 Calcular resumen con descuentos
  const bruto = Number(valor) || 0;
  const resumen = buildBreakdown(bruto);

  // 🔹 Añadimos costo de compra y neto final
  resumen.costoCompra = totalCompra;
  resumen.netoFinal = +(resumen.neto - totalCompra).toFixed(2);

  // 🔹 Guardar datos en estado del modal
  setModalMonto(bruto);
  setModalResumen(resumen);
  setModalTitle(`${emp?.split?.(' ')?.[0] ?? emp} - ${columnas[colIndex]?.label}`);
  setModalOpen(true);
};

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>
          Métrica: {datoEstadistico}
        </div>
        
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar empleado..."
          className="p-inputtext p-component"
          style={{ minWidth: 260, padding: 8 }}
          aria-label="Buscar empleado"
        />
        {q && (
          <Button
            label="Limpiar"
            onClick={() => setQ('')}
            severity="secondary"
            outlined
          />
        )}
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
            {empleadosFiltrados.length === 0 && (
              <tr>
                <td style={tdStyle} colSpan={columnas.length + 2}>
                  Sin datos para este periodo
                </td>
              </tr>
            )}

            {empleadosFiltrados.map((emp, r) => (
              <tr key={emp}>
                <td style={tdStyle} 
                    className='fs-3'
                >
                  {emp?.split?.(' ')?.[0] ?? emp}
                </td>

                {matrizFiltrada[r].map((val, c) => (
                  <td
                    key={c}
                    className='fs-3'
                    style={{ ...tdStyle, cursor: 'pointer', textDecoration: 'underline dotted' }}
                    title="Ver ventas (id, fecha_venta)"
                    onClick={() => onCellClick(emp, c, isMoney ? Number(val).toFixed(2) : val)}
                    aria-label="Abrir ventas de la celda"
                  >
                    {isMoney ? <NumberFormatMoney amount={val} /> : val}
                  </td>
                ))}

                <td
                    className='fs-3'
                style={{ ...tdStyle, fontWeight: 'bold' }}>
                  {isMoney ? <NumberFormatMoney amount={totalesFilaFiltrada[r]} /> : totalesFilaFiltrada[r]}
                </td>
              </tr>
            ))}
          </tbody>

          {empleadosFiltrados.length > 0 && (
              <tfoot>
                <tr>
                  <td className='fs-3' style={{ ...tdStyle, fontWeight: 'bold' }}>TOTAL</td>
                  {columnas.map((_, i) => (
                    <td key={i} className='fs-3' style={{ ...tdStyle, fontWeight: 'bold' }}>
                      {isMoney
                        ? <NumberFormatMoney amount={
                            matrizFiltrada.reduce((acc, row) => acc + (row[i] || 0), 0)
                          } />
                        : matrizFiltrada.reduce((acc, row) => acc + (row[i] || 0), 0)
                      }
                    </td>
                  ))}
                  <td className='fs-3' style={{ ...tdStyle, fontWeight: 'bold' }}>
                    {isMoney
                      ? <NumberFormatMoney amount={
                          matrizFiltrada.flat().reduce((a, b) => a + b, 0)
                        } />
                      : matrizFiltrada.flat().reduce((a, b) => a + b, 0)
                    }
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
  {/* ---- Desglose de descuentos ---- */}
  {modalResumen && (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 ,textAlign:'center',fontSize:'30px'}}>Detalle de descuentos</div>
      <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 12 }}>
        <thead>
          <tr>
            <th className='bg-primary'style={thStyle}>Concepto</th>
            <th className='bg-primary'style={thStyle}>Tasa</th>
            <th className='bg-primary' style={thStyle}>Monto</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}>Monto bruto</td>
            <td style={tdStyle}>—</td>
            <td style={tdStyle}><NumberFormatMoney amount={modalResumen.bruto}/></td>
          </tr>
          <tr>
            <td style={tdStyle}>IGV</td>
            <td style={tdStyle}>{(RATE_IGV*100).toFixed(2)} %</td>
            <td style={{...tdStyle,color:'red'}}>- <NumberFormatMoney amount={modalResumen.igv}/></td>
          </tr>
          <tr>
            <td style={tdStyle}>Impuesto a la renta</td>
            <td style={tdStyle}>{(RATE_RENTA*100).toFixed(2)} %</td>
            <td style={{...tdStyle,color:'red'}}>- <NumberFormatMoney amount={modalResumen.renta} /></td>
          </tr>
          <tr>
            <td style={tdStyle}>Tarjeta de crédito</td>
            <td style={tdStyle}>{(RATE_TARJETA*100).toFixed(2)} %</td>
            <td style={{...tdStyle,color:'red'}}>- <NumberFormatMoney amount={modalResumen.tarjeta} /></td>
          </tr>
              <tr>
            <td style={{ ...tdStyle, fontWeight: '700' }}>INGRESO NETO</td>
            <td style={tdStyle}>—</td>
            <td style={{ ...tdStyle, fontWeight: '700' }}>
              <NumberFormatMoney amount={modalResumen.neto} />
            </td>
          </tr>
          <tr>
  <td style={tdStyle}>Costo de compra (productos)</td>
  <td style={tdStyle}>—</td>
  <td style={{...tdStyle,color:'red'}}>- <NumberFormatMoney amount={modalResumen.costoCompra} /></td>
</tr>
      
          <tr>
  <td style={{ ...tdStyle, fontWeight: '700' }}>UTILIDAD NETA </td>
  <td style={tdStyle}>—</td>
  <td style={{ ...tdStyle, fontWeight: '700', color: '#007b00' }}>
    <NumberFormatMoney amount={modalResumen.netoFinal} />
  </td>
</tr>
        </tbody>
      </table>
    </div>
  )}

  {/* ---- Tu tabla de ventas existente ---- */}
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
              <td style={tdStyle}>
                <NumberFormatMoney amount={
                  (row.detalle_ventaProductos || row.detalle_ventaproductos || [])
                    .reduce((t, it) => t + (Number(it?.tarifa_monto) || 0), 0)
                }/>
              </td>
              <td style={tdStyle}>
                <NumberFormatMoney amount={
                  (row.detalle_ventaservicios || [])
                    .reduce((t, it) => t + (Number(it?.tarifa_monto) || 0), 0)
                }/>
              </td>
              <td style={tdStyle}>{row.fecha_venta || ''}</td>
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
  fontSize :'20px'
};
const tdStyle = {
  border: '1px solid #ccc',
  padding: '8px',
  textAlign: 'center',
  fontSize : '18px'
};

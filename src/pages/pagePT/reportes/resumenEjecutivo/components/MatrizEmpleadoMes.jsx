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
// 🎨 Estilos refinados
const thStyle = {
  border: '1px solid #bbb',
  padding: '6px 10px',
  textAlign: 'center',
  fontWeight: '600',
  fontSize: '16px',
  letterSpacing: '0.3px',
};

const tdStyle = {
  border: '1px solid #ccc',
  padding: '6px 8px',
  textAlign: 'center',
  fontSize: '15px',
  verticalAlign: 'middle',
};

const innerTableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '2px',
};

const thInner = {
  ...thStyle,
  fontSize: '14px',
  padding: '5px',
  backgroundColor: '#eef7ff',
};

const tdInner = {
  ...tdStyle,
  fontSize: '14px',
  padding: '5px',
};



  // ---- estado del modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRows, setModalRows] = useState([]); // [{id, fecha_venta}]
  const [modalTitle, setModalTitle] = useState('');
  const [modalMonto, setModalMonto] = useState(0);
  const [modalResumen,setModalResumen]=useState(null);
  const [showDetalleProductos, setShowDetalleProductos] = useState(false);
const [productosDetalle, setProductosDetalle] = useState([]);
const [showDetalleServicios, setShowDetalleServicios] = useState(false);
const [serviciosDetalle, setServiciosDetalle] = useState([]);



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

  // 🔹 1. Obtiene todas las ventas del empleado en ese mes
  const filas = getVentasDeCelda(emp, colIndex);
  setModalRows(filas);

  // 🔹 2. Calcular el total de compra de productos (equivalente a la consulta SQL)
  let totalCompra = 0;
  const productosDetalle = [];

  for (const venta of filas) {
    const productos = Array.isArray(venta.detalle_ventaProductos)
      ? venta.detalle_ventaProductos
      : Array.isArray(venta.detalle_ventaproductos)
      ? venta.detalle_ventaproductos
      : [];

    for (const it of productos) {
      const producto = it?.tb_producto;
      const cantidad = Number(it?.cantidad) || 1;
      const precCompra = Number(producto?.prec_compra) || 0;
      const precVenta =
        Number(it?.precio_unitario) ||
        Number(producto?.prec_venta) ||
        0;

      totalCompra += cantidad * precCompra;

      productosDetalle.push({
        nombre: producto?.nombre_producto || "—",
        cantidad,
        precioCompra: precCompra,
        precioVenta: precVenta,
      });
    }
  }

  // 🔹 3. Calcular el resumen con los descuentos
  const bruto = Number(valor) || 0;
  const resumen = buildBreakdown(bruto);

  // 🔹 4. Agregar costo de compra y utilidad neta final
  resumen.costoCompra = totalCompra;
  resumen.netoFinal = +(resumen.neto - totalCompra).toFixed(2);

  // 🔹 5. Actualizar estados del modal
  setModalMonto(bruto);
  setModalResumen(resumen);const mes = columnas[colIndex]?.label?.toUpperCase?.() ?? '';
const nombre = (emp?.split?.(' ')?.[0] ?? emp)?.toUpperCase?.() ?? '';
setModalTitle(`${mes} – ${nombre}`);

  setModalTitle(`${emp?.split?.(' ')?.[0] ?? emp} - ${columnas[colIndex]?.label}`);
  setProductosDetalle(productosDetalle);
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
        <table  style={{ borderCollapse: 'collapse', width: '100%' }}>
         <thead className="bg-warning text-dark">
  <tr className="fs-3">
    <th style={thStyle}>Empleado</th>
    {columnas.map((c, i) => (
      <th key={i} className="fs-3" style={thStyle}>{c.label}</th>
    ))}
    <th className="fs-3" style={thStyle}>TOTAL</th>
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
{/* ✅ MODAL PRINCIPAL CON DESCUENTOS + DETALLE DE VENTAS */}
<Dialog
  header={
    <div
      style={{
        textAlign: "center",
        fontSize: "30px",
        fontWeight: "700",
        letterSpacing: "0.5px",
      }}
    >
      {modalTitle || "Ventas"}
    </div>
  }
  visible={modalOpen}
  style={{ width: "85rem", maxWidth: "95vw" }}
  modal
  onHide={() => setModalOpen(false)}
  footer={
    <div className="flex justify-end gap-2">
      <Button label="Cerrar" onClick={() => setModalOpen(false)} />
    </div>
  }
>
  {/* ===================== DETALLE DE DESCUENTOS ===================== */}
  {modalResumen && (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontWeight: 700,
          marginBottom: 8,
          textAlign: "center",
          fontSize: "30px",
        }}
      >
        DETALLE DE DESCUENTOS
      </div>

      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          marginBottom: 12,
        }}
      >
        <thead>
          <tr>
            <th className="bg-primary" style={thStyle}>CONCEPTO</th>
            <th className="bg-primary" style={thStyle}>TASA</th>
            <th className="bg-primary" style={thStyle}>MONTO</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}>Monto bruto</td>
            <td style={tdStyle}>—</td>
            <td style={tdStyle}>
              <NumberFormatMoney amount={modalResumen.bruto} />
            </td>
          </tr>

          <tr>
            <td style={tdStyle}>IGV</td>
            <td style={tdStyle}>{(RATE_IGV * 100).toFixed(2)} %</td>
            <td style={{ ...tdStyle, color: "red" }}>
              - <NumberFormatMoney amount={modalResumen.igv} />
            </td>
          </tr>

          <tr>
            <td style={tdStyle}>Impuesto a la renta</td>
            <td style={tdStyle}>{(RATE_RENTA * 100).toFixed(2)} %</td>
            <td style={{ ...tdStyle, color: "red" }}>
              - <NumberFormatMoney amount={modalResumen.renta} />
            </td>
          </tr>

          <tr>
            <td style={tdStyle}>Tarjeta de crédito</td>
            <td style={tdStyle}>{(RATE_TARJETA * 100).toFixed(2)} %</td>
            <td style={{ ...tdStyle, color: "red" }}>
              - <NumberFormatMoney amount={modalResumen.tarjeta} />
            </td>
          </tr>

          <tr>
            <td style={{ ...tdStyle, fontWeight: "700" }}>INGRESO NETO</td>
            <td style={tdStyle}>—</td>
            <td style={{ ...tdStyle, fontWeight: "700" }}>
              <NumberFormatMoney amount={modalResumen.neto} />
            </td>
          </tr>

          <tr>
            <td style={tdStyle}>
              Costo de compra (productos)
              <i
                className="pi pi-eye"
                style={{ marginLeft: 8, cursor: "pointer", color: "#007bff" }}
                title="Ver detalle de productos"
                onClick={() => setShowDetalleProductos(true)}
              />
            </td>
            <td style={tdStyle}>—</td>
            <td style={{ ...tdStyle, color: "red", fontWeight: "bold" }}>
              - <NumberFormatMoney amount={modalResumen.costoCompra} />
            </td>
          </tr>

          <tr>
            <td style={{ ...tdStyle, fontWeight: "700" }}>UTILIDAD NETA</td>
            <td style={tdStyle}>—</td>
            <td style={{ ...tdStyle, fontWeight: "700", color: "#007b00" }}>
              <NumberFormatMoney amount={modalResumen.netoFinal} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )}

  {/* ===================== DETALLE DE PRODUCTOS Y SERVICIOS (compacto) ===================== */}
  {modalRows.length === 0 ? (
    <div className="py-2">Sin ventas para esta celda.</div>
  ) : (
    <>
      {(() => {
        // ---- Aplanar productos y servicios del mes seleccionado
        const flatProductos = [];
        const flatServicios = [];

        for (const row of modalRows) {
          const productos = row.detalle_ventaProductos || row.detalle_ventaproductos || [];
          const servicios = row.detalle_ventaservicios || [];

          for (const p of productos) {
            flatProductos.push({
              nombre: p?.tb_producto?.nombre_producto || '—',
              cantidad: Number(p?.cantidad) || 1,
              pCompra: Number(p?.tb_producto?.prec_compra) || 0,
              pVenta:
                Number(p?.tarifa_monto) ||
                Number(p?.precio_unitario) ||
                Number(p?.tb_producto?.prec_venta) || 0,
            });
          }

          for (const s of servicios) {
            flatServicios.push({
              nombre: s?.circus_servicio?.nombre_servicio || '—',
              cantidad: Number(s?.cantidad) || 1,
              duracion: s?.circus_servicio?.duracion ?? '—',
              pVenta: Number(s?.tarifa_monto) || 0,
            });
          }
        }

        // ---- Totales
        const totalPVentaProd = flatProductos.reduce((a,b)=>a + (b.pVenta * b.cantidad), 0);
        const totalPCompraProd = flatProductos.reduce((a,b)=>a + (b.pCompra * b.cantidad), 0);
        const totalUtilProd   = totalPVentaProd - totalPCompraProd;
        const totalPVentaServ = flatServicios.reduce((a,b)=>a + (b.pVenta * b.cantidad), 0);
        const totalItems = flatProductos.length + flatServicios.length;

        // ---- Estilos compactos
        const compactTh = {
          border: '1px solid #e6e6e6',
          padding: '6px 8px',
          textAlign: 'center',
          fontWeight: 700,
          fontSize: 14,
          background: '#fafafa',
          whiteSpace: 'nowrap',
        };
        const compactTd = {
          border: '1px solid #eee',
          padding: '6px 8px',
          textAlign: 'center',
          fontSize: 14,
          whiteSpace: 'nowrap',
        };
        const zebra = (i) => (i % 2 ? { background: '#fcfcfc' } : null);

        return (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                fontWeight: 800,
                marginBottom: 10,
                textAlign: 'center',
                fontSize: 22,
                letterSpacing: .3,
              }}
            >
              DETALLE DE PRODUCTOS Y SERVICIOS
            </div>

            {/* Resumen mini en cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
                gap: 8,
                marginBottom: 10,
              }}
            >
              <div style={{padding:10,border:'1px solid #eee',borderRadius:8,background:'#fff'}}>
                <div style={{fontSize:12,opacity:.7}}>Venta Productos</div>
                <div style={{fontWeight:800}}>
                  <NumberFormatMoney amount={totalPVentaProd} />
                </div>
              </div>
              <div style={{padding:10,border:'1px solid #eee',borderRadius:8,background:'#fff'}}>
                <div style={{fontSize:12,opacity:.7}}>Venta Servicios</div>
                <div style={{fontWeight:800}}>
                  <NumberFormatMoney amount={totalPVentaServ} />
                </div>
              </div>
              <div style={{padding:10,border:'1px solid #eee',borderRadius:8,background:'#fff'}}>
                <div style={{fontSize:12,opacity:.7}}>Ítems totales</div>
                <div style={{fontWeight:800}}>{totalItems}</div>
              </div>
            </div>

            {/* Dos tablas lado a lado */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0,1fr))',
                gap: 12,
              }}
            >
              {/* -------- Productos -------- */}
              

              {/* -------- Servicios -------- */}
              <div>
                <div style={{fontWeight:700, margin:'6px 0'}}>Servicios</div>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={compactTh}>Servicio</th>
                      <th style={compactTh}>Cant.</th>
                      <th style={compactTh}>Duración</th>
                      <th style={compactTh}>P. Venta</th>
                      <th style={compactTh}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flatServicios.length === 0 ? (
                      <tr><td colSpan={5} style={compactTd}>—</td></tr>
                    ) : flatServicios.map((s, i) => {
                      const sub = s.pVenta * s.cantidad;
                      return (
                        <tr key={i} style={zebra(i)}>
                          <td style={compactTd}>{s.nombre}</td>
                          <td style={compactTd}>{s.cantidad}</td>
                          <td style={compactTd}>{s.duracion}</td>
                          <td style={{...compactTd}}>
                            <NumberFormatMoney amount={s.pVenta} />
                          </td>
                          <td style={{...compactTd, fontWeight:600, color:'#007b00'}}>
                            <NumberFormatMoney amount={sub} />
                          </td>
                        </tr>
                      );
                    })}
                    {/* Totales */}
                    <tr>
                      <td style={{...compactTd, fontWeight:800}} colSpan={4}>TOTAL SERVICIOS</td>
                      <td style={{...compactTd, fontWeight:800, color:'#007b00'}}>
                        <NumberFormatMoney amount={totalPVentaServ} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  )}
</Dialog>
{/* ✅ SUBMODAL — DETALLE DE PRODUCTOS (compacto) */}
<Dialog
  header="Detalle de productos vendidos"
  visible={showDetalleProductos}
  style={{ width: "55rem", maxWidth: "95vw" }}
  modal
  onHide={() => setShowDetalleProductos(false)}
  footer={
    <div className="flex justify-end gap-2">
      <Button label="Cerrar" onClick={() => setShowDetalleProductos(false)} />
    </div>
  }
>
  {(() => {
    // ---- Totales
    const totalPVentaProd = productosDetalle.reduce((a, b) => a + (b.precioVenta * b.cantidad), 0);
    const totalPCompraProd = productosDetalle.reduce((a, b) => a + (b.precioCompra * b.cantidad), 0);
    const totalUtilProd = totalPVentaProd - totalPCompraProd;

    // ---- Estilos compactos
    const compactTh = {
      border: '1px solid #e6e6e6',
      padding: '6px 8px',
      textAlign: 'center',
      fontWeight: 700,
      fontSize: 14,
      background: '#fafafa',
      whiteSpace: 'nowrap',
    };
    const compactTd = {
      border: '1px solid #eee',
      padding: '6px 8px',
      textAlign: 'center',
      fontSize: 14,
      whiteSpace: 'nowrap',
    };
    const zebra = (i) => (i % 2 ? { background: '#fcfcfc' } : null);

    return (
      <>
        <div
          style={{
            fontWeight: 800,
            marginBottom: 10,
            textAlign: 'center',
            fontSize: 20,
            letterSpacing: .3,
          }}
        >
          DETALLE DE PRODUCTOS
        </div>

        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={compactTh}>Producto</th>
              <th style={compactTh}>Cant.</th>
              <th style={compactTh}>P. Venta</th>
              <th style={compactTh}>P. Compra</th>
              <th style={compactTh}>Utilidad</th>
            </tr>
          </thead>
          <tbody>
            {productosDetalle.length === 0 ? (
              <tr><td colSpan={5} style={compactTd}>No se vendieron productos.</td></tr>
            ) : (
              productosDetalle.map((p, i) => {
                const venta = p.precioVenta * p.cantidad;
                const compra = p.precioCompra * p.cantidad;
                const util = venta - compra;
                return (
                  <tr key={i} style={zebra(i)}>
                    <td style={compactTd}>{p.nombre}</td>
                    <td style={compactTd}>{p.cantidad}</td>
                    <td style={{...compactTd, color:'#007b00', fontWeight:600}}>
                      <NumberFormatMoney amount={venta} />
                    </td>
                    <td style={{...compactTd, color:'red'}}>
                      <NumberFormatMoney amount={compra} />
                    </td>
                    <td style={{...compactTd, fontWeight:700, color: util>=0 ? '#007b00' : 'red'}}>
                      <NumberFormatMoney amount={util} />
                    </td>
                  </tr>
                );
              })
            )}

            {/* Totales */}
            {productosDetalle.length > 0 && (
              <tr>
                <td style={{...compactTd, fontWeight:800}} colSpan={2}>TOTALES</td>
                <td style={{...compactTd, fontWeight:800, color:'#007b00'}}>
                  <NumberFormatMoney amount={totalPVentaProd} />
                </td>
                <td style={{...compactTd, fontWeight:800, color:'red'}}>
                  <NumberFormatMoney amount={totalPCompraProd} />
                </td>
                <td style={{...compactTd, fontWeight:800, color: totalUtilProd>=0 ? '#007b00' : 'red'}}>
                  <NumberFormatMoney amount={totalUtilProd} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </>
    );
  })()}
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

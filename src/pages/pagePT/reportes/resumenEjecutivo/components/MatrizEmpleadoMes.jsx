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

      const cantidad = it?.cantidad == null ? 1 : (Number(it?.cantidad) || 0);
      const precio =
        Number(it?.tarifa_monto) ||
        Number(it?.tb_producto?.prec_venta) ||
        0;
      const importe = precio*cantidad;

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
      const importe = precio*cantidad;

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
const [q, setQ] = useState('');          
const [qModal, setQModal] = useState('');

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
  const RATE_COMISION = 0.10; 
const tdStyle = {
  border: '1px solid #ccc',
  padding: '6px 8px',
  textAlign: 'center',
  fontSize: '20px',
  verticalAlign: 'middle',
};

  // ---- estado del modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRows, setModalRows] = useState([]); // [{id, fecha_venta}]
  const [modalTitle, setModalTitle] = useState('');
  const [modalMonto, setModalMonto] = useState(0);
  const [modalResumen,setModalResumen]=useState(null);
  const [showDetalleProductos, setShowDetalleProductos] = useState(false);
  const [productosDetalle, setProductosDetalle] = useState([]);
  const [empleadoObjetivo, setEmpleadoObjetivo] = useState('');


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
        filtroMes: f,
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
       const objetivo = normalizeName(emp);
       setEmpleadoObjetivo(objetivo);
       const filas = getVentasDeCelda(emp, colIndex);
       setModalRows(filas);

      let totalCompra = 0;
      const productosDetalle = [];

      for (const venta of filas) {
        const productos = Array.isArray(venta.detalle_ventaProductos)
          ? venta.detalle_ventaProductos
          : Array.isArray(venta.detalle_ventaproductos)
          ? venta.detalle_ventaproductos
          : [];

        for (const it of productos) {
           const empProd = normalizeName(it?.empleado_producto?.nombres_apellidos_empl);
      if (empProd !== objetivo) continue;
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

      const bruto = Number(valor) || 0;
      const resumen = buildBreakdown(bruto);

      resumen.costoCompra = totalCompra;
      resumen.netoFinal = +(resumen.neto - totalCompra).toFixed(2);

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
         <thead className="bg-primary text-dark">
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
    fontSize: "22px",       
  }}
>
  <thead>
    <tr style={{ fontSize: "24px" }}> 
      <th className="bg-primary" style={thStyle}>CONCEPTO</th>
      <th className="bg-primary" style={thStyle}>TASA</th>
      <th className="bg-primary" style={thStyle}>MONTO</th>
    </tr>
  </thead>

  <tbody style={{ fontSize: "40px" }}> {/* 👈 tamaño del cuerpo */}
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
      <td style={{ ...tdStyle, fontWeight: "700" }}>UTILIDAD</td>
      <td style={tdStyle}>—</td>
      <td style={{ ...tdStyle, fontWeight: "700", color: "#007b00" }}>
        <NumberFormatMoney amount={modalResumen.netoFinal} />
      </td>
    </tr>
  </tbody>
</table>

    </div>
  )}

  {modalRows.length === 0 ? (
    <div className="py-2">Sin ventas para esta celda.</div>
  ) : (
    <>
      {(() => {
        const flatProductos = [];
        const flatServicios = [];

        for (const row of modalRows) {
          const productos = row.detalle_ventaProductos || row.detalle_ventaproductos || [];
          const servicios = row.detalle_ventaservicios || [];

          const pagos = Array.isArray(row.detalleVenta_pagoVenta)
          ? row.detalleVenta_pagoVenta
          :Array.isArray(row.detalleVenta_pagoVenta)
          ? row.detalleVenta_pagoVenta
          :[];
          const formasPago=Array.from(new Set(
            pagos.map(p=>
              p?.parametro_forma_pago?.label_param ??
              p?.id_forma_pago ??
              null
            ).filter(Boolean)
          ));
          const formaPagoStr = formasPago.join(' / ') ||'' ;

         for (const p of productos) {
  const empProd = normalizeName(p?.empleado_producto?.nombres_apellidos_empl);
  if (empProd !== empleadoObjetivo) continue;     
  flatProductos.push({
    nombre: p?.tb_producto?.nombre_producto || '—',
    cantidad: p?.cantidad == null ? 1 : Number(p.cantidad),
    pCompra: Number(p?.tb_producto?.prec_compra) || 0,
    pVenta:
      Number(p?.tarifa_monto) ||
      Number(p?.precio_unitario) ||
      Number(p?.tb_producto?.prec_venta) || 0,
  });
}


          for (const s of servicios) {
            const empServ = normalizeName(s?.empleado_servicio?.nombres_apellidos_empl);
  if (empServ !== empleadoObjetivo) continue;
           flatServicios.push({
    nombre: s?.circus_servicio?.nombre_servicio || '—',
    cantidad: s?.cantidad == null ? 1 : Number(s.cantidad),
    duracion: s?.circus_servicio?.duracion ?? '—',
    pVenta: Number(s?.tarifa_monto) || 0,
    formasPago: formaPagoStr,
    tarifa: Number(s?.tarifa_monto) || 0,
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
          padding: '20px 18px',
          textAlign: 'center',
          fontWeight: 700,   
          fontSize: 20 ,
          background: '#fafafa',
          whiteSpace: 'nowrap',
        };
        const compactTd = {
          border: '1px solid #eee',
          padding: '6px 8px',
          textAlign: 'center',
          fontSize: 19,
          whiteSpace: 'nowrap',
        };
        const zebra = (i) => (i % 2 ? { background: '#fcfcfc' } : null);
        // --- Agrupar servicios repetidos (mismo ID + forma de pago + tarifa)
const agruparServicios = (items = []) => {
  const m = new Map();
  for (const it of items) {
    const idServ =
      it.id_servicio ??
      it.circus_servicio?.id_servicio ??
      null;

    // Clave única: servicio + forma de pago + precio
    const key = idServ
      ? `id:${idServ}|fp:${it.formasPago || ''}|pv:${Number(it.tarifa) || 0}`
      : `nom:${normalizeName(it.nombre || '')}|fp:${it.formasPago || ''}|pv:${Number(it.tarifa) || 0}`;

    if (!m.has(key)) {
      m.set(key, {
        nombre: it.nombre || it?.circus_servicio?.nombre_servicio || '—',
        duracion: it.duracion ?? it?.circus_servicio?.duracion ?? '—',
        pVenta: Number(it.tarifa) || 0,
        formasPago: it.formasPago || '',
        cantidad: 0,
      });
    }

    const acc = m.get(key);
    acc.cantidad += Number(it.cantidad) || 0;
  }
  return Array.from(m.values());
};

const serviciosAgrupados = agruparServicios(flatServicios);

// Totales con servicios agrupados
const totalPVentaServs = serviciosAgrupados.reduce(
  (a, b) => a + b.pVenta * b.cantidad,
  0
);

        return (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                fontWeight: 800,
                marginBottom: 10,
                textAlign: 'center',
                fontSize: 22,
                backgroundColor:'yellow',
                letterSpacing: .3,
              }}
            >
              DETALLE DE PRODUCTOS Y SERVICIOS
            </div>
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
    gap: 8,
    marginBottom: 10,
  }}
>
   <div style={{ padding: 10, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
    <div style={{ fontSize: 15, opacity: 0.7 }}>Cantidad de productos</div>
    <div style={{ fontWeight: 800, fontSize: 25 }}>
      {flatProductos.length}
    </div>
  </div>
  <div style={{ padding: 10, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
    <div style={{ fontSize: 15, opacity: 0.7 }}>Venta Productos</div>
    <div style={{ fontWeight: 800, fontSize: 25 }}>
      <NumberFormatMoney amount={totalPVentaProd} />
    </div>
  </div>
    <div style={{ padding: 10, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
    <div style={{ fontSize: 15, opacity: 0.7 }}>Cantidad de servicios</div>
    <div style={{ fontWeight: 800, fontSize: 25 }}>
      {flatServicios.length}
    </div>
  </div>
  <div style={{ padding: 10, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
    <div style={{ fontSize: 15, opacity: 0.7 }}>Venta Servicios</div>
    <div style={{ fontWeight: 800, fontSize: 25 }}>
      <NumberFormatMoney amount={totalPVentaServs} />
    </div>

  </div>
</div>
            <div
  style={{
    display: 'flex',
    justifyContent: 'center',   
    alignItems: 'flex-start',   
    gap: 20,
    width: '100%',
  }}
>
   <div
  style={{
    display: 'flex',
  justifyContent: 'center',
  width :'100%'   
  }}
>
  
  <div style={{ marginTop: 20, justifySelf: 'center', width: 'max-content' }}>
    <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 30, textAlign: 'center' }}>
      SERVICIOS
    </div>
    <table style={{ borderCollapse: 'collapse', margin: '0 auto', minWidth: '750px' }}>
  <thead>
    <tr>
      <th className='bg-primary' style={compactTh}>Servicio</th>
      <th className='bg-primary' style={compactTh}>Cant.</th>
      <th className='bg-primary' style={compactTh}>Duración</th>
      <th className='bg-primary' style={compactTh}>Forma Pago</th>
      <th className='bg-primary' style={compactTh}>P.Venta</th>
    </tr>
  </thead>
  <tbody>
    {serviciosAgrupados.length === 0 ? (
      <tr><td colSpan={5} style={compactTd}>—</td></tr>
    ) : (
      serviciosAgrupados.map((s, i) => (
        <tr key={i} style={zebra(i)}>
          <td style={compactTd}>{s.nombre}</td>
          <td style={compactTd}>{s.cantidad}</td>
          <td style={compactTd}>{s.duracion}</td>
          <td style={compactTd}>{s.formasPago}</td>
          <td style={{ ...compactTd, fontWeight: 600 }}>
            <NumberFormatMoney amount={s.pVenta * s.cantidad} />
          </td>
        </tr>
      ))
    )}
    <tr>
      <td style={{ ...compactTd, fontWeight: 800, textAlign: 'right' }}>TOTAL SERVICIOS</td>
      <td style={compactTd}></td>
      <td style={compactTd}></td>
      <td style={compactTd}></td>
      <td style={{ ...compactTd, fontWeight: 800, color: '#007b00' }}>
        <NumberFormatMoney amount={totalPVentaServ} />
      </td>
    </tr>
  </tbody>
</table>

  </div>
</div>
              </div>
            </div>
        );
      })()}
    </>
  )}
</Dialog>
<Dialog
  header="Detalle de productos vendidos"
  visible={showDetalleProductos}
  style={{textAlign:'center', width: "80rem", maxWidth: "95vw" }}  
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
 const agruparProductos = (items = []) => {
    const m = new Map();
    for (const it of items) {
      const idProd =
        it.id_producto ??
        it.id ??
        it.tb_producto?.id_producto ?? null;

      // Evita mezclar productos con distinto precio unitario
      const key = idProd
        ? `id:${idProd}|pv:${Number(it.precioVenta)||0}|pc:${Number(it.precioCompra)||0}`
        : `nom:${normalizeName(it.nombre||'')}|pv:${Number(it.precioVenta)||0}|pc:${Number(it.precioCompra)||0}`;

      if (!m.has(key)) {
        m.set(key, {
          nombre: it.nombre || '—',
          // guarda precios unitarios para multiplicar por la cantidad total
          precioVentaU: Number(it.precioVenta) || 0,
          precioCompraU: Number(it.precioCompra) || 0,
          cantidad: 0,
        });
      }
      const acc = m.get(key);
      acc.cantidad += Number(it.cantidad) || 0;
    }
    return Array.from(m.values());
  };

  const productosAgrupados = agruparProductos(productosDetalle);

  const totalPVentaProd  = productosAgrupados
    .reduce((a, b) => a + (b.precioVentaU  * b.cantidad), 0);
  const totalPCompraProd = productosAgrupados
    .reduce((a, b) => a + (b.precioCompraU * b.cantidad), 0);
  const totalUtilProd    = totalPVentaProd - totalPCompraProd;

    const th = {
      border: '1px solid #ccc',
      padding: '14px 12px',
      textAlign: 'center',
      fontWeight: 700,
      fontSize: 18,
      background: '#f5f5f5',
      whiteSpace: 'nowrap',
    };
    const td = {
      border: '1px solid #ddd',
      padding: '8px 10px',
      textAlign: 'center',
      fontSize: 16,
      whiteSpace: 'nowrap',
    };
    const zebra = (i) => (i % 2 ? { background: '#fcfcfc' } : null);

   
  return (
    <>
     <table style={{ borderCollapse: 'collapse', width: '100%' }}>
 <thead>
  <tr>
    <th style={th}>Producto</th>
    <th style={th}>Cant.</th>
    <th style={th}>P. Venta</th>
     <th style={th}>IGV</th>
    <th style={th}>Tarjeta</th>
   
    <th style={th}>Renta</th>
    <th style={th}>P. Compra</th>
    <th style={th}>Utilidad Bruta</th> 
    <th style={th}>Comisión</th>      
          
    <th style={th}>Utilidad</th>  
  </tr>
</thead>
<tbody>
  {productosAgrupados.length === 0 ? (
    <tr><td colSpan={10} style={td}>No se vendieron productos.</td></tr>
  ) : (
    productosAgrupados.map((p, i) => {
      const venta   = p.precioVentaU * p.cantidad;
      const compra  = p.precioCompraU * p.cantidad;
      const tarjeta = venta * RATE_TARJETA;
      const igv     = venta * RATE_IGV;
      const renta   = venta * RATE_RENTA;

      // Utilidad base (antes de comisión)
      const utilBase = venta - tarjeta - igv - renta - compra;

      // Comisión calculada sobre la utilidad base
      const comision = utilBase * RATE_COMISION; // usa Math.max(utilBase,0) si no quieres comisión con util. negativa

      // Utilidad final
      const utilFinal = utilBase - comision;

      return (
        <tr key={i} style={zebra(i)}>
          <td style={td}>{p.nombre}</td>
          <td style={td}>{p.cantidad}</td>

          <td style={{ ...td, fontWeight: 600, color: '#007b00' }}>
            <NumberFormatMoney amount={p.precioVentaU} />
          </td>
 <td style={{ ...td, color: 'red' }}>
            -<NumberFormatMoney amount={igv} />
          </td>
          <td style={{ ...td, color: 'red' }}>
            -<NumberFormatMoney amount={tarjeta} />
          </td>
         
          <td style={{ ...td, color: 'red' }}>
            -<NumberFormatMoney amount={renta} />
          </td>

          <td style={{ ...td, color: 'red' }}>
            <NumberFormatMoney amount={compra} />
          </td>
          <td style={{ ...td, fontWeight: 600 ,color:'green'}}>
            <NumberFormatMoney amount={utilBase} />
          </td>
<td style={{ ...td, color: 'red' }}>
            -<NumberFormatMoney amount={comision} />
          </td>
          <td style={{ ...td, fontWeight: 700, color: utilFinal >= 0 ? '#007b00' : 'red' }}>
            <NumberFormatMoney amount={utilFinal} />
          </td>
        </tr>
      );
    })
  )}

  {(() => {
    const totalPVentaProd  = productosAgrupados.reduce((a,b)=> a + (b.precioVentaU  * b.cantidad), 0);
    const totalPCompraProd = productosAgrupados.reduce((a,b)=> a + (b.precioCompraU * b.cantidad), 0);
    const totalTarjeta     = totalPVentaProd * RATE_TARJETA;
    const totalIGV         = totalPVentaProd * RATE_IGV;
    const totalRenta       = totalPVentaProd * RATE_RENTA;

    const totalUtilBase    = totalPVentaProd - totalTarjeta - totalIGV - totalRenta - totalPCompraProd;
    const totalComision    = totalUtilBase * RATE_COMISION; 
    const totalUtilFinal   = totalUtilBase - totalComision;
const totalCantidad = productosAgrupados.reduce((a, b) => a + b.cantidad, 0);

    return (
    <tr>
  <td style={{ ...td, fontWeight: 800 }}>TOTALES</td>

  {/* 👉 Nueva celda para la suma total de cantidades */}
  <td style={{ ...td, fontWeight: 800 }}>
    {totalCantidad}
  </td>

  <td style={{ ...td, fontWeight: 800, color: '#007b00' }}>
    <NumberFormatMoney amount={totalPVentaProd} />
  </td>

  <td style={{ ...td, fontWeight: 800, color: 'red' }}>
    <NumberFormatMoney amount={totalIGV} />
  </td>

  <td style={{ ...td, fontWeight: 800, color: 'red' }}>
    <NumberFormatMoney amount={totalTarjeta} />
  </td>

  <td style={{ ...td, fontWeight: 800, color: 'red' }}>
    <NumberFormatMoney amount={totalRenta} />
  </td>

  <td style={{ ...td, fontWeight: 800, color: 'red' }}>
    <NumberFormatMoney amount={totalPCompraProd} />
  </td>

  <td style={{ ...td, fontWeight: 800, color: 'green' }}>
    <NumberFormatMoney amount={totalUtilBase} />
  </td>

  <td style={{ ...td, fontWeight: 800, color: 'red' }}>
    <NumberFormatMoney amount={totalComision} />
  </td>

  <td style={{ ...td, fontWeight: 800, color: totalUtilFinal >= 0 ? '#007b00' : 'red' }}>
    <NumberFormatMoney amount={totalUtilFinal} />
  </td>
</tr>

    );
  })()}
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

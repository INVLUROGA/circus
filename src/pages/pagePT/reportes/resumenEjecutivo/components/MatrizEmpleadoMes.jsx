import { NumberFormatMoney } from '@/components/CurrencyMask';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/es';
import { set } from 'lodash';
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { PTApi } from '@/common/api/';
import { useTerminoMetodoPagoStore } from "@/hooks/hookApi/FormaPagoStore/useTerminoMetodoPagoStore";

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
const { obtenerFormaDePagosActivos } = useTerminoMetodoPagoStore();
const [dataFormaPagoActivoVentas, setDataFormaPagoActivoVentas] = useState([]);

useEffect(() => {
  obtenerFormaDePagosActivos();
}, []);

const [fpLoading, setFpLoading] = useState(false);
const [fpError, setFpError] = useState(null);

// Trae el catálogo de formas de pago desde tu API
const obtenerParametrosFormaPago = useCallback(async () => {
  try {
    setFpLoading(true);
    setFpError(null);
    const { data } = await PTApi.get('/parametros/get_params/formapago/formapago');
    // Asegura que sea un array
    setDataFormaPago(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error(err);
    setFpError(err);
    setDataFormaPago([]); // fallback a vacío
  } finally {
    setFpLoading(false);
  }
}, []);

useEffect(() => {
  obtenerParametrosFormaPago();
}, [obtenerParametrosFormaPago]);
useEffect(() => {
  if (modalOpen) {
    // Actualiza los totales de métodos de pago cada vez que se abre el modal
    const nuevosTotales = modalRows.length > 0 ? calcularTotales(modalRows) : {};
    setTotalPorMetodo(nuevosTotales);
  }
}, [modalOpen, modalRows]);
// ======= FORMAS DE PAGO: etiquetas dinámicas + métodos activos =======
const headerLabel = useMemo(() => {
  const labels = {};

  // 1️⃣ De las formas de pago activas
  for (const f of dataFormaPagoActivoVentas) {
    const key = toKey(f.label_param || f.nombre || f.label || "otro").replace(/\s+/g, '_');
    labels[key] = f.label_param || f.nombre || f.label || "Otro";
  }

  // 2️⃣ De las ventas reales (por si faltan en catálogo)
  for (const venta of dataVenta || []) {
    for (const pago of venta.detalleVenta_pagoVenta || []) {
      const lbl = pago?.parametro_forma_pago?.label_param;
      if (!lbl) continue;
      const key = toKey(lbl).replace(/\s+/g, '_');
      if (!labels[key]) labels[key] = lbl; // agregar si no existe
    }
  }

  return labels;
}, [dataFormaPagoActivoVentas, dataVenta]);



// Este estado guardará los totales por método (actualizado desde el modal)
const [totalPorMetodo, setTotalPorMetodo] = useState({});
const round2 = (x) => Math.round((Number(x) + Number.EPSILON) * 100) / 100;

// Calcula métodos activos según los montos
const activeMethods = useMemo(() => {
  if (!totalPorMetodo || Object.keys(totalPorMetodo).length === 0)
    return [];

  // ✅ Filtra solo métodos que tienen monto > 0
  const actives = Object.keys(totalPorMetodo).filter(
    (k) => round2(totalPorMetodo[k]) > 0
  );

  // Si no hay ninguno con monto > 0, mostrar solo los top 3 conocidos
  if (actives.length === 0) {
    return ["openpay", "transferencia", "qr"].filter((k) => headerLabel[k]);
  }

  return actives;
}, [totalPorMetodo, headerLabel]);
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
const calcularTotales = useCallback((rows = []) => {
  const totals = {};
  for (const row of rows) {
    const pagosArr = row.detalleVenta_pagoVenta || row.detalle_pagoVenta || [];
    for (const p of pagosArr) {
      const key = toKey(p?.parametro_forma_pago?.label_param || p?.forma || 'otro').replace(/\s+/g, '_');
      totals[key] = (totals[key] || 0) + (Number(p?.monto) || 0);
    }
  }
  return totals;
}, []);

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
        fontWeight: "800",
        letterSpacing: "0.5px",
      }}
    >
      {modalTitle || "Ventas"}
    </div>
  }
  visible={modalOpen}
  style={{ width: "90rem", maxWidth: "95vw" }}
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
        DETALLE DE LAS VENTAS
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

        <tbody style={{ fontSize: "40px" }}>
          <tr>
            <td style={tdStyle}>Venta Bruta Servicios</td>
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
            <td style={{ ...tdStyle, fontWeight: "700", color: "#007b00" }}>
              <NumberFormatMoney amount={modalResumen.neto} />
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
        // =========================
        // == HELPERS DE PAGO ==
        // =========================
        const round2 = (x) => Math.round((Number(x) + Number.EPSILON) * 100) / 100;

      const normalizePagoMethod = (s = "") => {
  const k = toKey(String(s));
  if (k.includes("openpay") || k.includes("tarjeta") || k.includes("pos")) return "openpay";
  if (k.includes("transfer") || k.includes("transf")) return "transferencia";
  if (k.includes("yape")) return "yape"; // 👈 ahora genera su propia columna
  if (k.includes("plin") || k === "qr") return "qr";
  return "otro";
};

        const getPagoMonto = (p) =>
          Number(
            p?.parcial_monto ?? // TU API
            p?.monto ??
            p?.monto_pago ??
            p?.importe ??
            0
          ) || 0;

        // Ajusta los centavos para que la suma por línea == total de la línea
        const fixDelta = (obj, total) => {
  const suma = round2(Object.values(obj).reduce((a, b) => a + Number(b || 0), 0));
  const delta = round2(total - suma);
  if (Math.abs(delta) >= 0.01) {
    // asigna delta al primer método con monto o al primero del objeto
    const firstKey = Object.keys(obj).find((k) => obj[k] > 0) || Object.keys(obj)[0];
    if (firstKey) obj[firstKey] = round2((obj[firstKey] || 0) + delta);
  }
  return obj;
};


        // =========================
        // == FLAT DATA ==
        // =========================
        const flatProductos = [];
        const flatServicios = [];

        // Acumulador global por método (SERVICIOS + PRODUCTOS)
        const totalPorMetodo = { openpay: 0, transferencia: 0, qr: 0, otro: 0 };

        for (const row of modalRows) {
          const productos = row.detalle_ventaProductos || row.detalle_ventaproductos || [];
          const servicios = row.detalle_ventaservicios || [];

          // Pagos de la venta
          const pagosArr = Array.isArray(row.detalleVenta_pagoVenta)
            ? row.detalleVenta_pagoVenta
            : Array.isArray(row.detalle_pagoVenta)
            ? row.detalle_pagoVenta
            : [];

          const pagosByMethod = pagosArr.reduce((acc, p) => {
            const methodRaw = p?.parametro_forma_pago?.label_param ?? p?.id_forma_pago ?? p?.forma ?? "";
            const key = normalizePagoMethod(methodRaw);
            acc[key] = (acc[key] || 0) + getPagoMonto(p);
            return acc;
          }, {});

          // Total líneas de la venta (prod + serv)
          let totalLineasVenta = 0;

          for (const it of productos) {
            const cant = it?.cantidad == null ? 1 : Number(it.cantidad) || 0;
            const pUnit = Number(it?.tarifa_monto) ||
                          Number(it?.precio_unitario) ||
                          Number(it?.tb_producto?.prec_venta) || 0;
            totalLineasVenta += cant * pUnit;
          }
          for (const it of servicios) {
            const cant = it?.cantidad == null ? 1 : Number(it.cantidad) || 0;
            const pUnit = Number(it?.tarifa_monto) || 0;
            totalLineasVenta += cant * pUnit;
          }

          // === PRODUCTOS (del empleado objetivo) + prorrateo métodos
          for (const p of productos) {
            const empProd = normalizeName(p?.empleado_producto?.nombres_apellidos_empl);
            if (empProd !== empleadoObjetivo) continue;

            const cantidad = p?.cantidad == null ? 1 : Number(p.cantidad) || 0;
            const precioCompra = Number(p?.tb_producto?.prec_compra) || 0;
            const precioVenta =
              Number(p?.tarifa_monto) ||
              Number(p?.precio_unitario) ||
              Number(p?.tb_producto?.prec_venta) || 0;

            // prorrateo por método
            const lineaTotal = cantidad * precioVenta;
            const share = totalLineasVenta > 0 ? (lineaTotal / totalLineasVenta) : 0;

        // === Crear métodos dinámicos ===
const allPaymentKeys = [
  ...new Set([
    ...Object.keys(headerLabel),              // desde catálogo API
    ...Object.keys(pagosByMethod || {}),      // desde ventas reales
  ]),
];

const lineaMetodosRaw = allPaymentKeys.reduce((acc, key) => {
  acc[key] = 0;
  return acc;
}, {});

// === Repartir monto proporcional por método ===
for (const [k, v] of Object.entries(pagosByMethod)) {
  const key = toKey(k).replace(/\s+/g, "_");
  lineaMetodosRaw[key] = (lineaMetodosRaw[key] || 0) + (v * share);
}

            const lineaMetodos = fixDelta(lineaMetodosRaw, round2(lineaTotal));

            // acumular global
            totalPorMetodo.openpay += lineaMetodos.openpay;
            totalPorMetodo.transferencia += lineaMetodos.transferencia;
            totalPorMetodo.qr += lineaMetodos.qr;
            totalPorMetodo.otro += lineaMetodos.otro;

            flatProductos.push({
              nombre: p?.tb_producto?.nombre_producto || "—",
              cantidad,
              precioCompra,
              precioVenta,
            });
          }

          // === SERVICIOS (del empleado objetivo) + prorrateo métodos
          for (const s of servicios) {
            const empServ = normalizeName(s?.empleado_servicio?.nombres_apellidos_empl);
            if (empServ !== empleadoObjetivo) continue;

            const cantidad = s?.cantidad == null ? 1 : Number(s.cantidad) || 0;
            const pUnit = Number(s?.tarifa_monto) || 0;
            const lineaTotal = cantidad * pUnit;
            const share = totalLineasVenta > 0 ? (lineaTotal / totalLineasVenta) : 0;

            const lineaMetodosRaw = { openpay: 0, transferencia: 0, qr: 0, otro: 0 };
            for (const [k, v] of Object.entries(pagosByMethod)) {
              lineaMetodosRaw[k] = (lineaMetodosRaw[k] || 0) + (v * share);
            }
            const lineaMetodos = fixDelta(lineaMetodosRaw, round2(lineaTotal));

            // acumular global
            totalPorMetodo.openpay += lineaMetodos.openpay;
            totalPorMetodo.transferencia += lineaMetodos.transferencia;
            totalPorMetodo.qr += lineaMetodos.qr;
            totalPorMetodo.otro += lineaMetodos.otro;

            flatServicios.push({
              nombre: s?.circus_servicio?.nombre_servicio || "—",
              cantidad,
              duracion: s?.circus_servicio?.duracion ?? "—",
              pVenta: pUnit,
              openpay: lineaMetodos.openpay,
              transferencia: lineaMetodos.transferencia,
              qr: lineaMetodos.qr,
              otro: lineaMetodos.otro,
              tarifa: pUnit,
              id_servicio: s?.id_servicio ?? s?.circus_servicio?.id_servicio ?? null,
            });
          }
        }

        const agruparServicios = (items = []) => {
          const m = new Map();
          for (const it of items) {
            const idServ = it.id_servicio ?? it.circus_servicio?.id_servicio ?? null;
            const key = idServ
              ? `id:${idServ}|pv:${Number(it.tarifa) || 0}`
              : `nom:${normalizeName(it.nombre || "")}|pv:${Number(it.tarifa) || 0}`;

            if (!m.has(key)) {
              m.set(key, {
                nombre: it.nombre || it?.circus_servicio?.nombre_servicio || "—",
                duracion: it.duracion ?? it?.circus_servicio?.duracion ?? "—",
                pVenta: Number(it.tarifa) || 0,
                cantidad: 0,
                openpay: 0,
                transferencia: 0,
                qr: 0,
                otro: 0,
              });
            }
            const acc = m.get(key);
            acc.cantidad += Number(it.cantidad) || 0;
            acc.openpay += Number(it.openpay) || 0;
            acc.transferencia += Number(it.transferencia) || 0;
            acc.qr += Number(it.qr) || 0;
            acc.otro += Number(it.otro) || 0;
          }
          return Array.from(m.values());
        };

        const serviciosAgrupados = agruparServicios(flatServicios);
        const totalPVentaServs = serviciosAgrupados.reduce(
          (a, b) => a + b.pVenta * b.cantidad,
          0
        );

        const agruparProductos = (items = []) => {
          const m = new Map();
          for (const it of items) {
            const idProd = it.id_producto ?? it.id ?? it.tb_producto?.id_producto ?? null;
            const key = idProd
              ? `id:${idProd}|pv:${Number(it.precioVenta) || 0}|pc:${Number(it.precioCompra) || 0}`
              : `nom:${normalizeName(it.nombre || "")}|pv:${Number(it.precioVenta) || 0}|pc:${Number(it.precioCompra) || 0}`;

            if (!m.has(key)) {
              m.set(key, {
                nombre: it.nombre || "—",
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

        const productosAgrupados = agruparProductos(flatProductos);
        const totalPVentaProd  = productosAgrupados.reduce((a, b) => a + b.precioVentaU  * b.cantidad, 0);
        const totalPCompraProd = productosAgrupados.reduce((a, b) => a + b.precioCompraU * b.cantidad, 0);
        const totalTarjeta     = totalPVentaProd * RATE_TARJETA;
        const totalIGV         = totalPVentaProd * RATE_IGV;
        const totalRenta       = totalPVentaProd * RATE_RENTA;
        const totalUtilBase    = totalPVentaProd - totalTarjeta - totalIGV - totalRenta - totalPCompraProd;
        const totalComision    = totalUtilBase * RATE_COMISION;
        const totalUtilFinal   = totalUtilBase - totalComision;
        const totalCantidad    = productosAgrupados.reduce((a, b) => a + b.cantidad, 0);


        const th = {
          border: "1px solid #ccccccff",
          padding: "14px 12px",
          textAlign: "center",
          fontWeight: 700,
          fontSize: 18,
          background: "#f5f5f5",
          whiteSpace: "nowrap",
        };
        const td = {
          border: "1px solid #ddd",
          padding: "8px 10px",
          textAlign: "center",
          fontSize: 16,
          whiteSpace: "nowrap",
        };
        const compactTh = {
          border: "1px solid #e6e6e6",
          padding: "20px 18px",
          textAlign: "center",
          fontWeight: 700,
          fontSize: 20,
          background: "#fafafa",
          whiteSpace: "nowrap",
        };
        const compactTd = {
          border: "1px solid #eee",
          padding: "6px 8px",
          textAlign: "center",
          fontSize: 19,
          whiteSpace: "nowrap",
        };
        const zebra = (i) => (i % 2 ? { background: "#fcfcfc" } : null);
// Filtrar métodos activos REALES del modal (basado en flatServicios)
// Detecta dinámicamente los métodos de pago usados en los servicios
const activeMethodsModal = [
  ...new Set(
    flatServicios.flatMap((s) =>
      Object.keys(s)
        .filter(
          (k) =>
            !["nombre", "cantidad", "duracion", "pVenta", "tarifa", "id_servicio"].includes(k) &&
            Number(s[k]) > 0 &&
            typeof k === "string" &&
            k.trim() !== ""
        )
    )
  ),
].filter((m) => headerLabel[m]); // 🔥 solo columnas con label válido



// Si no hay ninguno, mostrar openpay por defecto
if (activeMethodsModal.length === 0) {
  activeMethodsModal.push("openpay");
}

        return (
          <div style={{ marginTop: 16 }}>
            {/* === RESUMEN FORMAS DE PAGO (SERV + PROD) === */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${activeMethods.length}, minmax(0,1fr))`,
                gap: 8,
                margin: "10px 0 18px",
              }}
            >
              {activeMethods.map((m) => (
                <div key={m} style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, background: "#fff" }}>
                  <div style={{ fontSize: 15, opacity: 0.7 }}>{headerLabel[m]}</div>
                  <div style={{ fontWeight: 800, fontSize: 22 }}>
                    <NumberFormatMoney amount={round2(totalPorMetodo[m])} />
                  </div>
                </div>
              ))}
            </div>

            {/* === DETALLE DE SERVICIOS BRINDADOS (con columnas dinámicas por método) === */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
                gap: 20,
                width: "100%",
              }}
            >
              <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                <div style={{ marginTop: 20, justifySelf: "center", width: "max-content" }}>
                  <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 30, textAlign: "center" }}>
                    DETALLE DE SERVICIOS BRINDADOS
                  </div>
                  <table style={{ borderCollapse: "collapse", margin: "0 auto", minWidth: "900px" }}>
                    <thead>
                      <tr>
                        <th className="bg-primary" style={compactTh}>Servicio</th>
                        <th className="bg-primary" style={compactTh}>Cant.</th>
                         <th className="bg-primary" style={compactTh}>P. Unitario</th>

                        {activeMethodsModal.map((m) => (
                          <th key={m} className="bg-primary" style={compactTh}>{headerLabel[m]}</th>
                        ))}
                         <th className="bg-primary" style={compactTh}>P.Venta</th>

                      </tr>
                    </thead>
                    <tbody>
                      {serviciosAgrupados.length === 0 ? (
                        <tr><td colSpan={4 + activeMethods.length} style={compactTd}>—</td></tr>
                      ) : (
                        serviciosAgrupados.map((s, i) => {
                          const totalLinea = s.pVenta * s.cantidad;
                          const vals = {
                            openpay: round2(s.openpay),
                            transferencia: round2(s.transferencia),
                            qr: round2(s.qr),
                          };
                          const sumaMetodos = round2(
                            activeMethods.reduce((acc, k) => acc + (vals[k] || 0), 0)
                          );
                          let delta = round2(totalLinea - sumaMetodos);

                          return (
                            <tr key={i} style={zebra(i)}>
                              <td style={compactTd}>{s.nombre}</td>
                              <td style={compactTd}>{s.cantidad}</td>
 <td style={{ ...compactTd, fontWeight: 600 }}>
  {s.pVenta === 0 ? "—" : <NumberFormatMoney amount={s.pVenta} />}
</td>

                            {activeMethodsModal.map((m, idx) => {
  let val = vals[m] || 0;
  if (idx === 0 && Math.abs(delta) >= 0.01) {
    val = round2(val + delta);
    delta = 0;
  }
  return (
    <td key={m} style={compactTd}>
      {val === 0 ? "—" : <NumberFormatMoney amount={val} />}
    </td>
  );
})}

                                <td style={{ ...compactTd, fontWeight: 600 }}>
                                <NumberFormatMoney amount={totalLinea} />
                              </td>
                            </tr>
                          );
                        })
                      )}

                      {/* Totales */}
                      {serviciosAgrupados.length > 0 && (
                        <tr>
                          <td style={{ ...compactTd, fontWeight: 800, textAlign: "right" }}>TOTAL SERVICIOS</td>
                          <td style={{ ...compactTd, fontWeight: 800 }}>{flatServicios.length}</td>
                                                 <td style={{ ...compactTd, fontWeight: 800, color: "#007b00" }}>
                          
                          </td>
                          {activeMethodsModal.map((m, idx) => {
                            const sumMethodExact = round2(
                              flatServicios.reduce((a, b) => a + (Number(b[m]) || 0), 0)
                            );
                            const sumOtros = round2(
                              activeMethods
                                .filter((k) => k !== m)
                                .reduce((acc, k) => acc + flatServicios.reduce((x, y) => x + (Number(y[k]) || 0), 0), 0)
                            );
                            let deltaTot = round2(totalPVentaServs - (sumMethodExact + sumOtros));
                            const val = (idx === 0) ? round2(sumMethodExact + deltaTot) : sumMethodExact;

                            return (
                              <td key={m} style={{ ...compactTd, fontWeight: 800 }}>
                                <NumberFormatMoney amount={val} />
                              </td>
                            );
                          })}
                          <td style={{ ...compactTd, fontWeight: 800, color: "#007b00" }}>
                            <NumberFormatMoney amount={totalPVentaServs} />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* === RESUMEN RÁPIDO === */}
            <div
              style={{
                fontWeight: 800,
                marginBottom: 10,
                textAlign: "center",
                fontSize: 22,
                backgroundColor: "yellow",
                letterSpacing: 0.3,
                marginTop: 20,
              }}
            >
              DETALLE DE PRODUCTOS Y SERVICIOS
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0,1fr))",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <div style={{ padding: 10, border: "1px solid #eee", borderRadius: 8, background: "#fff" }}>
                <div style={{ fontSize: 15, opacity: 0.7 }}>Cantidad de productos</div>
                <div style={{ fontWeight: 800, fontSize: 25 }}>{flatProductos.length}</div>
              </div>
              <div style={{ padding: 10, border: "1px solid #eee", borderRadius: 8, background: "#fff" }}>
                <div style={{ fontSize: 15, opacity: 0.7 }}>Venta Productos</div>
                <div style={{ fontWeight: 800, fontSize: 25 }}>
                  <NumberFormatMoney amount={totalPVentaProd} />
                </div>
              </div>
              <div style={{ padding: 10, border: "1px solid #eee", borderRadius: 8, background: "#fff" }}>
                <div style={{ fontSize: 15, opacity: 0.7 }}>Cantidad de servicios</div>
                <div style={{ fontWeight: 800, fontSize: 25 }}>{flatServicios.length}</div>
              </div>
              <div style={{ padding: 10, border: "1px solid #eee", borderRadius: 8, background: "#fff" }}>
                <div style={{ fontSize: 15, opacity: 0.7 }}>Venta Servicios</div>
                <div style={{ fontWeight: 800, fontSize: 25 }}>
                  <NumberFormatMoney amount={totalPVentaServs} />
                </div>
              </div>
            </div>

            {/* === TABLA DE PRODUCTOS (sin columnas de método) === */}
            <div style={{ marginTop: 20, justifySelf: "center", width: "max-content" }}>
              <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 30, textAlign: "center" }}>
                PRODUCTOS VENDIDOS
              </div>

              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "950px", margin: "0 auto" }}>
                <thead>
                  <tr>
                    <th className="bg-primary" style={th}>Producto</th>
                    <th className="bg-primary" style={th}>Cant.</th>
                    <th className="bg-primary" style={th}>P. Venta</th>
                    <th className="bg-primary" style={th}>IGV(-18%)</th>
                    <th className="bg-primary" style={th}>Tarjeta(-4.5%)</th>
                    <th className="bg-primary" style={th}>Renta(-3%)</th>
                    <th className="bg-primary" style={th}>P. Compra</th>
                    <th className="bg-primary" style={th}>Utilidad Bruta</th>
                    <th className="bg-primary" style={th}>Comisión</th>
                    <th className="bg-primary" style={th}>Utilidad</th>
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
                      const utilBase = venta - tarjeta - igv - renta - compra;
                      const comision = utilBase * RATE_COMISION;
                      const utilFinal = utilBase - comision;
                      
                      return (
                        <tr key={i} style={zebra(i)}>
                          <td style={td}>{p.nombre}</td>
                          <td style={td}>{p.cantidad}</td>
                         <td style={{ ...td, fontWeight: 600, color: "#007b00" }}>
  {p.precioVentaU === 0 ? "—" : <NumberFormatMoney amount={p.precioVentaU} />}
</td>

                          <td style={{ ...td, color: "red" }}>
                            -<NumberFormatMoney amount={igv} />
                          </td>
                          <td style={{ ...td, color: "red" }}>
                            -<NumberFormatMoney amount={tarjeta} />
                          </td>
                          <td style={{ ...td, color: "red" }}>
                            -<NumberFormatMoney amount={renta} />
                          </td>
                          <td style={{ ...td, color: "red" }}>
                            <NumberFormatMoney amount={compra} />
                          </td>
                          <td style={{ ...td, fontWeight: 600, color: "green" }}>
                            <NumberFormatMoney amount={utilBase} />
                          </td>
                          <td style={{ ...td, color: "red" }}>
                            -<NumberFormatMoney amount={comision} />
                          </td>
                          <td style={{ ...td, fontWeight: 700, color: utilFinal >= 0 ? "#007b00" : "red" }}>
                            <NumberFormatMoney amount={utilFinal} />
                          </td>
                        </tr>
                      );
                    })
                  )}

                  <tr>
                    <td style={{ ...td, fontWeight: 800 }}>TOTALES</td>
                    <td style={{ ...td, fontWeight: 800 }}>{totalCantidad}</td>
                    <td style={{ ...td, fontWeight: 800, color: "#007b00" }}>
                      <NumberFormatMoney amount={totalPVentaProd} />
                    </td>
                    <td style={{ ...td, fontWeight: 800, color: "red" }}>
                      <NumberFormatMoney amount={totalIGV} />
                    </td>
                    <td style={{ ...td, fontWeight: 800, color: "red" }}>
                      <NumberFormatMoney amount={totalTarjeta} />
                    </td>
                    <td style={{ ...td, fontWeight: 800, color: "red" }}>
                      <NumberFormatMoney amount={totalRenta} />
                    </td>
                    <td style={{ ...td, fontWeight: 800, color: "red" }}>
                      <NumberFormatMoney amount={totalPCompraProd} />
                    </td>
                    <td style={{ ...td, fontWeight: 800, color: "green" }}>
                      <NumberFormatMoney amount={totalUtilBase} />
                    </td>
                    <td style={{ ...td, fontWeight: 800, color: "red" }}>
                      <NumberFormatMoney amount={totalComision} />
                    </td>
                    <td style={{ ...td, fontWeight: 800, color: totalUtilFinal >= 0 ? "#007b00" : "red" }}>
                      <NumberFormatMoney amount={totalUtilFinal} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </>
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

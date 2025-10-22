import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { NumberFormatMoney } from '@/components/CurrencyMask';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/es';
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
  s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const firstWord = (s='') => toKey(s).split(' ')[0] || '';
const normalizeName = (s) => (!s ? '' : s.normalize('NFKC').trim().replace(/\s+/g, ' '));
const round2 = (x) => Math.round((Number(x) + Number.EPSILON) * 100) / 100;

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
  { datoEstadistico = 'totalVentas', sortDir = 'desc', includeZero = false, normalizarNombre = true } = {}
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
      const acc = getAcc(it?.empleado_producto?.nombres_apellidos_empl);
      if (!acc) continue;
      const cantidad = it?.cantidad == null ? 1 : (Number(it?.cantidad) || 0);
      const precio = Number(it?.tarifa_monto) || Number(it?.tb_producto?.prec_venta) || 0;
      const importe = precio * cantidad;
      acc.ventasProductos += importe;
      acc.cantidadProductos += cantidad;
      ventasPorEmpleado.get(acc.empleado).add(idVenta);
    }

    const servicios = Array.isArray(v?.detalle_ventaservicios) ? v.detalle_ventaservicios : [];
    for (const it of servicios) {
      const acc = getAcc(it?.empleado_servicio?.nombres_apellidos_empl);
      if (!acc) continue;
      const cantidad = Number(it?.cantidad) || 0;
      const precio = Number(it?.tarifa_monto) || 0;
      const importe = precio * cantidad;
      acc.ventasServicios += importe;
      acc.cantidadServicios += cantidad;
      ventasPorEmpleado.get(acc.empleado).add(idVenta);
    }
  }

  const out = [];
  for (const [empleado, acc] of accMap.entries()) {
    acc.totalVentas = acc.ventasProductos + acc.ventasServicios;
    acc.cantidadVentas = ventasPorEmpleado.get(empleado)?.size ?? 0;
    if (includeZero || acc.totalVentas > 0 || acc.cantidadVentas > 0) out.push(acc);
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
  cutDay=null,
}) => {
  const RATE_IGV = 0.18;
  const RATE_RENTA = 0.03;
  const RATE_TARJETA = 0.045;
  const RATE_COMISION = 0.10;

  const [q, setQ] = useState('');
  const normq = (s='') => s.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, ' ');
  const matchIncludes = (haystack, needle) => normq(haystack).includes(normq(needle));
// Normaliza etiquetas entrantes (quita tildes, puntos, dobles espacios, etc.)
const normalizeMetricLabel = (s = "") =>
  String(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // sin tildes
    .replace(/\./g, " ")                               // puntos -> espacio (can.t -> can t)
    .replace(/\s+/g, " ")                              // colapsa espacios
    .trim()
    .toUpperCase();

// Aliases aceptados -> etiqueta canónica usada en METRIC_MAP
const METRIC_ALIASES = {
  "CANT VENTAS": "Cant. Ventas",
  "CAN T VENTAS": "Cant. Ventas",
  "CAN T  VENTAS": "Cant. Ventas",
  "CAN.T VENTAS": "Cant. Ventas",
  "CANTIDAD VENTAS": "Cant. Ventas",
  "CANTIDAD DE VENTAS": "Cant. Ventas",
  "CANT VENTA": "Cant. Ventas",
};

  const METRIC_MAP = {
    'Total Ventas': 'totalVentas',
    'Cant. Ventas': 'cantidadVentas',
    'Ventas Productos': 'ventasProductos',
    'Cant. Productos': 'cantidadProductos',
    'Ventas Servicios': 'ventasServicios',
    'Cant. Servicios': 'cantidadServicios',
  };
  const canonicalMetric =
   METRIC_ALIASES[normalizeMetricLabel(datoEstadistico)] || datoEstadistico;
 const metricKey = METRIC_MAP[canonicalMetric] ?? 'totalVentas';
  const isMoney = ['totalVentas','ventasProductos','ventasServicios'].includes(metricKey);
  const meses = Array.isArray(filtrarFecha) ? filtrarFecha : [filtrarFecha].filter(Boolean);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalRows, setModalRows] = useState([]);
  const [modalTitle, setModalTitle] = useState('');
  const [modalResumen, setModalResumen] = useState(null);
  const [empleadoObjetivo, setEmpleadoObjetivo] = useState('');

  const { obtenerFormaDePagosActivos } = useTerminoMetodoPagoStore();
  const [dataFormaPagoActivoVentas, setDataFormaPagoActivoVentas] = useState([]);
useEffect(() => {
  let mounted = true;
  (async () => {
    try {
      const resp = await obtenerFormaDePagosActivos();
      const arr = resp?.data ?? resp ?? [];
      if (mounted) setDataFormaPagoActivoVentas(Array.isArray(arr) ? arr : []);
    } catch (e) {
      console.error('obtenerFormaDePagosActivos', e);
      if (mounted) setDataFormaPagoActivoVentas([]);
    }
  })();
  return () => { mounted = false; };
}, []);

  const [dataFormaPagoParams, setDataFormaPagoParams] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await PTApi.get('/parametros/get_params/formapago/formapago');
        setDataFormaPagoParams(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('get_params', e);
        setDataFormaPagoParams([]);
      }
    })();
  }, []);

  const headerLabel = useMemo(() => {
    const labels = {};
    const activos = Array.isArray(dataFormaPagoActivoVentas) ? dataFormaPagoActivoVentas : [];
    for (const f of activos) {
      const key = toKey(f.label_param || f.nombre || f.label).replace(/\s+/g,'_');
      if (key) labels[key] = f.label_param || f.nombre || f.label;
    }
    for (const venta of dataVenta || []) {
      const pagos = venta.detalleVenta_pagoVenta || venta.detalle_pagoVenta || [];
      for (const p of pagos) {
        const lbl = p?.parametro_forma_pago?.label_param || p?.forma || p?.id_forma_pago;
        if (!lbl) continue;
        const key = toKey(lbl).replace(/\s+/g,'_');
        if (key && !labels[key]) labels[key] = String(lbl);
      }
    }
      for (const k of Object.keys(labels)) {
    if (labels[k]?.toLowerCase().includes("qr openpay con tarjetas")) {
      labels[k] = "QR Openpay";
    }
  }
    return labels;
  }, [dataFormaPagoActivoVentas, dataVenta]);

  const methodKey = (s='') => toKey(String(s)).replace(/\s+/g,'_');
  const splitTokens = (s='') => methodKey(s).split('_').filter(Boolean);
  const catalogByKey = useMemo(() => {
    const out = {};
    for (const [key, label] of Object.entries(headerLabel)) {
      out[key] = { key, labelNorm: methodKey(label), tokens: splitTokens(label) };
    }
    return out;
  }, [headerLabel]);
  const keyByLabelNorm = useMemo(() => {
    const map = {};
    for (const [key, label] of Object.entries(headerLabel)) map[methodKey(label)] = key;
    return map;
  }, [headerLabel]);
  const keyByIdParam = useMemo(() => {
    const map = new Map();
    (dataFormaPagoParams || []).forEach(p => {
      const lbl = p?.label_param || p?.nombre || p?.label || '';
      const key = methodKey(lbl);
      if (headerLabel[key]) map.set(p.id_param, key);
    });
    return map;
  }, [dataFormaPagoParams, headerLabel]);
  const jaccard = (a=[], b=[]) => {
    if (!a.length && !b.length) return 1;
    const A = new Set(a), B = new Set(b);
    let inter = 0; for (const t of A) if (B.has(t)) inter++;
    const union = new Set([...A, ...B]).size;
    return union ? inter/union : 0;
  };
  const normalizePagoMethod = useCallback((raw='') => {
    
    if (typeof raw === 'number' && keyByIdParam.has(raw)) return keyByIdParam.get(raw);
    const labelRaw = raw?.label_param ?? raw?.nombre ?? raw?.label ?? raw;
    const k = methodKey(labelRaw);
    
    if (!k) return '';
    if (headerLabel[k]) return k;
    if (keyByLabelNorm[k]) return keyByLabelNorm[k];
    for (const { key, labelNorm } of Object.values(catalogByKey)) {
      if (k.includes(labelNorm) || labelNorm.includes(k)) return key;
    }
    const tokensK = splitTokens(k);
    let best = { key:'', score:0 };
    for (const { key, tokens } of Object.values(catalogByKey)) {
      const s = jaccard(tokensK, tokens);
      if (s > best.score) best = { key, score: s };
    }
    return best.score >= 0.5 ? best.key : '';
  }, [headerLabel, keyByLabelNorm, keyByIdParam, catalogByKey]);

  const [totalPorMetodo, setTotalPorMetodo] = useState({});
  const excluirSet = useMemo(() => new Set(excluirNombres.map(toKey)), [excluirNombres]);
  const { empleadosOrdenados, columnas, matriz, totalesFila } = useMemo(() => {
    const columnas = meses.map((f) => {
      const ventasMes = filtrarVentasPorMes(dataVenta, f);
      const ranking = rankingPorEmpleado(ventasMes);
      const map = new Map();
      for (const r of ranking) map.set(r.empleado, Number(r[metricKey] || 0));
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
    const totalesFila = matriz.map((row) => row.reduce((a,b)=>a+b,0));
    const idxs = empleados.map((_, i) => i).sort((i, j) => totalesFila[j] - totalesFila[i]);
    return {
      empleadosOrdenados: idxs.map(i => empleados[i]),
      columnas,
      matriz: idxs.map(i => matriz[i]),
      totalesFila: idxs.map(i => totalesFila[i]),
    };
  }, [dataVenta, filtrarFecha, metricKey, meses]);

  const { empleadosFiltrados, matrizFiltrada, totalesFilaFiltrada } = useMemo(() => {
    const keepIdx = empleadosOrdenados
      .map((emp, i) => ({ emp, i }))
      .filter(({ emp }) => {
        const empKey = toKey(emp);
        if (excluirSet.has(empKey) || excluirSet.has(firstWord(emp))) return false;
        if (!q) return true;
        return matchIncludes(emp, q);
      })
      .map(({ i }) => i);
    return {
      empleadosFiltrados: keepIdx.map(i => empleadosOrdenados[i]),
      matrizFiltrada: keepIdx.map(i => matriz[i]),
      totalesFilaFiltrada: keepIdx.map(i => totalesFila[i]),
    };
  }, [q, empleadosOrdenados, matriz, totalesFila, excluirSet]);

  const getVentasDeCelda = useCallback((empleadoNombre, idxMes) => {
    const filtroMes = meses[idxMes];
    const ventasMes = filtrarVentasPorMes(dataVenta, filtroMes);
    const objetivo = normalizeName(empleadoNombre);
    const filas = [];
    const seen = new Set();
    for (let i=0; i<ventasMes.length; i++) {
      const v = ventasMes[i];
      const id = v?.id ?? v?.numero_transac ?? `venta_${i}_${idxMes}`;
      const productos = Array.isArray(v?.detalle_ventaProductos) ? v.detalle_ventaProductos
                       : Array.isArray(v?.detalle_ventaproductos) ? v.detalle_ventaproductos : [];
      const servicios = Array.isArray(v?.detalle_ventaservicios) ? v.detalle_ventaservicios : [];
      const matchProd = productos.some(it => normalizeName(it?.empleado_producto?.nombres_apellidos_empl) === objetivo);
      const matchServ = servicios.some(it => normalizeName(it?.empleado_servicio?.nombres_apellidos_empl) === objetivo);
      if (matchProd || matchServ) {
        if (!seen.has(id)) {
          seen.add(id);
          filas.push({ id, fecha_venta: v?.fecha_venta ? dayjs(v.fecha_venta).toISOString() : '', ...v });
        }
      }
    }
    return filas;
  }, [dataVenta, meses]);

  const buildBreakdown = (brutoNum = 0) => {
    const bruto = Number(brutoNum) || 0;
    const igv = +(bruto * RATE_IGV).toFixed(2);
    const renta = +(bruto * RATE_RENTA).toFixed(2);
    const tarjeta = +(bruto * RATE_TARJETA).toFixed(2);
    const neto = +(bruto - igv - renta - tarjeta).toFixed(2);
    return { bruto, igv, renta, tarjeta, neto };
  };

  const onCellClick = (emp, colIndex) => {
    if (!emp || !meses[colIndex]) return;
    const objetivo = normalizeName(emp);
    setEmpleadoObjetivo(objetivo);
    const filas = getVentasDeCelda(emp, colIndex);
    setModalRows(filas);

    let totalCompra = 0;
    const ventaBrutaServicios = filas.reduce((acc, v) => {
      const servicios = Array.isArray(v?.detalle_ventaservicios) ? v.detalle_ventaservicios : [];
      const sumaServ = servicios.reduce((a, s) => {
        const empServ = normalizeName(s?.empleado_servicio?.nombres_apellidos_empl);
        if (empServ !== objetivo) return a;
        const cant = s?.cantidad == null ? 1 : Number(s.cantidad) || 0;
        const pUnit = Number(s?.tarifa_monto) || 0;
        return a + cant * pUnit;
      }, 0);
      return acc + sumaServ;
    }, 0);

    const ventaBrutaProductos = filas.reduce((acc, v) => {
      const productos = Array.isArray(v?.detalle_ventaProductos) ? v.detalle_ventaProductos
                        : Array.isArray(v?.detalle_ventaproductos) ? v.detalle_ventaproductos : [];
      const sumaProd = productos.reduce((a, p) => {
        const empProd = normalizeName(p?.empleado_producto?.nombres_apellidos_empl);
        if (empProd !== objetivo) return a;
        const cant = p?.cantidad == null ? 1 : Number(p.cantidad) || 0;
        const pUnit = Number(p?.tarifa_monto) || Number(p?.precio_unitario) || Number(p?.tb_producto?.prec_venta) || 0;
        totalCompra += cant * (Number(p?.tb_producto?.prec_compra) || 0);
        return a + cant * pUnit;
      }, 0);
      return acc + sumaProd;
    }, 0);

    const resumen = buildBreakdown(ventaBrutaServicios + ventaBrutaProductos);
    resumen.costoCompra = totalCompra;
    resumen.netoFinal = round2(resumen.neto - totalCompra);
    setModalResumen(resumen);

    const mes = columnas[colIndex]?.label || '';
    const nombre = (emp?.split?.(' ')?.[0] ?? emp) ?? '';
    setModalTitle(`${mes.toUpperCase?.() || mes} – ${nombre.toUpperCase?.() || nombre}`);

    setModalOpen(true);
  };

  const calcularTotales = useCallback((rows=[]) => {
    const totals = {};
    for (const row of rows) {
      const idVentaActual = row?.id ?? row?.id_venta ?? null;
      const pagosArr = (Array.isArray(row.detalleVenta_pagoVenta)
        ? row.detalleVenta_pagoVenta
        : Array.isArray(row.detalle_pagoVenta)
        ? row.detalle_pagoVenta
        : []
      ).filter(p => (p?.id_venta ?? row?.id) === idVentaActual);

      for (const p of pagosArr) {
        const raw = p?.parametro_forma_pago?.label_param ?? p?.forma ?? p?.id_forma_pago ?? '';
        const key = normalizePagoMethod(raw);
        if (!key) continue;
        totals[key] = (totals[key] || 0) + (Number(p?.parcial_monto ?? p?.monto ?? p?.monto_pago ?? p?.importe) || 0);
      }
    }
    return totals;
  }, [normalizePagoMethod]);
const onTotalClick = (colIndex) => {
  if (!meses[colIndex]) return;

  const filas = filtrarVentasPorMes(dataVenta, meses[colIndex]).map((v, i) => ({
    id: v?.id ?? v?.numero_transac ?? `venta_total_${i}_${colIndex}`,
    fecha_venta: v?.fecha_venta ? dayjs(v.fecha_venta).toISOString() : '',
    ...v,
  }));
   
  setEmpleadoObjetivo(''); 
  setModalRows(filas);

  const bruto = filas.reduce((acc, v) => {
    const prods = Array.isArray(v?.detalle_ventaProductos) ? v.detalle_ventaProductos
                 : Array.isArray(v?.detalle_ventaproductos) ? v.detalle_ventaproductos : [];
    const servs = Array.isArray(v?.detalle_ventaservicios) ? v.detalle_ventaservicios : [];

    const sumProds = prods.reduce((a, p) => {
      const cant = p?.cantidad == null ? 1 : Number(p.cantidad) || 0;
      const pUnit = Number(p?.tarifa_monto) || Number(p?.precio_unitario) || Number(p?.tb_producto?.prec_venta) || 0;
      return a + cant * pUnit;
    }, 0);

    const sumServs = servs.reduce((a, s) => {
      const cant = s?.cantidad == null ? 1 : Number(s.cantidad) || 0;
      const pUnit = Number(s?.tarifa_monto) || 0;
      return a + cant * pUnit;
    }, 0);

    return acc + sumProds + sumServs;
  }, 0);

  const res = buildBreakdown(bruto);
  const costoCompra = filas.reduce((acc, v) => {
    const prods = Array.isArray(v?.detalle_ventaProductos) ? v.detalle_ventaProductos
                 : Array.isArray(v?.detalle_ventaproductos) ? v.detalle_ventaproductos : [];
    return acc + prods.reduce((a, p) => {
      const cant = p?.cantidad == null ? 1 : Number(p.cantidad) || 0;
      const cUnit = Number(p?.tb_producto?.prec_compra) || 0;
      return a + cant * cUnit;
    }, 0);
  }, 0);
  res.costoCompra = costoCompra;
  res.netoFinal = round2(res.neto - costoCompra);
  setModalResumen(res);

  const mes = columnas[colIndex]?.label || '';
  setModalTitle(`${mes.toUpperCase?.() || mes} – TOTAL`);
  setModalOpen(true);
};
const onGrandTotalClick = () => {
  const filas = meses.flatMap((f, colIndex) =>
    filtrarVentasPorMes(dataVenta, f).map((v, i) => ({
      id: v?.id ?? v?.numero_transac ?? `venta_total_all_${colIndex}_${i}`,
      fecha_venta: v?.fecha_venta ? dayjs(v.fecha_venta).toISOString() : '',
      ...v,
    }))
  );
  setModalTitle('TODOS LOS MESES – TOTAL');  
  setEmpleadoObjetivo('');
  setModalRows(filas);
  setModalOpen(true);

  const bruto = filas.reduce((acc, v) => {
    const prods = Array.isArray(v?.detalle_ventaProductos) ? v.detalle_ventaProductos
                 : Array.isArray(v?.detalle_ventaproductos) ? v.detalle_ventaproductos : [];
    const servs = Array.isArray(v?.detalle_ventaservicios) ? v.detalle_ventaservicios : [];
    const sumProds = prods.reduce((a, p) => {
      const cant = p?.cantidad == null ? 1 : Number(p.cantidad) || 0;
      const pUnit = Number(p?.tarifa_monto) || Number(p?.precio_unitario) || Number(p?.tb_producto?.prec_venta) || 0;
      return a + cant * pUnit;
    }, 0);
    const sumServs = servs.reduce((a, s) => {
      const cant = s?.cantidad == null ? 1 : Number(s.cantidad) || 0;
      const pUnit = Number(s?.tarifa_monto) || 0;
      return a + cant * pUnit;
    }, 0);
    return acc + sumProds + sumServs;
  }, 0);

  const res = buildBreakdown(bruto);
  const costoCompra = filas.reduce((acc, v) => {
    const prods = Array.isArray(v?.detalle_ventaProductos) ? v.detalle_ventaProductos
                 : Array.isArray(v?.detalle_ventaproductos) ? v.detalle_ventaproductos : [];
    return acc + prods.reduce((a, p) => {
      const cant = p?.cantidad == null ? 1 : Number(p.cantidad) || 0;
      const cUnit = Number(p?.tb_producto?.prec_compra) || 0;
      return a + cant * cUnit;
    }, 0);
  }, 0);
  res.costoCompra = costoCompra;
  res.netoFinal = round2(res.neto - costoCompra);
 const primerMes = meses?.[0];
  const ultimoMes = meses?.[meses.length - 1];

  let titulo = 'TODOS LOS MESES – TOTAL';
  if (primerMes && ultimoMes) {
    titulo = `${primerMes.label.toUpperCase()} ${primerMes.anio} – ${ultimoMes.label.toUpperCase()} ${ultimoMes.anio}`;
    if (cutDay) titulo += ` (hasta el día ${cutDay})`;
  }
  setModalResumen(res);
  setModalTitle(titulo);
};
  useEffect(() => {
    if (modalOpen) {
      const nuevosTotales = modalRows.length > 0 ? calcularTotales(modalRows) : {};
      setTotalPorMetodo(nuevosTotales);
    }
  }, [modalOpen, modalRows, calcularTotales]);

  const modalData = useMemo(() => {
    if (!modalOpen || modalRows.length === 0) {
      return {
        flatProductos: [], flatServicios: [],
        productosAgrupados: [], serviciosAgrupados: [], serviciosOrdenados: [],
        totalPVentaProd: 0, totalPVentaServs: 0, totalPCompraProd: 0,
        totalTarjeta: 0, totalIGV: 0, totalRenta: 0, totalUtilBase: 0, totalComision: 0, totalUtilFinal: 0,
        totalCantidad: 0, totalPorMetodo: {}, methodsToShow: []
      };
    }

    const getPagoMonto = (p) => Number(p?.parcial_monto ?? p?.monto ?? p?.monto_pago ?? p?.importe ?? 0) || 0;
    const fixDelta = (obj, total) => {
      const suma = round2(Object.values(obj).reduce((a,b)=>a+Number(b||0),0));
      const delta = round2(total - suma);
      if (Math.abs(delta) >= 0.01) {
        const firstKey = Object.keys(obj).find((k)=>obj[k]>0) || Object.keys(obj)[0];
        if (firstKey) obj[firstKey] = round2((obj[firstKey] || 0) + delta);
      }
      return obj;
    };

    const flatProductos = [];
    const flatServicios = [];
    const totalesMetodo = {};
    for (const k of Object.keys(headerLabel)) totalesMetodo[k] = 0;

    for (const row of modalRows) {
      const productos = row.detalle_ventaProductos || row.detalle_ventaproductos || [];
      const servicios = row.detalle_ventaservicios || [];

      const pagosArr = Array.isArray(row.detalleVenta_pagoVenta) ? row.detalleVenta_pagoVenta
                      : Array.isArray(row.detalle_pagoVenta) ? row.detalle_pagoVenta : [];
      const pagosByMethod = pagosArr.reduce((acc, p) => {
        const raw = p?.parametro_forma_pago?.label_param ?? p?.id_forma_pago ?? p?.forma ?? '';
        const key = normalizePagoMethod(raw);
        if (!key) return acc;
        acc[key] = (acc[key] || 0) + getPagoMonto(p);
        return acc;
      }, {});

      let totalLineasVenta = 0;
      for (const it of productos) {
        const cant = it?.cantidad == null ? 1 : Number(it.cantidad) || 0;
        const pUnit = Number(it?.tarifa_monto) || Number(it?.precio_unitario) || Number(it?.tb_producto?.prec_venta) || 0;
        totalLineasVenta += cant * pUnit;
      }
      for (const it of servicios) {
        const cant = it?.cantidad == null ? 1 : Number(it.cantidad) || 0;
        const pUnit = Number(it?.tarifa_monto) || 0;
        totalLineasVenta += cant * pUnit;
      }

      for (const p of productos) {
        const empProd = normalizeName(p?.empleado_producto?.nombres_apellidos_empl);
       if (empleadoObjetivo && empProd !== empleadoObjetivo) continue;

        const cantidad = p?.cantidad == null ? 1 : Number(p.cantidad) || 0;
        const precioCompra = Number(p?.tb_producto?.prec_compra) || 0;
        const precioVenta  = Number(p?.tarifa_monto) || Number(p?.precio_unitario) || Number(p?.tb_producto?.prec_venta) || 0;

        const lineaTotal = cantidad * precioVenta;
        const share = totalLineasVenta > 0 ? (lineaTotal / totalLineasVenta) : 0;

        const allPaymentKeys = [...new Set([...Object.keys(headerLabel), ...Object.keys(pagosByMethod)])];
        const lineaMetodosRaw = allPaymentKeys.reduce((acc, k)=> (acc[toKey(k).replace(/\s+/g,'_')] = 0, acc), {});
        for (const [k,v] of Object.entries(pagosByMethod)) {
          const key = toKey(k).replace(/\s+/g,'_');
          lineaMetodosRaw[key] = (lineaMetodosRaw[key] || 0) + (v * share);
        }
        const lineaMetodos = fixDelta(lineaMetodosRaw, round2(lineaTotal));
        for (const [mKey, val] of Object.entries(lineaMetodos)) {
          totalesMetodo[mKey] = (totalesMetodo[mKey] || 0) + Number(val || 0);
        }

        flatProductos.push({ nombre: p?.tb_producto?.nombre_producto || "—", cantidad, precioCompra, precioVenta });
      }

      for (const s of servicios) {
        const empServ = normalizeName(s?.empleado_servicio?.nombres_apellidos_empl);
       if (empleadoObjetivo && empServ !== empleadoObjetivo) continue;

        const cantidad = s?.cantidad == null ? 1 : Number(s.cantidad) || 0;
        const pUnit = Number(s?.tarifa_monto) || 0;
        const lineaTotal = cantidad * pUnit;

        const lineaMetodosRaw = Object.fromEntries(Object.keys(headerLabel).map(k => [k, 0]));
        const totalPagos = Object.values(pagosByMethod).reduce((a,b)=>a+Number(b||0),0);

        if (totalPagos > 0) {
          for (const [raw, v] of Object.entries(pagosByMethod)) {
            const keyNorm = normalizePagoMethod(raw);
            if (!keyNorm || !headerLabel[keyNorm]) continue;
            lineaMetodosRaw[keyNorm] = round2(lineaTotal * (Number(v) / totalPagos));
          }
        } else {
          const fallback = headerLabel.efectivo ? "efectivo" : Object.keys(headerLabel)[0];
          if (fallback) lineaMetodosRaw[fallback] = round2(lineaTotal);
        }

        const lineaMetodos = fixDelta(lineaMetodosRaw, round2(lineaTotal));
        for (const [mKey, val] of Object.entries(lineaMetodos)) {
          totalesMetodo[mKey] = (totalesMetodo[mKey] || 0) + Number(val || 0);
        }

        flatServicios.push({
          nombre: s?.circus_servicio?.nombre_servicio || "—",
          cantidad,
          duracion: s?.circus_servicio?.duracion ?? "—",
          pVenta: pUnit,
          tarifa: pUnit,
          id_servicio: s?.id_servicio ?? s?.circus_servicio?.id_servicio ?? null,
          ...lineaMetodos,
        });
      }
    }

    const agruparServicios = (items=[]) => {
      const m = new Map();
      for (const it of items) {
        const idServ = it.id_servicio ?? it.circus_servicio?.id_servicio ?? null;
        const key = idServ ? `id:${idServ}|pv:${Number(it.tarifa)||0}`
                           : `nom:${normalizeName(it.nombre||"")}|pv:${Number(it.tarifa)||0}`;
        if (!m.has(key)) {
          const base = {
            nombre: it.nombre || it?.circus_servicio?.nombre_servicio || "—",
            duracion: it.duracion ?? it?.circus_servicio?.duracion ?? "—",
            pVenta: Number(it.tarifa)||0,
            cantidad: 0,
          };
          for (const k of Object.keys(headerLabel)) base[k] = 0;
          for (const k of Object.keys(it)) if (!["nombre","cantidad","duracion","pVenta","tarifa","id_servicio"].includes(k)) base[k] ??= 0;
          m.set(key, base);
        }
        const acc = m.get(key);
        acc.cantidad += Number(it.cantidad) || 0;
        for (const k of Object.keys(it))
          if (!["nombre","cantidad","duracion","pVenta","tarifa","id_servicio"].includes(k))
            acc[k] = (acc[k]||0) + (Number(it[k])||0);
      }
      return Array.from(m.values());
    };

    const serviciosAgrupados = agruparServicios(flatServicios);
    const totalPVentaServs = serviciosAgrupados.reduce((a,b)=> a + (b.pVenta||0)*(b.cantidad||0), 0);

    const serviciosOrdenados = [...serviciosAgrupados].sort((a,b)=>{
      const ca = Number(a.cantidad)||0, cb = Number(b.cantidad)||0;
      const pa = Number(a.pVenta)||0,   pb = Number(b.pVenta)||0;
      const a1 = ca===1, b1 = cb===1;
      if (a1!==b1) return a1 ? 1 : -1;
      if (!a1 && !b1) { if (cb!==ca) return cb-ca; if (pb!==pa) return pb-pa; }
      if (a1 && b1)   { if (pb!==pa) return pb-pa; }
      return String(a.nombre||'').localeCompare(String(b.nombre||''));
    });

    const agruparProductos = (items=[]) => {
      const m = new Map();
      for (const it of items) {
        const idProd = it.id_producto ?? it.id ?? it.tb_producto?.id_producto ?? null;
        const key = idProd
          ? `id:${idProd}|pv:${Number(it.precioVenta)||0}|pc:${Number(it.precioCompra)||0}`
          : `nom:${normalizeName(it.nombre||"")}|pv:${Number(it.precioVenta)||0}|pc:${Number(it.precioCompra)||0}`;
        if (!m.has(key)) m.set(key, { nombre: it.nombre || "—",
          precioVentaU: Number(it.precioVenta)||0, precioCompraU: Number(it.precioCompra)||0, cantidad: 0 });
        m.get(key).cantidad += Number(it.cantidad)||0;
      }
      return Array.from(m.values());
    };
const totalServCantidad = serviciosAgrupados.reduce((a,b)=> a + (Number(b.cantidad)||0), 0);

    const productosAgrupados = agruparProductos(flatProductos);
    const totalPVentaProd  = productosAgrupados.reduce((a,b)=> a + b.precioVentaU*b.cantidad, 0);
    const totalPCompraProd = productosAgrupados.reduce((a,b)=> a + b.precioCompraU*b.cantidad, 0);
    const totalTarjeta     = totalPVentaProd * RATE_TARJETA;
    const totalIGV         = totalPVentaProd * RATE_IGV;
    const totalRenta       = totalPVentaProd * RATE_RENTA;
    const totalUtilBase    = totalPVentaProd - totalTarjeta - totalIGV - totalRenta - totalPCompraProd;
    const totalComision    = totalUtilBase * RATE_COMISION;
    const totalUtilFinal   = totalUtilBase - totalComision;
    const totalCantidad    = productosAgrupados.reduce((a,b)=>a+b.cantidad,0);

    const METHOD_META_KEYS = new Set(["nombre","cantidad","duracion","pVenta","tarifa","id_servicio"]);
    const allMethodsInLines = [...new Set(
      flatServicios.flatMap(s => Object.keys(s).filter(k => !METHOD_META_KEYS.has(k) && Number(s[k])>0))
    )];
    const methodsToShow = (allMethodsInLines.length ? allMethodsInLines : ["openpay"])
      .sort((a,b)=> (Number(totalesMetodo[b])||0) - (Number(totalesMetodo[a])||0));

    return {
      flatProductos, flatServicios,
      productosAgrupados, serviciosAgrupados, serviciosOrdenados,
      totalPVentaProd, totalPCompraProd, totalPVentaServs,
      totalTarjeta, totalIGV, totalRenta, totalUtilBase, totalComision, totalUtilFinal,
      totalCantidad,
       totalServCantidad, 
      totalPorMetodo: totalesMetodo,
      methodsToShow
    };
  }, [modalOpen, modalRows, empleadoObjetivo, headerLabel, normalizePagoMethod]);

  const thStyle = { border: '1px solid #ccc', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '20px' };
  const tdStyle = { border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center', fontSize: '24px', verticalAlign: 'middle' };
  const tdTotales = {border:'1px solid #ccc',  textAlign:'center', fontSize:'28px'}
  const baseTableStyle = {
  borderCollapse: 'collapse',
  width: '100%',
  margin: '24px auto',   
};
const DISPLAY_LABEL = {
  "Total Ventas": "detalle de productos y servicios total por mes",
  "Cant. Ventas": "cantidad de clientes atendidos",
  "Ventas Productos": "Ventas de productos por mes",
  "Cant. Productos": "Cantidad  de productos Vendidos por mes",
  "Ventas Servicios": "Ventas de servicios",
  "Cant. Servicios": "cantidad por tipo de servicios",
};
const headerPretty = DISPLAY_LABEL[canonicalMetric] || canonicalMetric;


  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ marginBottom: 8, fontWeight: 700,fontSize:"30px",textAlign:"center" }}> {headerPretty}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar colaborador..."
            className="p-inputtext p-component"
            style={{ minWidth: 260, padding: 8 }}
            aria-label="Buscar empleado"
          />
          {q && <Button label="Limpiar" onClick={() => setQ('')} severity="secondary" outlined />}
        </div>

        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead className="bg-primary text-dark">
            <tr className="fs-3 ">
              <th style={thStyle}>Colaborador</th>
              {columnas.map((c, i) => (
                <th key={i} className="fs-3" style={thStyle}>{c.label}</th>
              ))}
              <th className="fs-3 " style={thStyle}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {empleadosFiltrados.length === 0 && (
              <tr><td style={tdStyle} colSpan={columnas.length + 2}>Sin datos para este periodo</td></tr>
            )}
            {empleadosFiltrados.map((emp, r) => (
              <tr key={emp}>
                <td style={tdStyle} className="fs-3 bg-primary">{emp?.split?.(' ')?.[0] ?? emp}</td>
                {matrizFiltrada[r].map((val, c) => (
                  <td
                    key={c}
                    className="fs-3 "
                    style={{ ...tdStyle, cursor: 'pointer', textDecoration: 'underline dotted' }}
                    title="Ver ventas (id, fecha_venta)"
                    onClick={() => onCellClick(emp, c)}
                    aria-label="Abrir ventas de la celda"
                  >
                    {isMoney ? <NumberFormatMoney amount={val} /> : val}
                  </td>
                ))}
                <td className="fs-3 bg-primary" style={{ ...tdStyle, fontWeight: 'bold' }}     onClick={onGrandTotalClick}
      title="Ver detalle de TODOS los meses">
                  {isMoney ? <NumberFormatMoney amount={totalesFilaFiltrada[r]} /> : totalesFilaFiltrada[r]}
                  
                </td>
              </tr>
            ))}
          </tbody>
          {empleadosFiltrados.length > 0 && (
           <tfoot>
  <tr>
    <td className="fs-3 bg-primary" style={{ ...tdStyle, fontWeight: 'bold' }}>TOTAL</td>

    {columnas.map((_, i) => (
      <td
        key={i}
        className="fs-3 bg-primary"
        style={{ ...tdStyle, fontWeight: 'bold' }}
        onClick={() => onTotalClick(i)}      // ← mes
        title={`Ver detalle del total de ${columnas[i]?.label || ''}${cutDay ? ` (hasta el día ${cutDay})` : ''}`}
      >
        {isMoney
          ? <NumberFormatMoney amount={matrizFiltrada.reduce((acc, row) => acc + (row[i] || 0), 0)} />
          : matrizFiltrada.reduce((acc, row) => acc + (row[i] || 0), 0)}
      </td>
    ))}

    <td
      className="fs-3 bg-primary"
      style={{ ...tdStyle, fontWeight: 'bold' }}
      onClick={onGrandTotalClick}            // ← gran total
      title="Ver detalle de TODOS LOS MESES – TOTAL"
    >
      {isMoney
        ? <NumberFormatMoney amount={matrizFiltrada.flat().reduce((a,b)=>a+b,0)} />
        : matrizFiltrada.flat().reduce((a,b)=>a+b,0)}
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
        fontSize: 30,
        fontWeight: 800,
        letterSpacing: 0.5,
      }}
    >
      {modalTitle || "Ventas"}
    </div>
  }
  visible={modalOpen}
  style={{
    width: "100vw",
    maxWidth: "150vw",
    margin: "0 auto",
    borderRadius: "12px",
  }}
  modal
  onHide={() => setModalOpen(false)}
  footer={
    <div className="flex justify-end gap-2">
      <Button label="Cerrar" onClick={() => setModalOpen(false)} />
    </div>
  }
>
  {modalRows.length === 0 ? (
    <div className="py-2">Sin ventas para esta celda.</div>
  ) : (
    <>
      {/* === Título === */}
      <div
        className="bg-primary fs-2 fw-bold text-center py-2"
        style={{
          fontWeight: 1000,
          marginBottom: 10,
          textAlign: "center",
          fontSize: 25,
          letterSpacing: 0.3,
          marginTop: 4,
          borderRadius: 6,
        }}
      >
        DETALLE DE PRODUCTOS Y SERVICIOS
      </div>

<div style={{ display: "flex", justifyContent: "center" }}>
      <div
        style={{
          borderRadius: 12,
          padding: 12,
          background: "#fffef5",
          textAlign: "center",
          alignItems: "center",
          marginBottom: 16,
          display: "inline-block",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0,1fr))",
            gap: 10,
          }}
        >
          {[
             { label: "Cantidad de servicios", value: modalData.totalServCantidad },
            {
              label: "Venta Servicios",
              value: <NumberFormatMoney amount={modalData.totalPVentaServs} />,
            },
            { label: "Cantidad de productos", value: modalData.totalCantidad },
            {
              label: "Venta Productos",
              value: <NumberFormatMoney amount={modalData.totalPVentaProd} />,
            },
           
          ].map((item, i) => (
            <div
              key={i}
              style={{
                border: "2px solid #d4af37",
                borderRadius: 8,
                padding: 12,
                background: "#fff",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 0 10px rgba(212,175,55,0.6)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              <div style={{ fontSize: 15, opacity: 0.7 }}>{item.label}</div>
              <div style={{ fontWeight: 800, fontSize: 25 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 8,
          textAlign: 'center',
          margin: "10px 0 18px",
          justifyContent: "center",
        }}
      >
        {Object.entries(headerLabel)
          .sort(
            (a, b) =>
              (modalData.totalPorMetodo[b[0]] || 0) -
              (modalData.totalPorMetodo[a[0]] || 0)
          )
          .map(([key, label]) => (
            <div
              key={key}
              style={{
                padding: 12,
                border: "2px solid #d4af37",
                borderRadius: 8,
                background: "#fff",
              }}
            >
              <div style={{ fontSize: 15, opacity: 0.7 }}>
                {label.toUpperCase()}
              </div>
              <div style={{ fontWeight: 800, fontSize: 25 }}>
                <NumberFormatMoney
                  amount={modalData.totalPorMetodo[key] || 0}
                />
              </div>
            </div>
          ))}
      </div>

       {modalResumen && (
  <div style={{ marginTop: 80 }}>
    <div style={{ fontWeight: 700, marginBottom: 8, textAlign: "center", fontSize: 30 }}>
           VENTAS POR SERVICIOS
    </div>
<table style={{ ...baseTableStyle, margin: '24px auto 12px', fontSize: 22 }}>
      <thead>
        <tr style={{ fontSize: 22 }}>
          <th className="bg-primary" style={thStyle}>Venta<br/> Bruta</th>
          <th className="bg-primary" style={thStyle}>IGV <br/> (-18%)</th>
          <th className="bg-primary" style={thStyle}>Renta <br/> (-3%)</th>
          <th className="bg-primary" style={thStyle}>Tarjeta <br/> (-4.5%)</th>
          <th className="bg-primary" style={thStyle}>Ingreso <br/> Neto</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={tdTotales}><NumberFormatMoney amount={modalResumen.bruto} /></td>
          <td style={{ ...tdTotales, color: "red" }}>- <NumberFormatMoney amount={modalResumen.igv} /></td>
          <td style={{ ...tdTotales, color: "red" }}>- <NumberFormatMoney amount={modalResumen.renta} /></td>
          <td style={{ ...tdTotales, color: "red" }}>- <NumberFormatMoney amount={modalResumen.tarjeta} /></td>
          <td style={{ ...tdTotales, fontWeight: "700", color: "#007b00" }}>
            <NumberFormatMoney amount={modalResumen.neto} />
          </td>
        </tr>  
      </tbody>
    </table>
  </div>
)}
  <div style={{ display: "flex", justifyContent: "center", width: "100%",marginTop:"100px" }}>
  <div style={{ marginTop: 6, position: "relative" }}>
    <div
      style={{
        fontWeight: 700,
        marginBottom: 20,
        fontSize: 30,
        textAlign: "center",
      }}
    >
      DETALLE DE SERVICIOS
    </div>
<table
  style={{
    ...baseTableStyle,
    width: "100%",          
    minWidth: "100%",       
    tableLayout: "fixed",   
    position: "relative",
  }}
>
  <thead>
  <tr>
<th
  className="bg-primary"
  style={{
    ...thStyle,
    width: "60px", 
    minWidth: "60px",
    maxWidth: "60px",
  }}
>
  Item
</th>
    <th className="bg-primary" style={thStyle}>Servicio</th>
    <th className="bg-primary" style={thStyle}>Cant.</th>
    <th className="bg-primary" style={thStyle}>Precio<br/>Unitario</th>
    <th
  className="bg-primary"
  style={thStyle}
  dangerouslySetInnerHTML={{ __html: "Venta<br/>Total" }}
/>
    {modalData.methodsToShow.map((m) => (
      <th
        key={m}
        className="bg-primary"
        style={thStyle}
        dangerouslySetInnerHTML={{
          __html: (headerLabel[m] || m).replace(/\s+/g, "<br/>"),
        }}
      />
    ))}

  </tr>
</thead>

<tbody>
  {modalData.serviciosOrdenados.map((s, i) => {
    const totalLinea = (Number(s.pVenta) || 0) * (Number(s.cantidad) || 0);
    const vals = Object.fromEntries(
      modalData.methodsToShow.map((m) => [m, round2(Number(s[m]) || 0)])
    );
    let suma = round2(modalData.methodsToShow.reduce((a, k) => a + (vals[k] || 0), 0));
    let delta = round2(totalLinea - suma);

    return (
      <tr key={i} style={i % 2 ? { background: "#fcfcfc" } : null}>
        {/* ITEM */}
        <td className='bg-primary' style={{ ...tdStyle, fontWeight: 700, width: 64, textAlign: "center" }}>
          {i + 1}
        </td>
        {/* Servicio */}
      <td
  className="bg-primary"
  style={{
    ...tdStyle,
    textAlign: "left",
    fontWeight: 600,
    whiteSpace: "normal",     
    wordWrap: "break-word",   
    maxWidth: 250,            
  }}
>
  {s.nombre}
</td>
        {/* Cantidad */}
        <td style={tdStyle}>{s.cantidad}</td>

        {/* P. Unitario */}
        <td style={{ ...tdStyle, fontWeight: 600 }}>
          {s.pVenta ? <NumberFormatMoney amount={s.pVenta} /> : "—"}
        </td>

      
        {/* Total línea */}
        <td style={{ ...tdStyle, fontWeight: 600 }}>
          <NumberFormatMoney amount={totalLinea} />
        </td>
          {/* Métodos */}
        {modalData.methodsToShow.map((m, idx) => {
          let val = vals[m] || 0;
          if (idx === 0 && Math.abs(delta) >= 0.01) { val = round2(val + delta); delta = 0; }
          return (
            <td key={m} style={tdStyle}>
               <NumberFormatMoney amount={val || 0  } /> 
            </td>
          );
        })}
      </tr>

    );
  })}

  {modalData.serviciosOrdenados.length > 0 && (
    <tr className='bg-primary text-dark'>
      <td style={tdStyle} />
      <td  style={{ ...tdTotales, fontWeight: 800, textAlign: "right",WebkitTextFillColor: "white" }}>
        TOTAL SERVICIOS
      </td>
      <td style={{ ...tdTotales, fontWeight: 800 ,WebkitTextFillColor: "white"}}>
        {modalData.serviciosOrdenados.reduce((a, b) => a + (Number(b.cantidad) || 0), 0)}
      </td>
      <td style={{ ...tdTotales, fontWeight: 800 }} />
      {(() => {
        const totalPVentaServs = round2(
          modalData.serviciosOrdenados.reduce(
            (acc, s) => acc + (Number(s.pVenta) || 0) * (Number(s.cantidad) || 0),
            0
          )
        );
        const totalsByMethod = modalData.methodsToShow.reduce((acc, m) => {
          acc[m] = round2(
            modalData.serviciosOrdenados.reduce((sum, s) => sum + (Number(s[m]) || 0), 0)
          );
          return acc;
        }, {});
        let sumMethods = round2(modalData.methodsToShow.reduce((a, m) => a + (totalsByMethod[m] || 0), 0));
        let delta = round2(totalPVentaServs - sumMethods);
        if (Math.abs(delta) >= 0.01 && modalData.methodsToShow[0]) {
          const first = modalData.methodsToShow[0];
          totalsByMethod[first] = round2((totalsByMethod[first] || 0) + delta);
        }
        return (
          <>
            {modalData.methodsToShow.map((m) => (
              <td key={m} style={{ ...tdTotales, fontWeight: 800,WebkitTextFillColor: "white" }}>
                <NumberFormatMoney amount={totalsByMethod[m]} />
              </td>
            ))}
            <td style={{ ...tdTotales, fontWeight: 800, color: "white" }}>
              <NumberFormatMoney amount={totalPVentaServs} />
            </td>
          </>
        );
      })()}
    </tr>
  )}
</tbody>

    </table>
  </div>
</div>
            <div style={{  justifySelf: "center",marginTop:"100px" }}>
              <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 30, textAlign: "center" }}>
                PRODUCTOS VENDIDOS
              </div>

<table
  style={{
    ...baseTableStyle,
    width: "100%",      
    minWidth: 0,        
    margin: 0,           
    tableLayout: "fixed" 
  }}
>
  <thead>
    <tr>
<th
  className="bg-primary"
  style={{
    ...thStyle,
    width: "60px",
    minWidth: "60px",
    maxWidth: "60px",
    textAlign: "center"
  }}
>
  Item
</th>
      <th className="bg-primary" style={thStyle}>Producto</th>
      <th className="bg-primary" style={thStyle}>Cantidad</th>
      <th className="bg-primary" style={thStyle}>Precio<br/> Unitario</th>
      <th className="bg-primary" style={thStyle}>Precio <br/>    Venta</th>
      <th className="bg-primary" style={thStyle}>IGV<br/>(-18%)</th>
      <th className="bg-primary" style={thStyle}>Tarjeta<br/>(-4.5%)</th>
      <th className="bg-primary" style={thStyle}>Renta<br/>(-3%)</th>
      <th className="bg-primary" style={thStyle}>Costo<br/>Compra</th>
      <th className="bg-primary" style={thStyle}>Utilidad<br/>Bruta</th>
      <th className="bg-primary" style={thStyle}>Comisión</th>
      <th className="bg-primary" style={thStyle}>Utilidad<br/>Neta</th>
    </tr>
  </thead>

  <tbody>
    {modalData.productosAgrupados.length === 0 ? (
      <tr>
        <td colSpan={12} style={tdStyle}>
          No se vendieron productos.
        </td>
      </tr>
    ) : (
[...modalData.productosAgrupados]
  .sort((a, b) => {
    const cantDiff = (b.cantidad || 0) - (a.cantidad || 0);
    if (cantDiff !== 0) return cantDiff;

    return (b.precioVentaU || 0) - (a.precioVentaU || 0);
  })
  .map((p, i) => {
        const venta = (p.precioVentaU || 0) * (p.cantidad || 0);
        const compra = (p.precioCompraU || 0) * (p.cantidad || 0);
        const tarjeta = venta * RATE_TARJETA;
        const igv = venta * RATE_IGV;
        const renta = venta * RATE_RENTA;
        const utilBase = venta - tarjeta - igv - renta - compra;
        const comision = utilBase * RATE_COMISION;
        const utilFinal = utilBase - comision;

        return (
          <tr key={i} style={i % 2 ? { background: "#fcfcfc" } : null}>
            <td className='bg-primary' style={{ ...tdStyle,    width: "60px", 
    minWidth: "60px",
    maxWidth: "60px", textAlign: "center" }}>
              {i + 1}
            </td>

            {/* PRODUCTO */}
            <td className='bg-primary text-dark'
              style={{
                ...tdStyle,
                textAlign: "left",
                fontWeight: 700,
                whiteSpace: "normal",
                wordWrap: "break-word",
                maxWidth: 750,
              }}
            >
              {p.nombre}
            </td>

            {/* CANTIDAD */}
            <td style={tdStyle}>{p.cantidad}</td>

            {/* P. UNITARIO */}
            <td style={{ ...tdStyle, fontWeight: 600 }}>
              <NumberFormatMoney amount={p.precioVentaU || 0} />
            </td>

            {/* P. VENTA TOTAL */}
            <td style={{ ...tdStyle, fontWeight: 600, color: "#007b00" }}>
              <NumberFormatMoney amount={venta} />
            </td>

            {/* IGV */}
            <td style={{ ...tdStyle, color: "red" }}>
              <NumberFormatMoney amount={igv} />
            </td>

            {/* TARJETA */}
            <td style={{ ...tdStyle, color: "red" }}>
              <NumberFormatMoney amount={tarjeta} />
            </td>

            {/* RENTA */}
            <td style={{ ...tdStyle, color: "red" }}>
              <NumberFormatMoney amount={renta} />
            </td>

            {/* COSTO COMPRA */}
            <td style={{ ...tdStyle, color: "red" }}>
              <NumberFormatMoney amount={compra} />
            </td>

            {/* UTILIDAD BRUTA */}
            <td style={{ ...tdStyle, fontWeight: 600, color: "green" }}>
              <NumberFormatMoney amount={utilBase} />
            </td>

            {/* COMISIÓN */}
            <td style={{ ...tdStyle, color: "red" }}>
              <NumberFormatMoney amount={comision} />
            </td>

            {/* UTILIDAD NETA */}
            <td
              style={{
                ...tdStyle,
                fontWeight: 700,
                color: utilFinal >= 0 ? "#007b00" : "red",
              }}
            >
              <NumberFormatMoney amount={utilFinal} />
            </td>
          </tr>
        );
      })
    )}

    <tr style={{ backgroundColor: "var(--primary-color)" }}>
         <td className="bg-primary text-dark" style={{ ...tdTotales, fontWeight: 1000 }}>
      </td>
      <td className="bg-primary " style={{ ...tdTotales, fontWeight: 1000,WebkitTextFillColor: "white" }}>
        TOTALES
      </td>
      <td className="bg-primary" style={{ ...tdTotales, fontWeight: 1000, WebkitTextFillColor: "white" }}>
        {modalData.totalCantidad}
      </td>
      <td className="bg-primary" style={{ ...tdTotales }} />
      <td className="bg-primary" style={{ ...tdTotales, fontWeight: 1000, WebkitTextFillColor: "white" }}>
        <NumberFormatMoney amount={modalData.totalPVentaProd} />
      </td>
      <td className="bg-primary" style={{ ...tdTotales, fontWeight: 1000, WebkitTextFillColor: "white" }}>
        <NumberFormatMoney amount={modalData.totalIGV} />
      </td>
      <td className="bg-primary" style={{ ...tdTotales, fontWeight: 1000, WebkitTextFillColor: "white" }}>
        <NumberFormatMoney amount={modalData.totalTarjeta} />
      </td>
      <td className="bg-primary" style={{ ...tdTotales, fontWeight: 1000, WebkitTextFillColor: "white" }}>
        <NumberFormatMoney amount={modalData.totalRenta} />
      </td>
      <td className="bg-primary" style={{ ...tdTotales, fontWeight: 1000, WebkitTextFillColor: "white" }}>
        <NumberFormatMoney amount={modalData.totalPCompraProd} />
      </td>
      <td className="bg-primary" style={{ ...tdTotales, fontWeight: 1000, color: "green", WebkitTextFillColor: "white" }}>
        <NumberFormatMoney amount={modalData.totalUtilBase} />
      </td>
      <td className="bg-primary" style={{ ...tdTotales, fontWeight: 1000, color: "red", WebkitTextFillColor: "white" }}>
        <NumberFormatMoney amount={modalData.totalComision} />
      </td>
      <td
        className="bg-primary"
        style={{
          ...tdTotales,
          fontWeight: 800,
          color: modalData.totalUtilFinal >= 0 ? "white" : "red",
          WebkitTextFillColor: modalData.totalUtilFinal >= 0 ? "white" : "red",
        }}
      >
        <NumberFormatMoney amount={modalData.totalUtilFinal} />
      </td>
    </tr>
  </tbody>
</table>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
};

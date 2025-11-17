import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { NumberFormatMoney } from '@/components/CurrencyMask';
import { Button } from 'primereact/button';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/es';
import { PTApi } from '@/common/api/';
import { DetalleVentasDialog } from "./dialogs/DetalleVentasDialog";

import { useTerminoMetodoPagoStore } from "@/hooks/hookApi/FormaPagoStore/useTerminoMetodoPagoStore";

dayjs.extend(utc);
dayjs.locale('es');


const toKey = (s='') =>
  s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const firstWord = (s='') => toKey(s).split(' ')[0] || '';
const normalizeName = (s) => (!s ? '' : s.normalize('NFKC').trim().replace(/\s+/g, ' '));
const round2 = (x) => Math.round((Number(x) + Number.EPSILON) * 100) / 100;

// MatrizEmpleadoMes.jsx
function filtrarVentasPorMes(ventas = [], filtro, initDay = 1, cutDay = null) {
  if (!filtro || !filtro.mes || !filtro.anio) return ventas;

  const mapa = {enero:0,febrero:1,marzo:2,abril:3,mayo:4,junio:5,
    julio:6,agosto:7,septiembre:8,setiembre:8,octubre:9,noviembre:10,diciembre:11};
  const m = mapa[String(filtro.mes).toLowerCase()];
  const y = Number(filtro.anio);
  if (m == null || !Number.isFinite(y)) return ventas;

  const last = new Date(y, m + 1, 0).getDate();
  const from = Math.max(1, Math.min(initDay || 1, last));
  const to   = Math.max(from, Math.min(cutDay || last, last));

  const parseIsoLima = (iso) => {
    if (!iso) return null;
    const s = String(iso).trim()
      .replace(" ", "T")
      .replace(" +00:00", "Z")
      .replace("+00:00", "Z");
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    // llevar a hora Lima
    return new Date(d.getTime() - 5 * 60 * 60000);
  };

  const inRange = (iso) => {
    const d = parseIsoLima(iso);
    return d &&
      d.getFullYear() === y &&
      d.getMonth() === m &&
      d.getDate() >= from &&
      d.getDate() <= to;
  };

  return ventas.filter((v) => {
    return inRange(v?.fecha_venta ?? v?.fecha ?? v?.createdAt);

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
 const [rateIgv, setRateIgv] = useState(0.18);
const [rateRenta, setRateRenta] = useState(0.03);
const [rateTarjeta, setRateTarjeta] = useState(0.045);
const RATE_COMISION = 0.10;


  const [q, setQ] = useState('');
  const normq = (s='') => s.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, ' ');
  const matchIncludes = (haystack, needle) => normq(haystack).includes(normq(needle));
const normalizeMetricLabel = (s = "") =>
  String(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
    .replace(/\./g, " ")                              
    .replace(/\s+/g, " ")                             
    .trim()
    .toUpperCase();

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


  const onRowTotalClick = (emp) => {
  if (!emp) return;
  const objetivo = normalizeName(emp);
  setEmpleadoObjetivo(objetivo);

  // Trae todas las ventas de los meses visibles donde participe el colaborador
  const filas = meses.flatMap((_, colIndex) => getVentasDeCelda(emp, colIndex));
  setModalRows(filas);

let totalCostoServicios = 0;
  let totalCompra = 0;
  const ventaBrutaServicios = filas.reduce((acc, v) => {
    const servicios = Array.isArray(v?.detalle_ventaservicios) ? v.detalle_ventaservicios : [];
    const suma = servicios.reduce((a, s) => {
      const empServ = normalizeName(s?.empleado_servicio?.nombres_apellidos_empl);
      if (empServ !== objetivo) return a;
      const cant = s?.cantidad == null ? 1 : Number(s.cantidad) || 0;
      const pUnit = Number(s?.tarifa_monto) || 0;
      totalCostoServicios += cant * (Number(s?.circus_servicio?.precio_compra) || 0);
      return a + cant * pUnit;
    }, 0);
    return acc + suma;
  }, 0);

  const ventaBrutaProductos = filas.reduce((acc, v) => {
    const productos = Array.isArray(v?.detalle_ventaProductos) ? v.detalle_ventaProductos
                    : Array.isArray(v?.detalle_ventaproductos) ? v.detalle_ventaproductos : [];
    const suma = productos.reduce((a, p) => {
      const empProd = normalizeName(p?.empleado_producto?.nombres_apellidos_empl);
      if (empProd !== objetivo) return a;
      const cant = p?.cantidad == null ? 1 : Number(p.cantidad) || 0;
      const pUnit = Number(p?.tarifa_monto) || Number(p?.precio_unitario) || Number(p?.tb_producto?.prec_venta) || 0;
      totalCompra += cant * (Number(p?.tb_producto?.prec_compra) || 0);
      return a + cant * pUnit;
    }, 0);
    return acc + suma;
  }, 0);

  const resumen = buildBreakdown(ventaBrutaServicios + ventaBrutaProductos);
  resumen.costoCompra = totalCompra;
  resumen.netoFinal = round2(resumen.neto - totalCompra);
  setModalResumen(resumen);
setModalCostoServicios(totalCostoServicios);
  // Título bonito con rango de meses + nombre
  const primerMes = meses?.[0];
  const ultimoMes = meses?.[meses.length - 1];
  const nombre = (emp?.split?.(' ')?.[0] ?? emp) ?? '';
  let titulo = `TOTAL – ${nombre.toUpperCase()}`;
  if (primerMes && ultimoMes) {
    const l1 = (primerMes.label || primerMes.mes || '').toUpperCase();
    const l2 = (ultimoMes.label || ultimoMes.mes || '').toUpperCase();
    titulo = `${l1} ${primerMes.anio} – ${l2} ${ultimoMes.anio}${cutDay ? ` (hasta el día ${cutDay})` : ''} – ${nombre.toUpperCase()}`;
  }
  setModalTitle(titulo);

  setModalOpen(true);
};

  const [modalOpen, setModalOpen] = useState(false);
  const [modalRows, setModalRows] = useState([]);
  const [modalTitle, setModalTitle] = useState('');
  const [modalResumen, setModalResumen] = useState(null);
  const [empleadoObjetivo, setEmpleadoObjetivo] = useState('');
const [modalCostoServicios, setModalCostoServicios] = useState(0);
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
// Serie mensual del empleado abierto en el modal
const serieEmpleadoMes = useMemo(() => {
  if (!empleadoObjetivo) return [];
  const objetivo = normalizeName(empleadoObjetivo);

  return meses.map((_, colIndex) => {
    const filas = getVentasDeCelda(objetivo, colIndex); // ya normaliza internamente
    let total = 0;

    for (const v of filas) {
      // Servicios del empleado
      const servicios = Array.isArray(v?.detalle_ventaservicios) ? v.detalle_ventaservicios : [];
      for (const s of servicios) {
        const empServ = normalizeName(s?.empleado_servicio?.nombres_apellidos_empl);
        if (empServ !== objetivo) continue;
        const cant = s?.cantidad == null ? 1 : Number(s.cantidad) || 0;
        const pUnit = Number(s?.tarifa_monto) || 0;
        total += cant * pUnit;
      }

      // Productos del empleado
      const productos = Array.isArray(v?.detalle_ventaProductos) ? v.detalle_ventaProductos
                        : Array.isArray(v?.detalle_ventaproductos) ? v.detalle_ventaproductos : [];
      for (const p of productos) {
        const empProd = normalizeName(p?.empleado_producto?.nombres_apellidos_empl);
        if (empProd !== objetivo) continue;
        const cant = p?.cantidad == null ? 1 : Number(p.cantidad) || 0;
        const pUnit = Number(p?.tarifa_monto) || Number(p?.precio_unitario) || Number(p?.tb_producto?.prec_venta) || 0;
        total += cant * pUnit;
      }
    }

    const label = columnas[colIndex]?.label || '';
    return { label, total: round2(total) };
  });
}, [empleadoObjetivo, meses, columnas, getVentasDeCelda]);

// Δ vs mes siguiente: delta[i] = total[i+1] - total[i]
const deltasEmpleadoMes = useMemo(() => {
  return serieEmpleadoMes.map((pt, i) =>
    i < serieEmpleadoMes.length - 1 ? round2(serieEmpleadoMes[i + 1].total - pt.total) : null
  );
}, [serieEmpleadoMes]);
 const buildBreakdown = (brutoNum = 0) => {
  const bruto = Number(brutoNum) || 0;

  // 1) Descontar comisión de tarjeta sobre la venta bruta
  const tarjeta = round2(bruto * rateTarjeta);
  const base = round2(bruto - tarjeta);

  // 2) IGV y Renta calculados sobre el neto después de tarjeta
  const igv = round2(base * rateIgv);
  const renta = round2(base * rateRenta);

  // 3) Ingreso neto final
  const neto = round2(base - igv - renta);

  return { bruto, tarjeta, igv, renta, neto };
};


  const onCellClick = (emp, colIndex) => {
    if (!emp || !meses[colIndex]) return;
    const objetivo = normalizeName(emp);
    setEmpleadoObjetivo(objetivo);
    const filas = getVentasDeCelda(emp, colIndex);
    setModalRows(filas);

    let totalCompra = 0;
    let totalCostoServicios = 0;

    const ventaBrutaServicios = filas.reduce((acc, v) => {
      const servicios = Array.isArray(v?.detalle_ventaservicios) ? v.detalle_ventaservicios : [];
      const sumaServ = servicios.reduce((a, s) => {
        const empServ = normalizeName(s?.empleado_servicio?.nombres_apellidos_empl);
        if (empServ !== objetivo) return a;
        const cant = s?.cantidad == null ? 1 : Number(s.cantidad) || 0;
        const pUnit = Number(s?.tarifa_monto) || 0;
        totalCostoServicios += cant * (Number(s?.circus_servicio?.precio_compra) || 0);
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
    setModalCostoServicios(totalCostoServicios);
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

  // --- AÑADIDO ---
  let totalCostoServicios = 0; // 1. Inicializar costo de servicios
const sumServs = servs.reduce((a, s) => {
    // Se obtiene la cantidad
    const cant = s?.cantidad == null ? 1 : Number(s.cantidad) || 0; 
    const pUnit = Number(s?.tarifa_monto) || 0;

    // 2. ¡AQUÍ SE MULTIPLICA! (Cantidad * precio_compra)
    totalCostoServicios += cant * (Number(s?.circus_servicio?.precio_compra) || 0); 
    
    return a + cant * pUnit; // Se suma la venta bruta
}, 0);
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

      // --- AÑADIDO ---
      // 2. Calcular costo de servicio
      totalCostoServicios += cant * (Number(s?.circus_servicio?.precio_compra) || 0); 
      // -----------------

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

  // --- AÑADIDO ---
  setModalCostoServicios(totalCostoServicios); // 3. Setear el estado
  // -----------------

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

  // --- AÑADIDO ---
  let totalCostoServicios = 0; // 1. Inicializar costo de servicios
  // -----------------

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

      // --- AÑADIDO ---
      // 2. Calcular costo de servicio
      totalCostoServicios += cant * (Number(s?.circus_servicio?.precio_compra) || 0);
      // -----------------

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

  // --- AÑADIDO ---
  setModalCostoServicios(totalCostoServicios); // 3. Setear el estado
  // -----------------

 setModalTitle(titulo);
};
  useEffect(() => {
    if (modalOpen) {
      const nuevosTotales = modalRows.length > 0 ? calcularTotales(modalRows) : {};
      setTotalPorMetodo(nuevosTotales);
    }
  }, [modalOpen, modalRows, calcularTotales]);
useEffect(() => {
  if (!modalOpen || !modalResumen) return;

  const bruto = Number(modalResumen.bruto) || 0;
  const costoCompra = Number(modalResumen.costoCompra) || 0;

  const nuevo = buildBreakdown(bruto);
  nuevo.costoCompra = costoCompra;
  nuevo.netoFinal = round2(nuevo.neto - costoCompra);

  setModalResumen(nuevo);
}, [rateIgv, rateRenta, rateTarjeta, modalOpen]);

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
const totalServCantidad = serviciosAgrupados.reduce(
  (a, b) => a + (Number(b.cantidad) || 0),
  0
);

const productosAgrupados = agruparProductos(flatProductos);
const totalPVentaProd = productosAgrupados.reduce(
  (a, b) => a + b.precioVentaU * b.cantidad,
  0
);
const totalPCompraProd = productosAgrupados.reduce(
  (a, b) => a + b.precioCompraU * b.cantidad,
  0
);

// 1) Tarjeta sobre venta bruta de productos
const totalTarjeta = round2(totalPVentaProd * rateTarjeta);
const baseProd = round2(totalPVentaProd - totalTarjeta);

// 2) IGV y Renta sobre el neto después de tarjeta
const totalIGV = round2(baseProd * rateIgv);
const totalRenta = round2(baseProd * rateRenta);

// 3) Utilidad base y final (después de costo compra y comisión)
const totalUtilBase = round2(baseProd - totalIGV - totalRenta - totalPCompraProd);
const totalComision = round2(totalUtilBase * RATE_COMISION);
const totalUtilFinal = round2(totalUtilBase - totalComision);

const totalCantidad = productosAgrupados.reduce(
  (a, b) => a + b.cantidad,
  0
);


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
}, [
  modalOpen,
  modalRows,
  empleadoObjetivo,
  headerLabel,
  normalizePagoMethod,
  rateIgv,
  rateRenta,
  rateTarjeta
]);

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
                <td className="fs-3 bg-primary" 
   style={{ ...tdStyle, fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline dotted' }}    onClick={() => onRowTotalClick(emp)} 
      title="Ver detalle del total de ${emp}">
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

<DetalleVentasDialog
  open={modalOpen}
  title={modalTitle}
  onClose={() => setModalOpen(false)}
  modalRows={modalRows}
  modalResumen={modalResumen}
  totalCostoServicios={modalCostoServicios}
  modalData={modalData}
  empleadoObjetivo={empleadoObjetivo}
  serieEmpleadoMes={serieEmpleadoMes}
  deltasEmpleadoMes={deltasEmpleadoMes}
  headerLabel={headerLabel}
  baseTableStyle={baseTableStyle}
  thStyle={thStyle}
  tdStyle={tdStyle}
  tdTotales={tdTotales}
  rateIgv={rateIgv}
  rateRenta={rateRenta}
  rateTarjeta={rateTarjeta}
  rateComision={RATE_COMISION}
  setRateIgv={setRateIgv}
  setRateRenta={setRateRenta}
  setRateTarjeta={setRateTarjeta}
/>


    </>
  );
};

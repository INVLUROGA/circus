import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import * as XLSX from 'xlsx';

dayjs.extend(isoWeek);

// ==========================================
// 1. NORMALIZACIÓN Y STRINGS
// ==========================================
export const canon = (s = '') =>
  s.toString().trim().toLowerCase()
   .normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ');

export const normalizar = (texto) =>
  (texto || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// ==========================================
// 2. REGLAS DE PAGO Y MAPEO
// ==========================================
const RULES = [
  { to: 'TRANSFERENCIA', when: ['transf', 'transferencia', 'bcp', 'interbank'] },
  { to: 'tarjeta', when: ['tarjeta', "OPENPAY", 'visa', 'mastercard', 'niubiz', 'izipay'] },
  { to: 'efectivo', when: ['efectivo', 'cash'] },
  { to: 'yape', when: ['yape'] },
  { to: 'plin', when: ['plin'] },
  { to: 'deposito', when: ['deposito', 'deposito bancario', 'abono'] },
  { to: 'openpay', when: ['OPENPAY'] },
];

export const mapFormaPago = (texto) => {
  const c = canon(texto);
  for (const r of RULES) {
    if (r.when.some(w => c.includes(w))) return r.to;
  }
  return c || 'desconocido';
};

export const agruparPagos = (ventas = []) => {
  const map = new Map();

  ventas.forEach((venta, ventaIndex) => {
    (venta?.detalleVenta_pagoVenta ?? []).forEach((pago, pagoIndex) => {
      const forma_pago = mapFormaPago(pago?.parametro_forma_pago?.label_param);
      const monto = Number(pago?.parcial_monto || 0);
      
      if (!map.has(forma_pago)) {
        map.set(forma_pago, {
          forma_pago,
          suma_total_parcial: 0,
          items_ventas_tienen_esa_forma_de_pago: [],
        });
      }

      const entry = map.get(forma_pago);
      entry.suma_total_parcial += monto;
      entry.items_ventas_tienen_esa_forma_de_pago.push({
        ventaIndex,
        pagoIndex,
        parcial_monto: monto,
        parametro_forma_pago: pago?.parametro_forma_pago ?? null,
      });
    });
  });

  const resumenConItems = Array.from(map.values());
  const resumenSoloSuma = resumenConItems.map(({ items_ventas_tienen_esa_forma_de_pago, ...rest }) => rest);

  return { resumenSoloSuma, resumenConItems };
};

// ==========================================
// 3. LÓGICA DE SERVICIOS
// ==========================================
export const agruparServiciosPorEmpleado = (lista = []) => {
  const map = new Map();
  for (const s of lista) {
    const id = s?.id_empl ?? s?.empleado_servicio?.id ?? "sin_asignar";
    const empleado = s?.empleado_servicio?.nombres_apellidos_empl || "Sin asignar";
    if (!map.has(id)) map.set(id, { id_empl: id, empleado, items: [], total: 0 });
    const g = map.get(id);
    g.items.push(s);
    g.total += Number(s?.tarifa_monto ?? 0);
  }
  return Array.from(map.values());
};

export const aggregateServicios = (servs = [], mode = 'servicio-empleado') => {
  const map = new Map();
  for (const s of servs) {
    const servicio = s?.circus_servicio?.nombre_servicio || '-';
    const empleado = s?.empleado_servicio?.nombres_apellidos_empl || '-';
    const key = mode === 'servicio' ? servicio : `${servicio}||${empleado}`;
    const cur = map.get(key) || { servicio, empleado: mode === 'servicio' ? '—' : empleado, cantidad: 0, total: 0 };
    cur.cantidad += 1;
    cur.total += Number(s?.tarifa_monto || 0);
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
};

// ==========================================
// 4. LÓGICA DE PRODUCTOS (FALTABA ESTO)
// ==========================================
export const aggregateProductos = (prods = [], mode = 'producto-empleado') => {
  const map = new Map();
  for (const p of prods) {
    const producto = p?.tb_producto?.nombre_producto || '-';
    const empleado = p?.empleado_producto?.nombres_apellidos_empl || '-';
    const key = mode === 'producto' ? producto : `${producto}||${empleado}`;
    const cur = map.get(key) || { producto, empleado: mode === 'producto' ? '—' : empleado, cantidad: 0, total: 0 };
    cur.cantidad += 1; 
    cur.total += Number(p?.tarifa_monto || 0);
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
};

export const getTopVendedoresPorProducto = (prods = []) => {
  const byProd = new Map(); 
  for (const p of prods) {
    const producto = p?.tb_producto?.nombre_producto || '-';
    const empleado = p?.empleado_producto?.nombres_apellidos_empl || '-';
    const unidades = Number(p?.cantidad ?? 0) || 1;
    const importe = Number(p?.tarifa_monto || 0);

    if (!byProd.has(producto)) byProd.set(producto, new Map());
    const mapEmp = byProd.get(producto);
    const cur = mapEmp.get(empleado) || { empleado, unidades: 0, importe: 0 };
    cur.unidades += unidades;
    cur.importe += importe;
    mapEmp.set(empleado, cur);
  }

  const res = [];
  for (const [producto, mapEmp] of byProd.entries()) {
    const arr = Array.from(mapEmp.values());
    arr.sort((a, b) => b.importe - a.importe || b.unidades - a.unidades);
    const totalImporte = arr.reduce((s, x) => s + x.importe, 0);
    const totalUnidades = arr.reduce((s, x) => s + x.unidades, 0);
    const top = arr[0] || { empleado: '—', unidades: 0, importe: 0 };
    res.push({ producto, totalImporte, totalUnidades, top, ranking: arr });
  }
  res.sort((a, b) => b.totalImporte - a.totalImporte || b.totalUnidades - a.totalUnidades);
  return res;
};

// ==========================================
// 5. RANKINGS Y ORDENAMIENTO
// ==========================================
export const rankColaboradores = (items = [], getEmpleado, getImporte, getCantidad = () => 1) => {
  const map = new Map();
  for (const it of items) {
    const empleado = getEmpleado(it) || '—';
    const importe = Number(getImporte(it) || 0);
    const cant = Number(getCantidad(it) || 0) || 1;
    const cur = map.get(empleado) || { colaborador: empleado, cantidad: 0, total: 0 };
    cur.cantidad += cant;
    cur.total += importe;
    map.set(empleado, cur);
  }
  return Array.from(map.values()).map((x) => ({
    ...x,
    promedio: x.cantidad ? x.total / x.cantidad : 0,
  }));
};

export const sortRows = (rows, by, dir) => {
  const mul = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (by === 'colaborador') return a.colaborador.localeCompare(b.colaborador) * mul;
    return ((a[by] || 0) - (b[by] || 0)) * mul;
  });
};

// ==========================================
// 6. MANEJO DE FECHAS Y RANGOS (FALTABA ESTO)
// ==========================================
export const getRangeFromGroup = (modoActual, clave) => {
  if (modoActual === 'dia') {
    const desde = dayjs(`${clave}T00:00:00`); 
    return { desde, hasta: desde.add(1, 'day') };
  }
  if (modoActual === 'semana') {
    const [wkStr, yearStr] = clave.split('-');
    const year = Number(yearStr);
    const week = Number(wkStr);
    const desde = dayjs().year(year).isoWeek(week).startOf('week').hour(0).minute(0).second(0).millisecond(0);
    return { desde, hasta: desde.add(1, 'week') };
  }
  if (modoActual === 'mes') {
    const [mm, yyyy] = clave.split('-');
    const desde = dayjs(`${yyyy}-${mm}-01T00:00:00`);
    return { desde, hasta: desde.add(1, 'month') };
  }
  if (modoActual === 'anio') {
    const desde = dayjs(`${clave}-01-01T00:00:00`);
    return { desde, hasta: desde.add(1, 'year') };
  }
  return null;
};

// ==========================================
// 7. UTILIDADES CLIENTES (FALTABA ESTO)
// ==========================================
export const encontrarRepetidos = (data = []) => {
  const counts = {};
  const idCliMap = {};
  data.forEach(item => {
    const id = item.id_cli;
    counts[id] = (counts[id] || 0) + 1;
    if (!idCliMap[id]) idCliMap[id] = [];
    idCliMap[id].push(item);
  });
  const id_cli_rep = Object.entries(counts)
    .filter(([_, count]) => count > 1)
    .map(([id]) => Number(id));
  const items = id_cli_rep.flatMap(id => idCliMap[id]);
  return { cantidadRep: id_cli_rep.length, items, id_cli_rep };
};

// ==========================================
// 8. EXPORTACIÓN EXCEL
// ==========================================
export const handleExportServiciosExcelLogic = (dataNormalizada) => {
  if (!dataNormalizada || dataNormalizada.length === 0) return alert('No hay datos para exportar');
  
  const dataForExcel = dataNormalizada.map((row, index) => ({
    N: index + 1,
    FECHA: dayjs(row.fecha).format('DD/MM/YYYY'),
    COM: row.com,
    '#COMP': row.comp,
    'T-CLIENTE': row.t_cliente,
    CLIENTE: row.cliente,
    'TOTAL COMP': row.total_comp,
    CLASE: row.clase,
    'PRODUCTO / SERVICIO': row.producto_servicio,
    EMPLEADO: row.empleado,
    CANT: row.cant,
    'SUB TOTAL': row.sub_total,
    DESC: row.desc,
    TOTAL: row.total,
    'Efc - S/': row.efec_s,
    'Tipo Op. Elect': row.tipo_op,
    '#Oper': row.n_oper,
    'Op. Elect - S/': row.op_elect_s,
    'Recepción' : row.responsable_venta || "",
  }));

  const ws = XLSX.utils.json_to_sheet(dataForExcel);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Servicios');
  XLSX.writeFile(wb, `reporte_servicios_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`);
};
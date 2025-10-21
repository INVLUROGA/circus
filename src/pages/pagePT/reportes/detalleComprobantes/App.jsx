import { PageBreadcrumb } from '@/components';
import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles';
import { DateMaskString, FUNMoneyFormatter, NumberFormatMoney } from '@/components/CurrencyMask';
import { InputText } from '@/components/Form/InputText';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore';
import { useVentasStore } from '@/hooks/hookApi/useVentasStore';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import React, { useEffect, useMemo, useState } from 'react';
import { Col, Row, Modal, Button, Form, Badge } from 'react-bootstrap'; // <-- Badge agregado
import { normalizarVentasExcel } from './desestructurarData';
import { Dialog } from 'primereact/dialog';

dayjs.extend(isoWeek);

// Normaliza strings: minúsculas, sin acentos, espacios colapsados
const canon = (s='') =>
  s.toString()
   .trim()
   .toLowerCase()
   .normalize('NFD').replace(/\p{Diacritic}/gu, '')
   .replace(/\s+/g,' ');

// Reglas: agrega aquí sinónimos/variantes que quieras mapear a una etiqueta final
const RULES = [
  { to: 'TRANSFERENCIA', when: ['transf', 'transferencia', 'transferencias', 'transferencia bancaria', 'TRANSFERENCIA', 'bcp', 'interbank'] },
  { to: 'tarjeta',        when: ['tarjeta', "OPENPAY", 'tarjeta credito', 'tarjeta debito', 'visa', 'mastercard', 'amex', 'niubiz', 'culqi', 'mercado pago'] },
  { to: 'efectivo',       when: ['efectivo', 'cash'] },
  { to: 'yape',           when: ['yape'] },
  { to: 'plin',           when: ['plin'] },
  { to: 'deposito',       when: ['deposito', 'deposito bancario', 'abono'] },
  { to: 'openpay',        when: ['OPENPAY'] },
  // 👉 Añade más líneas como esta para nuevos métodos o sinónimos
];

// Devuelve la etiqueta final según las reglas; si no matchea, devuelve el texto base normalizado
const mapFormaPago = (texto) => {
  const c = canon(texto);
  for (const r of RULES) {
    if (r.when.some(w => c.includes(w))) return r.to;
  }
  return c || 'desconocido';
};

export const App = ({ id_empresa }) => {
  const { obtenerTablaVentas, dataVentas } = useVentasStore();
  const { obtenerParametroPorEntidadyGrupo: obtenerDataComprobantes, DataGeneral: dataComprobantes } = useTerminoStore();
  const { obtenerParametroPorEntidadyGrupo: obtenerDataCategorias, DataGeneral: dataCategorias } = useTerminoStore();

  useEffect(() => {
    obtenerTablaVentas(599);
    obtenerDataComprobantes('nueva-venta', 'comprobante');
    obtenerDataCategorias('producto', 'categoria')
  }, []);

  const [palabras, setPalabras] = useState([]);
  const [input, setInput] = useState('');
  const [modo, setModo] = useState('comprobante');

  // filtro en modal de servicios
  const [filtroServ, setFiltroServ] = useState('');

  // ---- Modal: estado ----
  const [showResumen, setShowResumen] = useState(false);
  const [modalLabel, setModalLabel] = useState('');

  // servicios
  const [serviciosRaw, setServiciosRaw] = useState([]); // guardamos los servicios crudos del grupo
  const [groupBy, setGroupBy] = useState('servicio-empleado'); // 'servicio-empleado' | 'servicio'

  // productos
  const [productosRaw, setProductosRaw] = useState([]);
  const [groupByProd, setGroupByProd] = useState('producto-empleado'); // 'producto-empleado' | 'producto'
  const [showResumenProd, setShowResumenProd] = useState(false);

  // ---- Sorting para ranking colaboradores (servicios y productos) ----
  const [sortServBy, setSortServBy] = useState('total');      // 'total' | 'promedio' | 'colaborador'
  const [sortServDir, setSortServDir] = useState('desc');     // 'asc' | 'desc'
  const [sortProdBy, setSortProdBy] = useState('total');
  const [sortProdDir, setSortProdDir] = useState('desc');

  // ==== NUEVO: Vista de comprobantes por rango ====
  const [showVista, setShowVista] = useState(false);
  const [vistaLabel, setVistaLabel] = useState('');
  const [ventasVista, setVentasVista] = useState([]);
  // debajo de: const [showResumen, setShowResumen] = useState(false);
const [ventasRangoServicios, setVentasRangoServicios] = useState([]);


  const toggleSort = (scope, by) => {
    if (scope === 'serv') {
      setSortServDir((prev) => (sortServBy === by ? (prev === 'asc' ? 'desc' : 'asc') : 'desc'));
      setSortServBy(by);
    } else {
      setSortProdDir((prev) => (sortProdBy === by ? (prev === 'asc' ? 'desc' : 'asc') : 'desc'));
      setSortProdBy(by);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && input.trim() !== '') {
      const nuevaPalabra = input.trim().toLowerCase();
      if (!palabras.includes(nuevaPalabra)) setPalabras((prev) => [...prev, nuevaPalabra]);
      setInput('');
    }
  };
  const eliminarPalabra = (idx) => setPalabras((prev) => prev.filter((_, i) => i !== idx));

  const normalizar = (texto) =>
    (texto || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const ventaCoincide = (venta) => {
    if (palabras.length === 0) return true;
    const textoVenta = [
      normalizar(venta.tb_cliente?.nombres_apellidos_cli),
      normalizar(venta.numero_transac),
      ...(venta.detalle_ventaservicios || []).map((s) =>
        normalizar(`${s.circus_servicio?.nombre_servicio} ${s.empleado_servicio?.nombres_apellidos_empl} ${s.tarifa_monto}`)
      ),
      ...(venta.detalle_ventaProductos || []).map((p) =>
        normalizar(`${p.tb_producto?.nombre_producto} ${p.empleado_producto?.nombres_apellidos_empl} ${p.cantidad} unidad ${p.tarifa_monto}`)
      ),
    ].join(' ');
    return palabras.every((palabra) => textoVenta.includes(palabra));
  };

  const ventasFiltradas = (dataVentas || []).filter(ventaCoincide);

  // ==== NUEVO: calcula el rango [desde, hasta) según el grupo clicado
  const getRangeFromGroup = (modoActual, clave) => {
    if (modoActual === 'dia') {
      const desde = dayjs.utc(`${clave}T00:00:00`); // Lima
      return { desde, hasta: desde.add(1, 'day') };
    }
    if (modoActual === 'semana') {
      const [wkStr, yearStr] = clave.split('-');
      const year = Number(yearStr);
      const week = Number(wkStr);
      // lunes ISO de esa semana
      const desde = dayjs.utc().year(year).isoWeek(week).startOf('week').hour(0).minute(0).second(0).millisecond(0);
      return { desde, hasta: desde.add(1, 'week') };
    }
    if (modoActual === 'mes') {
      const [mm, yyyy] = clave.split('-');
      const desde = dayjs.utc(`${yyyy}-${mm}-01T00:00:00`);
      return { desde, hasta: desde.add(1, 'month') };
    }
    if (modoActual === 'anio') {
      const desde = dayjs.utc(`${clave}-01-01T00:00:00`);
      return { desde, hasta: desde.add(1, 'year') };
    }
    return null;
  };

  const agruparPorModo = () => {
    const grupos = {};
    const clientePrimeraVenta = {};
    const ordenadas = [...ventasFiltradas].sort((a, b) => new Date(b.fecha_venta) - new Date(a.fecha_venta));

    for (const venta of ordenadas) {
      const fecha = dayjs.utc(venta.fecha_venta);
      let clave = '', label = '';
      switch (modo) {
        case 'dia':
          clave = fecha.format('YYYY-MM-DD'); label = fecha.format('dddd D [de] MMMM [del] YYYY'); break;
        case 'semana':
          clave = `${fecha.isoWeek()}-${fecha.year()}`; label = `Semana ${fecha.isoWeek()}, de ${fecha.format('MMMM [del] YYYY')}`; break;
        case 'mes':
          clave = fecha.format('MM-YYYY'); label = fecha.format('MMMM YYYY'); break;
        case 'anio':
          clave = fecha.format('YYYY'); label = fecha.format('YYYY'); break;
        default:
          break;
      }
      if (!grupos[clave]) {
        grupos[clave] = {
          clave,            // <-- NUEVO: guardamos la clave
          label,
          ventas: [],
          clientesVistos: new Set(),
          clientesNuevos: new Set(),
          clientesRecurrentes: new Set(),
        };
      }

      const nombreCliente = (venta.tb_cliente?.nombres_apellidos_cli || '').trim();
      const grupo = grupos[clave];
      grupo.ventas.push(venta);

      if (!clientePrimeraVenta[nombreCliente]) {
        clientePrimeraVenta[nombreCliente] = clave;
        grupo.clientesNuevos.add(nombreCliente);
      } else {
        if (clientePrimeraVenta[nombreCliente] === clave) grupo.clientesNuevos.add(nombreCliente);
        else grupo.clientesRecurrentes.add(nombreCliente);
      }
      grupo.clientesVistos.add(nombreCliente);
    }
    return Object.values(grupos);
  };

  const resumenes = ['comprobante'].includes(modo) ? [] : agruparPorModo();

  // ---- Helpers de modal ----
  const aggregateServicios = (servs = [], mode = 'servicio-empleado') => {
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

  const aggregateProductos = (prods = [], mode = 'producto-empleado') => {
    const map = new Map();
    for (const p of prods) {
      const producto = p?.tb_producto?.nombre_producto || '-';
      const empleado = p?.empleado_producto?.nombres_apellidos_empl || '-';
      const key = mode === 'producto' ? producto : `${producto}||${empleado}`;
      const cur = map.get(key) || { producto, empleado: mode === 'producto' ? '—' : empleado, cantidad: 0, total: 0 };
      cur.cantidad += 1; // líneas (cámbialo a Number(p?.cantidad||0) si quieres por unidades)
      cur.total += Number(p?.tarifa_monto || 0);
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  };

  // === Ranking por producto (quién vendió más por producto)
  const getTopVendedoresPorProducto = (prods = []) => {
    const byProd = new Map(); // producto -> Map(empleado -> stats)
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

  // === NUEVO: Ranking de colaboradores (monto, promedio, colaborador)
  const rankColaboradores = (items = [], getEmpleado, getImporte, getCantidad = () => 1) => {
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

  const sortRows = (rows, by, dir) => {
    const mul = dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (by === 'colaborador') return a.colaborador.localeCompare(b.colaborador) * mul;
      return ((a[by] || 0) - (b[by] || 0)) * mul;
    });
  };

  // === NUEVO: Vista de comprobantes (filtra por rango real del grupo clicado)
  const abrirVista = (grupo) => {
    const rango = getRangeFromGroup(modo, grupo?.clave);
    if (!rango) return;

    const ventasRango = (dataVentas || []).filter((v) => {
      const f = dayjs.utc(v.fecha_venta);
      return f.valueOf() >= rango.desde.valueOf() && f.valueOf() < rango.hasta.valueOf();
    });

    setVentasVista(ventasRango.sort((a, b) =>  dayjs.utc(b.fecha_venta).valueOf() - dayjs.utc(a.fecha_venta).valueOf()));
    setVistaLabel(grupo?.label || '');
    setShowVista(true);
  };

  const abrirResumenServicios = (grupo) => {
  // Usa el rango real para evitar “todas las ventas”
  const rango = getRangeFromGroup(modo, grupo?.clave);
  if (!rango) return;

  const ventasRango = (dataVentas || []).filter((v) => {
    const f = dayjs.utc(v.fecha_venta);
    return f.valueOf() >= rango.desde.valueOf() && f.valueOf() < rango.hasta.valueOf();
  });

  const servicios = ventasRango.flatMap((v) => v.detalle_ventaservicios || []);

  setVentasRangoServicios(ventasRango); // <-- NUEVO: guardamos las ventas del rango
  setServiciosRaw(servicios);
  setModalLabel(grupo.label);
  setShowResumen(true);
  };

  const abrirResumenProductos = (grupo) => {
    // Usa el rango real para evitar “todas las ventas”
    const rango = getRangeFromGroup(modo, grupo?.clave);
    const productos = (dataVentas || [])
      .filter((v) => {
        const f = dayjs.utc(v.fecha_venta);
        return rango && f.valueOf() >= rango.desde.valueOf() && f.valueOf() < rango.hasta.valueOf();
      })
      .flatMap((v) => v.detalle_ventaProductos || []);
    setProductosRaw(productos);
    setModalLabel(grupo.label);
    setShowResumenProd(true);
  };

  // ---- Derivados del modal (servicios) ----
  const cantidadServicios = serviciosRaw.length;
  const totalServicios = serviciosRaw.reduce((s, x) => s + Number(x?.tarifa_monto || 0), 0);
  const itemsResumen = aggregateServicios(serviciosRaw, groupBy);

  // ---- Derivados ranking colaboradores ----
  const rankingServBase = useMemo(
    () => rankColaboradores(
      serviciosRaw,
      (s) => s?.empleado_servicio?.nombres_apellidos_empl,
      (s) => s?.tarifa_monto,
      () => 1
    ),
    [serviciosRaw]
  );
  const rankingProdBase = useMemo(
    () => rankColaboradores(
      productosRaw,
      (p) => p?.empleado_producto?.nombres_apellidos_empl,
      (p) => p?.tarifa_monto,
      () => 1 // cámbialo a: (p) => Number(p?.cantidad||0) si quieres promedio por unidad
    ),
    [productosRaw]
  );

  const rankingServ = useMemo(() => sortRows(rankingServBase, sortServBy, sortServDir), [rankingServBase, sortServBy, sortServDir]);
  const rankingProd = useMemo(() => sortRows(rankingProdBase, sortProdBy, sortProdDir), [rankingProdBase, sortProdBy, sortProdDir]);
  
  const agruparPagos = (ventas = []) => {
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

  const agruparServiciosPorEmpleado = (lista = []) => {
    const map = new Map();

    for (const s of lista) {
      const id = s?.id_empl ?? s?.empleado_servicio?.id ?? "sin_asignar";
      const empleado = s?.empleado_servicio?.nombres_apellidos_empl || "Sin asignar";

      if (!map.has(id)) {
        map.set(id, { id_empl: id, empleado, items: [], total: 0 });
      }
      const g = map.get(id);
      g.items.push(s);
      g.total += Number(s?.tarifa_monto ?? 0);
    }

    return Array.from(map.values());
  };

  return (
    <>
      <PageBreadcrumb title="DETALLE DE COMPROBANTES" subName="Ventas" />
      <Row className="d-flex justify-content-center">
        <Col lg={2} style={{ position: 'sticky', left: '0', top: 140, height: '300px', width: '400px' }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <Row>
              <Col lg={12}>
                <div>
                  <InputText
                    type="text"
                    className="form-control"
                    width='300px'
                    placeholder="BUSCADOR"
                    value={input}
                    style={{ fontWeight: 'bold', fontSize: '400px' }}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <div className="mt-2 d-flex flex-wrap">
                    {palabras.map((palabra, idx) => (
                      <span
                        key={idx}
                        className="badge bg-primary text-light me-2 mb-2"
                        style={{ paddingRight: '0.6em', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}
                      >
                        {palabra}
                        <button
                          type="button"
                          className="btn-close btn-close-white btn-sm ms-2"
                          onClick={() => eliminarPalabra(idx)}
                          style={{ fontSize: '0.6rem', fontWeight: 'bold' }}
                        />
                      </span>
                    ))}
                  </div>
                </div>
              </Col>
              <Col lg={12}>
                <div style={{ width: '340px' }}>
                  <select className="form-select fs-3" style={{ fontWeight: 'bold' }} value={modo} onChange={(e) => setModo(e.target.value)}>
                    <option value="comprobante">Por comprobante</option>
                    <option value="dia">Por día</option>
                    <option value="semana">Por semana</option>
                    <option value="mes">Por mes</option>
                    <option value="anio">Por año</option>
                  </select>
                </div>
              </Col>
            </Row>
          </div>
        </Col>

        <Col lg={10} className="" style={{ width: '750px' }}>
          {modo === 'comprobante' ? (
            ventasFiltradas.length > 0 ? (
              ventasFiltradas.map((venta) => {
                const sumaMontoProductos = (venta.detalle_ventaProductos || []).reduce((total, item) => total + (item?.tarifa_monto || 0), 0);
                const serviciosPeluqueria = (venta.detalle_ventaservicios || []).filter(vserv=>vserv?.circus_servicio?.id_categoria!==1478)
                const serviciosManicure = (venta.detalle_ventaservicios || []).filter(vserv=>vserv?.circus_servicio?.id_categoria===1478)
                const gruposPorEmpleadoPeluqueria = agruparServiciosPorEmpleado(serviciosPeluqueria || []);
                const gruposPorEmpleadoManicure = agruparServiciosPorEmpleado(serviciosManicure || []);
                const sumaMontoServicios = (serviciosPeluqueria || []).reduce((total, item) => total + (item?.tarifa_monto || 0), 0);
                const sumaMontoServiciosManicure = (serviciosManicure || []).reduce((total, item) => total + (item?.tarifa_monto || 0), 0);
                return (
                  <div className="border border-primary border-4" style={{marginBottom: '100px'}} key={venta.id}>
                    <div className="card-body fs-3">
                      <h1 className="text-center fw-bold mb-3">
                        {(venta.tb_cliente?.nombres_apellidos_cli || '').trim()}
                      </h1>
                      <div className="d-flex justify-content-between">
                        <div className="" style={{ width: '100%' }}>
                          <span className="text-primary">{DateMaskString(venta.fecha_venta, 'dddd DD [DE] MMMM')}</span> {DateMaskString(venta.fecha_venta, 'YYYY')}
                        </div>
                        <div className="ml-4" style={{ width: '100%' }}>
                          <strong>HORA: </strong>{DateMaskString(venta.fecha_venta, 'hh:mm A')}
                        </div>
                      </div>

                      <div className="d-flex justify-content-between mb-3 align-items-center">
                        <div className="text-primary" style={{ width: '100%', fontSize: '25px' }}>
                          <strong>{(dataComprobantes || []).find((c) => c.value === venta.id_tipoFactura)?.label} {venta.numero_transac? ':':'CANJE'}</strong> {venta.numero_transac}
                        </div>
                        <div className="text-primary ml-4" style={{ width: '100%', fontSize: '34px' }}>
                          <strong>TOTAL: </strong>
                          <SymbolSoles size={20} bottomClasss={'8'} numero={<NumberFormatMoney amount={sumaMontoServicios + sumaMontoServiciosManicure + sumaMontoProductos} />} />
                        </div>
                      </div>

                      <div>
                        {(venta?.detalleVenta_pagoVenta || []).map((e, i) => (
                          <div key={i} className="timeline-item-info border border-4 p-2 border-gray">
                            <span className="mb-1 d-block fs-3">
                              <span>
                                <span className="fw-light">FORMA DE PAGO: </span>{e.parametro_forma_pago?.label_param}<br />
                              </span>
                              {e.parametro_tarjeta ? (<><span className="fw-light">TARJETA: </span>{e.parametro_tarjeta.label_param} <br/></>) : null}
                              {e.parametro_tipo_tarjeta ? (<><span className="fw-light">TIPO DE TARJETA:</span> {e.parametro_tipo_tarjeta.label_param}</>) : null}
                            </span>
                            <>
                              <span className="fw-light fs-3">IMPORTE: </span>
                              <span className="fw-bold text-primary">
                                <SymbolSoles
                                  isbottom
                                  bottomClasss={'10'}
                                  size={20}
                                  numero={FUNMoneyFormatter(e.parcial_monto, e.parametro_forma_pago?.id_param == 535 ? '$' : 'S/.')}
                                />
                              </span>
                            </>
                          </div>
                        ))}
                      </div>

                      { (serviciosPeluqueria || []).length===0 ? null : (
                        <div>
                          <h3 className="fw-bold text-primary" style={{fontSize: '34px'}}>
                            Servicios peluqueria: 
                            <span className="ml-2 text-black" >{serviciosPeluqueria.length}</span>
                          </h3>
                          <h3 className="fw-bold text-manicure " style={{fontSize: '34px'}}>
                            Servicios MANICURE: 
                            <span className="ml-2 text-black">{serviciosManicure.length}</span>
                          </h3>
                          <div>
                            <ul className="list-group">
                              {gruposPorEmpleadoPeluqueria.map((g) => (
                                <li key={g.id_empl} className="list-group-item p-0">
                                  <div className={`d-flex justify-content-between align-items-center ${(g.empleado || "-").split(" ")[0] ==='TIBISAY'?'bg-manicure':'bg-primary'}  text-white px-2 py-1`}>
                                    <strong>{(g.empleado || "-").split(" ")[0]}</strong>
                                    <div className="text-end">
                                      <SymbolSoles size={16} bottomClasss={"4"} numero={<NumberFormatMoney amount={g.total} />} />
                                    </div>
                                  </div>

                                  <ul className="list-group list-group-flush">
                                    {g.items.map((s, i) => (
                                      <li key={`${g.id_empl}-${i}`} className={`list-group-item m-0 p-0 ${s?.circus_servicio?.id_categoria===1478?'':''}`}>
                                        <div className="d-flex flex-row justify-content-between">
                                          <div className={`${s?.circus_servicio?.id_categoria===1478?'text-manicure':'text-primary'}  mx-1`} style={{ width: "100%", fontSize: "16px" }}>
                                            {(dataCategorias.find(c => c.value == s?.circus_servicio?.id_categoria)?.label ?? "-")}
                                            {" / "}
                                            {s?.circus_servicio?.nombre_servicio ?? "-"}
                                          </div>
                                          <div className="text-end mx-1" style={{ width: "150px" }}>
                                            <SymbolSoles size={20} bottomClasss={"8"} numero={<NumberFormatMoney amount={s?.tarifa_monto} />} />
                                          </div>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <ul className="list-group">
                            <li className="list-group-item px-0 bg-primary text-white">
                              <div className="d-flex flex-row justify-content-between">
                                <div className="mx-1" style={{ width: '100%', fontSize: '34px' }}>PELUQUERIA TOTAL:</div>
                                <div className="text-end mx-2" style={{ width: '150px', fontSize: '34px' }}>
                                  <SymbolSoles size={20} bottomClasss={'8'} numero={<NumberFormatMoney amount={sumaMontoServicios} />} />
                                </div>
                              </div>
                            </li>
                          </ul>
                        </div>
                      )}

                      { (serviciosManicure || []).length===0 ? null : (
                        <div>
                          <div>
                            <ul className="list-group">
                              {gruposPorEmpleadoManicure.map((g) => (
                                <li key={g.id_empl} className="list-group-item p-0">
                                  <div className={`d-flex justify-content-between align-items-center bg-manicure text-white px-2 py-1`}>
                                    <strong>{(g.empleado || "-").split(" ")[0]}</strong>
                                    <div className="text-end">
                                      <SymbolSoles size={16} bottomClasss={"4"} numero={<NumberFormatMoney amount={g.total} />} />
                                    </div>
                                  </div>

                                  <ul className="list-group list-group-flush">
                                    {g.items.map((s, i) => (
                                      <li key={`${g.id_empl}-${i}`} className={`list-group-item m-0 p-0 ${s?.circus_servicio?.id_categoria===1478?'':''}`}>
                                        <div className="d-flex flex-row justify-content-between">
                                          <div className={`${s?.circus_servicio?.id_categoria===1478?'text-manicure':'text-primary'}  mx-1`} style={{ width: "100%", fontSize: "16px" }}>
                                            {(dataCategorias.find(c => c.value == s?.circus_servicio?.id_categoria)?.label ?? "-")}
                                            {" / "}
                                            {s?.circus_servicio?.nombre_servicio ?? "-"}
                                          </div>
                                          <div className="text-end mx-1" style={{ width: "150px" }}>
                                            <SymbolSoles size={20} bottomClasss={"8"} numero={<NumberFormatMoney amount={s?.tarifa_monto} />} />
                                          </div>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <ul className="list-group">
                            <li className="list-group-item px-0 bg-manicure text-white">
                              <div className="d-flex flex-row justify-content-between">
                                <div className="mx-1" style={{ width: '100%', fontSize: '34px' }}>MANICURE TOTAL:</div>
                                <div className="text-end mx-1" style={{ width: '150px', fontSize: '34px' }}>
                                  <SymbolSoles size={20} bottomClasss={'8'} numero={<NumberFormatMoney amount={sumaMontoServiciosManicure} />} />
                                </div>
                              </div>
                            </li>
                          </ul>
                        </div>
                      )}

                      {(venta.detalle_ventaProductos || []).length===0 ? null : (
                        <div className="mt-5">
                          <h3 className="fw-bold">PRODUCTOS cantidad: <span className="" style={{ fontSize: '27px' }}>{(venta.detalle_ventaProductos || []).length}</span></h3>
                          <ul className="list-group">
                            {(venta.detalle_ventaProductos || []).map((s, i) => (
                              <li key={i} className="list-group-item">
                                <div className="d-flex flex-row align-items-center">
                                  <Badge bg="info" className="me-2">PRODUCTO</Badge>
                                  <div className="text-primary mx-1" style={{ width: '200px', fontSize: '25px' }}>
                                    {(s.empleado_producto?.nombres_apellidos_empl || '-').split(' ')[0]}
                                  </div>
                                  <div className="text-end mx-1" style={{ width: '150px' }}>
                                    <SymbolSoles size={20} bottomClasss={'8'} numero={<NumberFormatMoney amount={s.tarifa_monto} />} /> 
                                  </div>
                                  <div className="text-end mx-1" style={{ width: 'auto' }}>
                                    {s.tb_producto?.nombre_producto} - {s.cantidad} unidad
                                  </div>
                                </div>
                              </li>
                            ))}
                            <li className="list-group-item" style={{ backgroundColor: '#F8F8FA' }}>
                              <div className="d-flex flex-row">
                                <div className="mx-1" style={{ width: '200px', fontSize: '25px' }}>TOTAL VENTA:</div>
                                <div className="text-end mx-1 align-content-center" style={{ width: '150px', fontSize: '27px' }}>
                                  <SymbolSoles size={20} bottomClasss={'8'} numero={<NumberFormatMoney amount={sumaMontoProductos} />} />
                                </div>
                              </div>
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="alert alert-warning">No se encontraron resultados.</div>
            )
          ) : (
            // -------- VISTA RESUMEN (agrupado por día/semana/mes/año) --------
            resumenes.map((grupo, idx) => {
              const servicios = grupo.ventas.flatMap((v) => v.detalle_ventaservicios || []);
              const productos = grupo.ventas.flatMap((v) => v.detalle_ventaProductos || []);
              const totalServiciosImporte = servicios.reduce((sum, s) => sum + Number(s?.tarifa_monto || 0), 0);
              const totalProductosImporte = productos.reduce((sum, p) => sum + Number(p?.tarifa_monto || 0), 0);
              const total = totalServiciosImporte + totalProductosImporte;

              return (
                <div key={idx} className="card mb-4 shadow">
                  <div className="card-body">
                    <h1 className="text-center fw-bold mb-4 text-uppercase text-primary">{grupo.label}</h1>
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item h2">
                        <div className="d-flex justify-content-between" style={{ fontSize: '37px' }}>
                          <span>TOTAL Clientes:</span>
                          <span className="text-end">{grupo.clientesVistos.size}</span>
                        </div>
                      </li>

                      {/* <<< NUEVO: abre Vista general (comprobantes del rango) */}
                      <li
                        className="list-group-item h2"
                        style={{ backgroundColor: '#F8F8FA', cursor: 'pointer' }}
                        title="Ver comprobantes del rango"
                        onClick={() => abrirVista(grupo)}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="fw-bold">COMPROBANTES VÁLIDOS (click):</span>
                          <span className="text-end fs-1">{grupo.ventas.length}</span>
                        </div>
                      </li>

                      <li className="list-group-item h2">
                        <div className="d-flex justify-content-between">
                          <span>Total vendido: </span>
                          <span className="text-end fs-1">
                            <SymbolSoles size={25} bottomClasss={'20'} numero={<NumberFormatMoney amount={total} />} />
                          </span>
                        </div>
                      </li>

                      {/* CLICK abre modal de servicios */}
                      <li
                        className="list-group-item h2"
                        title="Ver vista resumen de servicios"
                        style={{ cursor: 'pointer' }}
                        onClick={() => abrirResumenServicios(grupo)}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <span>CANTIDAD DE Servicios:</span>
                          <div className="text-end">
                            <div className="fs-1">{servicios.length}</div>
                          </div>
                        </div>
                      </li>
                      <li className="list-group-item h2">
                        <div className="d-flex justify-content-between">
                          <span className="fw-bold">VENTA DE SERVICIOS:</span>
                          <span className="text-end fs-1">
                              <SymbolSoles size={25} bottomClasss={'20'} numero={<NumberFormatMoney amount={totalServiciosImporte} />} />
                          </span>
                        </div>
                      </li>

                      {/* CLICK abre modal de productos */}
                      <li
                        className="list-group-item h2"
                        style={{ backgroundColor: '#F8F8FA', cursor: 'pointer' }}
                        title="Ver vista resumen de productos"
                        onClick={() => abrirResumenProductos(grupo)}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <span>CANTIDAD DE PRODUCTOS:</span>
                          <div className="text-end">
                            <div className="fs-1">{productos.length}</div>
                          </div>
                        </div>
                      </li>
                      
                      <li className="list-group-item h2">
                        <div className="d-flex justify-content-between">
                          <span className="fw-bold">VENTA DE PRODUCTOS:</span>
                          <span className="text-end fs-1">
                              <SymbolSoles size={25} bottomClasss={'20'} numero={<NumberFormatMoney amount={totalProductosImporte} />} />
                          </span>
                        </div>
                      </li>

                      <li className="list-group-item h2">
                        <div className="d-flex justify-content-between">
                          <span className="fw-bold">COMPROBANTES VALIDOS:</span>
                          <span className="text-end fs-1">{grupo.ventas.length}</span>
                        </div>
                      </li>

                      <li className="list-group-item h2" style={{ backgroundColor: '#F8F8FA' }}>
                        <div className="d-flex justify-content-between">
                          <span className="text-primary">Clientes nuevos:</span>
                          <span className="text-end fs-1">{grupo.clientesNuevos.size}</span>
                        </div>
                      </li>

                      <li className="list-group-item h2">
                        <div className="d-flex justify-content-between">
                          <span className="text-primary">Clientes recurrentes:</span>
                          <span className="fs-1">{grupo.clientesRecurrentes.size}</span>
                        </div>
                      </li>

                      <li className="list-group-item h2" style={{ backgroundColor: '#F8F8FA' }}>
                        <div className="d-flex justify-content-between">
                          <span className="text-primary">Clientes por recurrencia en el mes:</span>
                          <span className="fs-1">{encontrarRepetidos(grupo.ventas).cantidadRep}</span>
                        </div>
                      </li>
                      
                      {agruparPagos(grupo?.ventas).resumenSoloSuma.map((formas, i) => (
                        <li key={formas.forma_pago + i} className="list-group-item h2" style={{ backgroundColor: '#F8F8FA' }}>
                          <div className="d-flex justify-content-between">
                            <span>{formas.forma_pago} </span>
                            <span className="text-end fs-1">
                              <SymbolSoles size={25} bottomClasss={'20'} numero={<NumberFormatMoney amount={formas.suma_total_parcial} />} />
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })
          )}
        </Col>

        {/* -------- MODAL: VISTA (COMPROBANTES POR RANGO) -------- */}
        <Modal show={showVista} onHide={() => setShowVista(false)} size="xl" centered scrollable>
          <Modal.Header closeButton>
            <Modal.Title>Comprobantes — {vistaLabel}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {ventasVista.length === 0 ? (
              <div className="text-center py-4">No hay ventas en el rango.</div>
            ) : (
              ventasVista.map((venta) => {
                const servicios = venta.detalle_ventaservicios || [];
                const productos = venta.detalle_ventaProductos || [];
                const total = [...servicios, ...productos].reduce((s, x) => s + Number(x?.tarifa_monto || 0), 0);

                return (
                  <div className="card mb-3" key={venta.id}>
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="fw-bold">
                          {(venta.tb_cliente?.nombres_apellidos_cli || '').trim()} &nbsp;
                          <small className="text-muted">({DateMaskString(venta.fecha_venta, 'DD/MM/YYYY hh:mm A')})</small>
                        </div>
                        <div className="text-primary">
                          <SymbolSoles size={18} bottomClasss={'6'} numero={<NumberFormatMoney amount={total} />} />
                        </div>
                      </div>

                      <ul className="list-group list-group-flush">
                        {servicios.map((s, i) => (
                          <li key={'s'+i} className="list-group-item d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center gap-2">
                              <Badge bg="success">SERVICIO</Badge>
                              <span>{s.circus_servicio?.nombre_servicio}</span>
                              <small className="text-muted">— {(s.empleado_servicio?.nombres_apellidos_empl || '-').split(' ')[0]}</small>
                            </div>
                            <div>
                              <SymbolSoles size={16} bottomClasss={'6'} numero={<NumberFormatMoney amount={s.tarifa_monto} />} />
                            </div>
                          </li>
                        ))}
                        {productos.map((p, i) => (
                          <li key={'p'+i} className="list-group-item d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center gap-2">
                              <Badge bg="info">PRODUCTO</Badge>
                              <span>{p.tb_producto?.nombre_producto}</span>
                              <small className="text-muted">x{p.cantidad} — {(p.empleado_producto?.nombres_apellidos_empl || '-').split(' ')[0]}</small>
                            </div>
                            <div>
                              <SymbolSoles size={16} bottomClasss={'6'} numero={<NumberFormatMoney amount={p.tarifa_monto} />} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowVista(false)}>Cerrar</Button>
          </Modal.Footer>
        </Modal>

        {/* -------- MODAL: VISTA RESUMEN DETALLE DE SERVICIOS -------- */}
        <Dialog header={`Resumen de servicios — ${modalLabel}`} visible={showResumen} onHide={() => setShowResumen(false)} style={{width: '120rem'}} centered scrollable>
          <Modal.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="h4 m-0">Total servicios: <strong>{cantidadServicios}</strong></div>
              <div className="h4 m-0">
                Total vendido:{' '}
                <strong>
                  <SymbolSoles size={20} bottomClasss={'8'} numero={<NumberFormatMoney amount={totalServicios} />} />
                </strong>
              </div>
            </div>

            {/* CHAT GPT, PONER LA TABLA AQUI, CON EL FILTRO NECESARIO */}
            <div className="table-responsive">
              <table className="table table-bordered table-sm">
                <thead className="table-light">
                  <tr>
                    <th></th>
                    <th><div className='' style={{width: '100px'}}>FECHA</div></th>
                    <th>COM</th><th>#COMP</th>
                    <th>T-CLIENTE</th>
                    <th>CLIENTE</th>
                    <th>TOTAL COMP</th><th>CLASE</th>
                    <th>PRODUCTO / SERVICIO</th><th>EMPLEADO</th>
                    <th>CANT</th><th>SUB TOTAL</th><th>DESC</th><th>TOTAL</th>
                    <th>Efc - S/</th><th>Tipo Op. Elect</th><th>#Oper</th><th>Op. Elect - S/</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizarVentasExcel(ventasRangoServicios).map((row, i) => (
  <tr key={i}>
    <td>
      {i+1}
    </td>
    <td>
      {dayjs.utc(row.fecha).format("dddd DD [DE] MMMM [DEL] YYYY")}
    </td>
    <td>{row.com}</td>
    <td>{row.comp}</td>
    <td>{row.t_cliente}</td>
    <td>{row.cliente}</td>
    <td className="text-end">{row.total_comp}</td>
    <td>{row.clase}</td>
    <td>{row.producto_servicio}</td>
    <td>{row.empleado}</td>
    <td className="text-end">{row.cant}</td>
    <td className="text-end">{row.sub_total}</td>
    <td className="text-end">{row.desc}</td>
    <td className="text-end">{row.total}</td>
    <td className="text-end">{row.efec_s}</td>
    <td>{row.tipo_op}</td>
    <td>{row.n_oper}</td>
    <td className="text-end">{row.op_elect_s}</td>
  </tr>
))}
                </tbody>
              </table>
            </div>

            {/* ====== Tabla 1: Servicios agregados ====== */}
            <div className="table-responsive mb-4">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Servicio</th>
                    <th>Colaborador</th>
                    <th className="text-end">Cantidad</th>
                    <th className="text-end">Total</th>
                    <th className="text-end">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregateServicios(serviciosRaw, groupBy)
                    .filter((it) => {
                      const q = (filtroServ || '').trim().toLowerCase();
                      if (!q) return true;
                      return (
                        (it.servicio || '').toLowerCase().includes(q) ||
                        (it.empleado || '').toLowerCase().includes(q)
                      );
                    })
                    .map((it, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{it.servicio}</td>
                        <td>{it.empleado}</td>
                        <td className="text-end">{it.cantidad}</td>
                        <td className="text-end">
                          <SymbolSoles size={16} bottomClasss={'6'} numero={<NumberFormatMoney amount={it.total} />} />
                        </td>
                        <td className="text-end">
                          <SymbolSoles size={16} bottomClasss={'6'} numero={<NumberFormatMoney amount={it.total / (it.cantidad || 1)} />} />
                        </td>
                      </tr>
                    ))}
                  {serviciosRaw.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-4">Sin servicios en el rango.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ====== Ranking de colaboradores (SERVICIOS) ====== */}
            <h5 className="fw-bold d-flex align-items-center justify-content-between">
              Ranking de colaboradores (Servicios)
              <div className="btn-group btn-group-sm">
                <Button variant={sortServBy==='total' ? 'primary' : 'outline-primary'} onClick={() => toggleSort('serv','total')}>Monto</Button>
                <Button variant={sortServBy==='promedio' ? 'primary' : 'outline-primary'} onClick={() => toggleSort('serv','promedio')}>Promedio</Button>
                <Button variant={sortServBy==='colaborador' ? 'primary' : 'outline-primary'} onClick={() => toggleSort('serv','colaborador')}>Colaborador</Button>
                <Button variant="outline-secondary" onClick={() => setSortServDir(d => d==='asc' ? 'desc' : 'asc')}>
                  {sortServDir === 'asc' ? 'ASC ↑' : 'DESC ↓'}
                </Button>
              </div>
            </h5>

            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Colaborador</th>
                    <th className="text-end">Monto</th>
                    <th className="text-end">Cantidad</th>
                    <th className="text-end">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingServ
                    .filter(r => {
                      const q = (filtroServ || '').trim().toLowerCase();
                      if (!q) return true;
                      return (r.colaborador || '').toLowerCase().includes(q);
                    })
                    .map((r, i) => (
                      <tr key={r.colaborador + i}>
                        <td>{i + 1}</td>
                        <td>{r.colaborador}</td>
                        <td className="text-end">
                          <SymbolSoles size={16} bottomClasss={'6'} numero={<NumberFormatMoney amount={r.total} />} />
                        </td>
                        <td className="text-end">{r.cantidad}</td>
                        <td className="text-end">
                          <SymbolSoles size={16} bottomClasss={'6'} numero={<NumberFormatMoney amount={r.promedio} />} />
                        </td>
                      </tr>
                  ))}
                  {rankingServ.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-4">Sin datos.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowResumen(false)}>Cerrar</Button>
          </Modal.Footer>
        </Dialog>

        {/* -------- MODAL: VISTA RESUMEN DETALLE DE PRODUCTOS -------- */}
        <Modal show={showResumenProd} onHide={() => setShowResumenProd(false)} size="xl" centered scrollable>
          <Modal.Header closeButton>
            <Modal.Title>Resumen de productos — {modalLabel}</Modal.Title>
            <div className="ms-auto d-flex align-items-center">
              <Form.Check
                type="switch"
                id="switch-agrupacion-prod"
                label={groupByProd === 'producto' ? 'Agrupar: Producto' : 'Agrupar: Producto + Colaborador'}
                checked={groupByProd === 'producto'}
                onChange={(e) => setGroupByProd(e.target.checked ? 'producto' : 'producto-empleado')}
              />
            </div>
          </Modal.Header>

          <Modal.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="h4 m-0">Total productos: <strong>{productosRaw.length}</strong></div>
              <div className="h4 m-0">
                Total vendido:{' '}
                <strong>
                  <SymbolSoles
                    size={20}
                    bottomClasss={'8'}
                    numero={<NumberFormatMoney amount={productosRaw.reduce((s, x) => s + Number(x?.tarifa_monto || 0), 0)} />}
                  />
                </strong>
              </div>
            </div>

            {/* Tabla 1: Productos agregados */}
            <div className="table-responsive mb-4">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Producto</th>
                    <th>Colaborador</th>
                    <th className="text-end">Cantidad</th>
                    <th className="text-end">Total</th>
                    <th className="text-end">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregateProductos(productosRaw, groupByProd).map((it, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{it.producto}</td>
                      <td>{it.empleado}</td>
                      <td className="text-end">{it.cantidad}</td>
                      <td className="text-end">
                        <SymbolSoles size={16} bottomClasss={'6'} numero={<NumberFormatMoney amount={it.total} />} />
                      </td>
                      <td className="text-end">
                        <SymbolSoles size={16} bottomClasss={'6'} numero={<NumberFormatMoney amount={it.total / it.cantidad} />} />
                      </td>
                    </tr>
                  ))}
                  {productosRaw.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-4">Sin productos en el rango.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Tabla 2 — Top vendedor por producto */}
            <h5 className="fw-bold">Top vendedor por producto</h5>
            <div className="table-responsive mb-4">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Producto</th>
                    <th>Top vendedor (por importe)</th>
                    <th className="text-end">Importe del top</th>
                    <th className="text-end">Unidades del top</th>
                    <th className="text-end">% del producto</th>
                  </tr>
                </thead>
                <tbody>
                  {getTopVendedoresPorProducto(productosRaw).map((row, i) => {
                    const pct = row.totalImporte > 0 ? (row.top.importe / row.totalImporte) * 100 : 0;
                    return (
                      <tr key={row.producto + i}>
                        <td>{i + 1}</td>
                        <td>{row.producto}</td>
                        <td>{row.top.empleado}</td>
                        <td className="text-end">
                          <SymbolSoles size={16} bottomClasss={'6'} numero={<NumberFormatMoney amount={row.top.importe} />} />
                        </td>
                        <td className="text-end">{row.top.unidades}</td>
                        <td className="text-end">{pct.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                  {productosRaw.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-4">Sin datos para ranking.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* === NUEVO: Ranking de Colaborador (PRODUCTOS) con botones de orden === */}
            <h5 className="fw-bold d-flex align-items-center justify-content-between">
              Ranking de colaboradores (Productos)
              <div className="btn-group btn-group-sm">
                <Button variant={sortProdBy==='total' ? 'primary' : 'outline-primary'} onClick={() => toggleSort('prod','total')}>Monto</Button>
                <Button variant={sortProdBy==='promedio' ? 'primary' : 'outline-primary'} onClick={() => toggleSort('prod','promedio')}>Promedio</Button>
                <Button variant={sortProdBy==='colaborador' ? 'primary' : 'outline-primary'} onClick={() => toggleSort('prod','colaborador')}>Colaborador</Button>
                <Button variant="outline-secondary" onClick={() => setSortProdDir(d => d==='asc' ? 'desc' : 'asc')}>
                  {sortProdDir === 'asc' ? 'ASC ↑' : 'DESC ↓'}
                </Button>
              </div>
            </h5>
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Colaborador</th>
                    <th className="text-end">Monto</th>
                    <th className="text-end">Cantidad</th>
                    <th className="text-end">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingProd.map((r, i) => (
                    <tr key={r.colaborador + i}>
                      <td>{i + 1}</td>
                      <td>{r.colaborador}</td>
                      <td className="text-end">
                        <SymbolSoles size={16} bottomClasss={'6'} numero={<NumberFormatMoney amount={r.total} />} />
                      </td>
                      <td className="text-end">{r.cantidad}</td>
                      <td className="text-end">
                        <SymbolSoles size={16} bottomClasss={'6'} numero={<NumberFormatMoney amount={r.promedio} />} />
                      </td>
                    </tr>
                  ))}
                  {rankingProd.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-4">Sin datos.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowResumenProd(false)}>Cerrar</Button>
          </Modal.Footer>
        </Modal>
      </Row>
    </>
  );
};

// ---- Util para recurrencia de clientes ----
const encontrarRepetidos = (data = []) => {
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

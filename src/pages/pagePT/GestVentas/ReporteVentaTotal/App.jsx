import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles';
import { DateMaskString, FUNMoneyFormatter, NumberFormatMoney } from '@/components/CurrencyMask';
import { InputText } from '@/components/Form/InputText';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore';
import { useVentasStore } from '@/hooks/hookApi/useVentasStore';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import React, { useEffect, useMemo, useState } from 'react';
import { Col, Row, Modal, Button, Form } from 'react-bootstrap';

dayjs.extend(isoWeek);

export const App = ({ id_empresa }) => {
  const { obtenerTablaVentas, dataVentas } = useVentasStore();
  const { obtenerParametroPorEntidadyGrupo: obtenerDataComprobantes, DataGeneral: dataComprobantes } = useTerminoStore();

  useEffect(() => {
    obtenerTablaVentas(id_empresa);
    obtenerDataComprobantes('nueva-venta', 'comprobante');
  }, [id_empresa]);

  const [palabras, setPalabras] = useState([]);
  const [input, setInput] = useState('');
  const [modo, setModo] = useState('comprobante');

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

  const agruparPorModo = () => {
    const grupos = {};
    const clientePrimeraVenta = {};
    const ordenadas = [...ventasFiltradas].sort((a, b) => new Date(b.fecha_venta) - new Date(a.fecha_venta));

    for (const venta of ordenadas) {
      const fecha = dayjs(venta.fecha_venta).subtract(5, 'hour');
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

  const abrirResumenServicios = (grupo) => {
    const servicios = grupo.ventas.flatMap((v) => v.detalle_ventaservicios || []);
    setServiciosRaw(servicios);
    setModalLabel(grupo.label);
    setShowResumen(true);
  };

  const abrirResumenProductos = (grupo) => {
    const productos = grupo.ventas.flatMap((v) => v.detalle_ventaProductos || []);
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

  return (
    <Row className="d-flex justify-content-center">
      <Col lg={2} style={{ position: 'sticky', left: '0', top: 140, height: '200px' }} className=" p-3">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <Row>
            <Col lg={12}>
              <div>
                <InputText
                  type="text"
                  className="form-control"
                  placeholder="BUSCADOR"
                  value={input}
                  style={{ fontWeight: 'bold', fontSize: '100px' }}
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
              <div style={{ width: '240px' }}>
                <select className="form-select" style={{ fontWeight: 'bold' }} value={modo} onChange={(e) => setModo(e.target.value)}>
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
              const sumaMontoServicios = (venta.detalle_ventaservicios || []).reduce((total, item) => total + (item?.tarifa_monto || 0), 0);
              const sumaMontoProductos = (venta.detalle_ventaProductos || []).reduce((total, item) => total + (item?.tarifa_monto || 0), 0);
              return (
                <div className="mb-4 shadow" key={venta.id}>
                  <div className="card-body fs-3">
                    <h1 className="text-center fw-bold mb-3">
                      {(venta.tb_cliente?.nombres_apellidos_cli || '').trim()}
                    </h1>
                    <div className="d-flex justify-content-between">
                      <div className="" style={{ width: '66%' }}>
                        <span className="text-primary">{DateMaskString(venta.fecha_venta, 'dddd DD [DE] MMMM')}</span> {DateMaskString(venta.fecha_venta, 'YYYY')}
                      </div>
                      <div className="" style={{ width: '33%' }}>
                        <strong>HORA: </strong>{DateMaskString(venta.fecha_venta, 'hh:mm A')}
                      </div>
                    </div>

                    <div className="d-flex justify-content-between mb-3">
                      <div className="text-primary" style={{ width: '66%', fontSize: '25px' }}>
                        <strong>{(dataComprobantes || []).find((c) => c.value === venta.id_tipoFactura)?.label}:</strong> {venta.numero_transac}
                      </div>
                      <div className="text-primary" style={{ width: '33%', fontSize: '25px' }}>
                        <strong>TOTAL: </strong>
                        <SymbolSoles size={20} bottomClasss={'8'} numero={<NumberFormatMoney amount={sumaMontoServicios + sumaMontoProductos} />} />
                      </div>
                    </div>

                    <div>
                      {(venta?.detalleVenta_pagoVenta || []).map((e, i) => (
                        <div key={i} className="timeline-item-info border border-4 p-2 border-gray">
                          <span className="mb-1 d-block fs-4">
                            <span>
                              <span className="fw-light">OPERADOR: </span>{e.parametro_forma_pago?.label_param}<br />
                            </span>
                            {e.parametro_tipo_tarjeta ? (<><span className="fw-light">TIPO DE TARJETA:</span> {e.parametro_tipo_tarjeta.label_param}<br /></>) : null}
                            {e.parametro_tarjeta ? (<><span className="fw-light">TARJETA: </span>{e.parametro_tarjeta.label_param}</>) : null}
                          </span>
                          <span className="d-block fs-3">
                            <span className="fw-light">MONTO PARCIAL: </span>
                            <span className="fw-bold text-primary">
                              <SymbolSoles
                                isbottom
                                bottomClasss={'10'}
                                size={20}
                                numero={FUNMoneyFormatter(e.parcial_monto, e.parametro_forma_pago?.id_param == 535 ? '$' : 'S/.')}
                              />
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>

                    <div>
                      <h3 className="fw-bold">Servicios cantidad: <span className="" style={{ fontSize: '27px' }}>{(venta.detalle_ventaservicios || []).length}</span></h3>
                      <ul className="list-group">
                        {(venta.detalle_ventaservicios || []).map((s, i) => (
                          <li key={i} className="list-group-item m-0 p-0">
                            <div className="text-center bg-primary text-white" style={{ width: '100%' }}>
                              {(s.empleado_servicio?.nombres_apellidos_empl || '-').split(' ')[0]}
                            </div>
                            <div className="d-flex flex-row justify-content-between">
                              <div className="text-primary mx-1" style={{ width: '200px', fontSize: '25px' }}>
                                {s.circus_servicio?.nombre_servicio}
                              </div>
                              <div className="text-end mx-1" style={{ width: '150px' }}>
                                <SymbolSoles size={20} bottomClasss={'8'} numero={<NumberFormatMoney amount={s.tarifa_monto} />} />
                              </div>
                            </div>
                          </li>
                        ))}
                        <li className="list-group-item px-0" style={{ backgroundColor: '#F8F8FA' }}>
                          <div className="d-flex flex-row justify-content-between">
                            <div className="mx-1" style={{ width: '200px', fontSize: '25px' }}>TOTAL VENTA:</div>
                            <div className="text-end mx-1" style={{ width: '150px', fontSize: '27px' }}>
                              <SymbolSoles size={20} bottomClasss={'8'} numero={<NumberFormatMoney amount={sumaMontoServicios} />} />
                            </div>
                          </div>
                        </li>
                      </ul>
                    </div>

                    <div className="mt-5">
                      <h3 className="fw-bold">PRODUCTOS cantidad: <span className="" style={{ fontSize: '27px' }}>{(venta.detalle_ventaProductos || []).length}</span></h3>
                      <ul className="list-group">
                        {(venta.detalle_ventaProductos || []).map((s, i) => (
                          <li key={i} className="list-group-item">
                            <div className="d-flex flex-row">
                              <div className="text-primary mx-1" style={{ width: '200px', fontSize: '25px' }}>
                                {(s.empleado_producto?.nombres_apellidos_empl || '-').split(' ')[0]}
                              </div>
                              <div className="text-end mx-1" style={{ width: '150px' }}>
                                <SymbolSoles size={20} bottomClasss={'8'} numero={<NumberFormatMoney amount={s.tarifa_monto} />} /> - 
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
                              <SymbolSoles size={20} bottomClasss={'8'} numero={<NumberFormatMoney amount={sumaMontoProductos} />} /> <span className="opacity-0">-</span>
                            </div>
                          </div>
                        </li>
                      </ul>
                    </div>
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
                    <li className="list-group-item h2" style={{ backgroundColor: '#F8F8FA' }}>
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

                  </ul>
                </div>
              </div>
            );
          })
        )}
      </Col>

      {/* -------- MODAL: VISTA RESUMEN DETALLE DE SERVICIOS -------- */}
      <Modal show={showResumen} onHide={() => setShowResumen(false)} size="xl" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Resumen de servicios — {modalLabel}</Modal.Title>
          <div className="ms-auto d-flex align-items-center">
            <Form.Check
              type="switch"
              id="switch-agrupacion"
              label={groupBy === 'servicio' ? 'Agrupar: Servicio' : 'Agrupar: Servicio + Colaborador'}
              checked={groupBy === 'servicio'}
              onChange={(e) => setGroupBy(e.target.checked ? 'servicio' : 'servicio-empleado')}
            />
          </div>
        </Modal.Header>

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

          {/* Tabla servicios agregados */}
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
                {itemsResumen.map((it, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{it.servicio}</td>
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
                {itemsResumen.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-4">Sin servicios en el rango.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* === NUEVO: Ranking de Colaborador (SERVICIOS) con botones de orden === */}
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
                {rankingServ.map((r, i) => (
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
      </Modal>

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

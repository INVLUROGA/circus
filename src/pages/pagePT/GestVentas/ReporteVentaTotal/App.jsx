import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles';  
import { DateMaskString, FUNMoneyFormatter, NumberFormatMoney } from '@/components/CurrencyMask';
import { InputText } from '@/components/Form/InputText';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore'
import { useVentasStore } from '@/hooks/hookApi/useVentasStore'
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import React, { useEffect, useState } from 'react'
import { Col, Row, Modal, Button } from 'react-bootstrap';
import Select from 'react-select';
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

  // ---- Modal: Servicios/Productos ----
  const [showResumen, setShowResumen] = useState(false);
  const [modalLabel, setModalLabel] = useState('');
  const [modalRows, setModalRows] = useState([]); // filas
  const [modalType, setModalType] = useState('servicios'); // 'servicios' | 'productos'

  // ---- Modal: Clientes (resumen por cliente) ----
  const [showClientes, setShowClientes] = useState(false);
  const [clientesRows, setClientesRows] = useState([]);

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

  // ---- Helper: formatear pagos de una venta (concatena si hay varios) ----
  const formatearPagos = (venta) => {
    const pagos = venta?.detalleVenta_pagoVenta || [];
    const join = (arr) => arr.filter(Boolean).join(' / ');
    const formas = join(pagos.map(p => p?.parametro_forma_pago?.label_param || ''));
    const tiposTarjeta = join(pagos.map(p => p?.parametro_tipo_tarjeta?.label_param || ''));
    const tarjetas = join(pagos.map(p => p?.parametro_tarjeta?.label_param || ''));
    const operaciones = join(pagos.map(p => p?.n_operacion || ''));
    return {
      forma_pago: formas || '-',
      tipo_tarjeta: tiposTarjeta || '-',
      tarjeta: tarjetas || '-',
      n_operacion: operaciones || '-',
    };
  };

  // ---- Construir filas para el modal Servicios/Productos ----
  const buildModalRows = (grupo, tipo = 'servicios') => {
    const rows = [];
    for (const v of grupo.ventas) {
      const fechaVenta = v.fecha_venta;
      const cliente = (v.tb_cliente?.nombres_apellidos_cli || '').trim();
      const boleta = v.numero_transac;
      const pagosFmt = formatearPagos(v);

      if (tipo === 'servicios') {
        for (const s of (v.detalle_ventaservicios || [])) {
          rows.push({
            fecha: fechaVenta,
            cliente,
            estilista: s?.empleado_servicio?.nombres_apellidos_empl || '-',
            boleta,
            concepto: s?.circus_servicio?.nombre_servicio || '-',
            importe: Number(s?.tarifa_monto || 0),
            ...pagosFmt,
          });
        }
      } else {
        for (const p of (v.detalle_ventaProductos || [])) {
          const nombreProd = p?.tb_producto?.nombre_producto || '-';
          const cant = p?.cantidad ? ` x${p.cantidad}` : '';
          rows.push({
            fecha: fechaVenta,
            cliente,
            estilista: p?.empleado_producto?.nombres_apellidos_empl || '-',
            boleta,
            concepto: `${nombreProd}${cant}`,
            importe: Number(p?.tarifa_monto || 0),
            ...pagosFmt,
          });
        }
      }
    }
    rows.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return rows;
  };

  const abrirResumenServicios = (grupo) => {
    setModalType('servicios');
    setModalLabel(grupo.label);
    setModalRows(buildModalRows(grupo, 'servicios'));
    setShowResumen(true);
  };

  const abrirResumenProductos = (grupo) => {
    setModalType('productos');
    setModalLabel(grupo.label);
    setModalRows(buildModalRows(grupo, 'productos'));
    setShowResumen(true);
  };

  // ---- Construir filas para el modal de Clientes ----
  const buildClientesRows = (grupo) => {
    const map = new Map();
    for (const v of grupo.ventas) {
      const nombre = (v.tb_cliente?.nombres_apellidos_cli || '').trim() || '-';
      const servs = v.detalle_ventaservicios || [];
      const prods = v.detalle_ventaProductos || [];

      const cur = map.get(nombre) || { cliente: nombre, cantServ: 0, impServ: 0, cantProd: 0, impProd: 0 };
      cur.cantServ += servs.length;
      cur.impServ += servs.reduce((a, s) => a + Number(s?.tarifa_monto || 0), 0);
      cur.cantProd += prods.length;
      cur.impProd += prods.reduce((a, p) => a + Number(p?.tarifa_monto || 0), 0);
      map.set(nombre, cur);
    }
    // ordenar por mayor importe total (serv + prod)
    return Array.from(map.values()).sort(
      (a, b) => (b.impServ + b.impProd) - (a.impServ + a.impProd)
    );
  };

  const abrirResumenClientes = (grupo) => {
    setModalLabel(grupo.label);
    setClientesRows(buildClientesRows(grupo));
    setShowClientes(true);
  };

  const totalModal = modalRows.reduce((acc, r) => acc + r.importe, 0);
  const totalClientesServ = clientesRows.reduce((a, r) => a + r.impServ, 0);
  const totalClientesProd = clientesRows.reduce((a, r) => a + r.impProd, 0);

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
              <Select
                  onChange={(e) => setModo(e.value)}
                  // name="id_empl"
                  placeholder={''}
                    styles={{
                      dropdownIndicator: (provided) => ({
                        ...provided,
                        color: "#EEBE00",
                      }),
                      indicatorSeparator: (provided) => ({
                        ...provided,
                        backgroundColor: "#EEBE00",
                      }),
                      control: (provided) => ({
                        ...provided,
                        borderColor: "#EEBE00",
                        color: "#EEBE00",
                      }),
                    }}
                  className="border-2 rounded-3 border-primary outline-none w-100"
                  // classNamePrefix="react-select"
                  defaultValue={{ value: 'comprobante', label: 'comprobantes' }}
                  options={[{value: 'comprobante', label: 'comprobantes'}, {value: 'dia', label: 'por dia'}, {value: 'semana', label: 'por semana'}, {value: 'mes', label: 'por mes'}, {value: 'anio', label: 'por año'},]}
                  // value={[{value: 'comprobante', label: 'comprobantes'}, {value: 'dia', label: 'por dia'}, {value: 'semana', label: 'por semana'}, {value: 'mes', label: 'por mes'}, {value: 'anio', label: 'por año'},].find(
                  //   (option) => option.value === id_empl
                  // )|| 0}
                  required
                />
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
                <div className="shadow" key={venta.id}>
                  <div className="card-body fs-3" style={{marginTop: '100px'}}>
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
                        <div key={i} className=" border border-4 p-2 border-primary">
                          <span className="mb-1 d-block fs-4">
                            <span>
                              <span className="fw-light">OPERADOR: </span>{e.parametro_forma_pago?.label_param}<br />
                            </span>
                            {e.parametro_tipo_tarjeta ? (<><span className="fw-light">TIPO DE TARJETA:</span> {e.parametro_tipo_tarjeta.label_param}<br /></>) : null}
                            {e.parametro_tarjeta ? (<><span className="fw-light">TARJETA: </span>{e.parametro_tarjeta.label_param}</>) : null}
                            {e.n_operacion ? (<><br/><span className="fw-light">OPERACIÓN: </span>{e.n_operacion}</>) : null}
                          </span>
                          <span className="d-block fs-4">
                            <span className="fw-light">MONTO PARCIAL: </span>
                            <span className="fw-bold text-primary">
                              <SymbolSoles 
                                  isbottom 
                                  bottomClasss={'10'}  
                                  fontSizeS={'font-10'} numero={FUNMoneyFormatter(e.parcial_monto, e.parametro_forma_pago?.id_param == 535 ? '$' : 'S/.')} />
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
                              <div className="text-primary mx-1" style={{ width: '100%', fontSize: '25px' }}>
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
            const total = servicios.reduce((sum, s) => sum + (s?.tarifa_monto || 0), 0) + productos.reduce((sum, p) => sum + (p?.tarifa_monto || 0), 0);
            return (
              <div key={idx} className="card mb-4 shadow">
                <div className="card-body">
                  <h1 className="text-center fw-bold mb-4 text-uppercase text-primary">{grupo.label}</h1>
                  <ul className="list-group list-group-flush">
                    
                    {/* CLICK abre modal de CLIENTES */}
                    <li
                      className="list-group-item h2"
                      title="Ver resumen por cliente"
                      style={{ cursor: 'pointer' }}
                      onClick={() => abrirResumenClientes(grupo)}
                    >
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

                    {/* CLICK abre modal de SERVICIOS */}
                    <li
                      className="list-group-item h2"
                      title="Ver detalle de servicios"
                      style={{ cursor: 'pointer' }}
                      onClick={() => abrirResumenServicios(grupo)}
                    >
                      <div className="d-flex justify-content-between">
                        <span>TOTAL Servicios vendidos:</span>
                        <span className="text-end fs-1">{servicios.length}</span>
                      </div>
                    </li>

                    {/* CLICK abre modal de PRODUCTOS */}
                    <li
                      className="list-group-item h2"
                      title="Ver detalle de productos"
                      style={{ cursor: 'pointer', backgroundColor: '#F8F8FA' }}
                      onClick={() => abrirResumenProductos(grupo)}
                    >
                      <div className="d-flex justify-content-between">
                        <span>TOTAL Productos vendidos:</span>
                        <span className="text-end fs-1">{productos.length}</span>
                      </div>
                    </li>

                  </ul>
                </div>
              </div>
            );
          })
        )}
      </Col>

      {/* -------- MODAL: TABLA DETALLADA (SERVICIOS o PRODUCTOS) -------- */}
      <Modal show={showResumen} onHide={() => setShowResumen(false)} size="xl" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            Detalle — {modalType === 'servicios' ? 'Servicios' : 'Productos'} — {modalLabel}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="h2 m-0">VENTAS: <strong className=''>{modalRows.length}</strong></div>
            <div className="h2 m-0">
              Total:{' '}
              <strong>
                <SymbolSoles size={25} bottomClasss={'15'} numero={<NumberFormatMoney amount={totalModal} />} />
              </strong>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-sm align-middle table-striped">
              <thead className='bg-primary'>
                <tr>
                  <th><div className='text-white fs-4'>Fecha de venta</div></th>
                  <th><div className='text-white fs-4'>Nombre del cliente</div></th>
                  <th><div className='text-white fs-4'>Estilista</div></th>
                  <th><div className='text-white fs-4'>Número de boleta</div></th>
                  <th><div className='text-white fs-4'>Servicio o Producto</div></th>
                  <th><div className='text-white fs-4'>Forma de pago</div></th>
                  <th><div className='text-white fs-4'>Tipo de tarjeta</div></th>
                  <th><div className='text-white fs-4'>Tarjeta</div></th>
                  <th><div className='text-white fs-4'>Operación</div></th>
                  <th className="text-end"><div className='text-white fs-4'>Importe</div></th>
                </tr>
              </thead>
              <tbody >
                {modalRows.map((r, i) => (
                  <tr key={i}>
                    <td><div className='fs-4 mx-2'>{DateMaskString(r.fecha, 'dddd DD [de] MMMM [DEL] YYYY [A LAS] HH:mm')}</div></td>
                    <td><div className='fs-4 mx-2 text-primary'>{r.cliente}</div></td>
                    <td><div className='fs-4 mx-2'>{r.estilista}</div></td>
                    <td><div className='fs-4 mx-2 text-primary'>{r.boleta}</div></td>
                    <td><div className='fs-4 mx-2'>{r.concepto}</div></td>
                    <td><div className='fs-4 mx-2'>{r.forma_pago}</div></td>
                    <td><div className='fs-4 mx-2'>{r.tipo_tarjeta}</div></td>
                    <td><div className='fs-4 mx-2'>{r.tarjeta}</div></td>
                    <td><div className='fs-4 mx-2'>{r.n_operacion}</div></td>
                    <td className="text-end">
                      <div className='fs-4'>
                        <SymbolSoles size={16} bottomClasss={'6'} numero={<NumberFormatMoney amount={r.importe} />} />
                      </div>
                    </td>
                  </tr>
                ))}
                {modalRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-4">Sin datos.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowResumen(false)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>

      {/* -------- MODAL: RESUMEN POR CLIENTE -------- */}
      <Modal show={showClientes} onHide={() => setShowClientes(false)} size="lg" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Resumen por cliente — {modalLabel}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="h6 m-0">Clientes: <strong>{clientesRows.length}</strong></div>
            <div className="h6 m-0 d-flex gap-3">
              <span>
                Servicios:{' '}
                <strong>
                  <SymbolSoles size={14} bottomClasss={'4'} numero={<NumberFormatMoney amount={totalClientesServ} />} />
                </strong>
              </span>
              <span>
                Productos:{' '}
                <strong>
                  <SymbolSoles size={14} bottomClasss={'4'} numero={<NumberFormatMoney amount={totalClientesProd} />} />
                </strong>
              </span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Nombre del cliente</th>
                  <th className="text-end">Servicios (cant.)</th>
                  <th className="text-end">Importe servicios</th>
                  <th className="text-end">Productos (cant.)</th>
                  <th className="text-end">Importe productos</th>
                </tr>
              </thead>
              <tbody>
                {clientesRows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.cliente}</td>
                    <td className="text-end">{r.cantServ}</td>
                    <td className="text-end">
                      <SymbolSoles size={14} bottomClasss={'4'} numero={<NumberFormatMoney amount={r.impServ} />} />
                    </td>
                    <td className="text-end">{r.cantProd}</td>
                    <td className="text-end">
                      <SymbolSoles size={14} bottomClasss={'4'} numero={<NumberFormatMoney amount={r.impProd} />} />
                    </td>
                  </tr>
                ))}
                {clientesRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-4">Sin datos.</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <th className="text-end">Totales:</th>
                  <th className="text-end">
                    {clientesRows.reduce((a, r) => a + r.cantServ, 0)}
                  </th>
                  <th className="text-end">
                    <SymbolSoles size={14} bottomClasss={'4'} numero={<NumberFormatMoney amount={totalClientesServ} />} />
                  </th>
                  <th className="text-end">
                    {clientesRows.reduce((a, r) => a + r.cantProd, 0)}
                  </th>
                  <th className="text-end">
                    <SymbolSoles size={14} bottomClasss={'4'} numero={<NumberFormatMoney amount={totalClientesProd} />} />
                  </th>
                </tr>
              </tfoot>
            </table>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowClientes(false)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </Row>
  );
};

// ---- Util para recurrencia de clientes (si lo necesitas) ----
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

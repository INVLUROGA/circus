import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles';
import { DateMaskString, FUNMoneyFormatter, NumberFormatMoney } from '@/components/CurrencyMask';
import { InputText } from '@/components/Form/InputText';
import { FechaRangeMES } from '@/components/RangeCalendars/FechaRange';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore'
import { useVentasStore } from '@/hooks/hookApi/useVentasStore'
import React, { useEffect, useMemo, useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import { useSelector } from 'react-redux';
// imports
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { PageBreadcrumb } from '@/components';
dayjs.extend(isoWeek);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('America/Lima'); // <-- todo a hora local Lima

export const App = ({ id_empresa }) => {
  const { obtenerTablaVentas, dataVentas } = useVentasStore();
  const { obtenerParametroPorEntidadyGrupo: obtenerDataComprobantes, DataGeneral: dataComprobantes } = useTerminoStore();

  useEffect(() => {
    obtenerTablaVentas(599);
    obtenerDataComprobantes('nueva-venta', 'comprobante');
  }, []);

  const [palabras, setPalabras] = useState([]);
  const [input, setInput] = useState('');
  const [rangoFechas, setRangoFechas] = useState([
    dayjs().startOf('month').toISOString(),
    dayjs().endOf('month').toISOString()
  ]);
      const { RANGE_DATE, dataView } = useSelector(e=>e.DATA)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && input.trim() !== '') {
      const nuevaPalabra = input.trim().toLowerCase();
      if (!palabras.includes(nuevaPalabra)) {
        setPalabras((prev) => [...prev, nuevaPalabra]);
      }
      setInput('');
    }
  };

  const eliminarPalabra = (idx) => {
    setPalabras((prev) => prev.filter((_, i) => i !== idx));
  };

  const normalizar = (texto) =>
    (texto || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const ventaCoincide = (venta) => {
    if (palabras.length === 0) return true;

    const textoVenta = [
      normalizar(venta.tb_cliente?.nombres_apellidos_cli),
      normalizar(venta.numero_transac),
      ...venta.detalle_ventaservicios.map((s) =>
        normalizar(`${s.circus_servicio?.nombre_servicio} ${s.empleado_servicio?.nombres_apellidos_empl} ${s.tarifa_monto}`)
      )
    ].join(' ');

    return palabras.every((palabra) => textoVenta.includes(palabra));
  };
// -------------------- FECHAS RANGO (LOCAL y RÁPIDO) --------------------
const [tsStart, tsEnd] = useMemo(() => {
  const s = dayjs.tz(RANGE_DATE?.[0]).startOf('day').valueOf();
  const e = dayjs.tz(RANGE_DATE?.[1]).endOf('day').valueOf();
  return [s, e];
}, [RANGE_DATE]);

// -------------------- ÍNDICE DE TEXTO (búsqueda rápida) --------------------
const textoVentaCache = useMemo(() => {
  const normalizar = (t) => (t || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const map = new Map();
  for (const v of dataVentas || []) {
    const partes = [
      normalizar(v.tb_cliente?.nombres_apellidos_cli),
      normalizar(v.numero_transac),
      ...(v.detalle_ventaservicios || []).map((s) =>
        normalizar(`${s.circus_servicio?.nombre_servicio} ${s.empleado_servicio?.nombres_apellidos_empl} ${s.tarifa_monto}`)
      ),
    ];
    map.set(v.id, partes.join(' '));
  }
  return map;
}, [dataVentas]);

// -------------------- FILTRO VENTAS (local + rápido) --------------------
const ventasFiltradas = useMemo(() => {
  const terms = palabras.map((p) =>
    p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  );

  const pasaBuscador = (v) => {
    if (terms.length === 0) return true;
    const txt = textoVentaCache.get(v.id) || '';
    // `every` para que todas las palabras estén
    for (let i = 0; i < terms.length; i++) {
      if (!txt.includes(terms[i])) return false;
    }
    return true;
  };

  const pasaFecha = (v) => {
    const t = dayjs.tz(v.fecha_venta).valueOf(); // local
    return t >= tsStart && t <= tsEnd;
  };

  return (dataVentas || []).filter((v) => pasaBuscador(v) && pasaFecha(v));
}, [dataVentas, textoVentaCache, palabras, tsStart, tsEnd]);

// -------------------- FECHA INICIO (para nuevos vs recurrentes) --------------------
const startDate = useMemo(() => tsStart, [tsStart]); // usamos timestamp directo

// -------------------- PRIMERA COMPRA HISTÓRICA POR CLIENTE --------------------
const firstPurchaseByClient = useMemo(() => {
  const map = new Map(); // id_cli -> timestamp
  for (const v of dataVentas || []) {
    const id = v?.id_cli;
    if (!id) continue;
    const t = dayjs.tz(v.fecha_venta).valueOf();
    const prev = map.get(id);
    if (prev === undefined || t < prev) map.set(id, t);
  }
  return map;
}, [dataVentas]);

// -------------------- RESUMEN MONTOS/CANTIDADES --------------------
const resumen = useMemo(() => {
  let cantServicios = 0, cantProductos = 0, sumaServicios = 0, sumaProductos = 0;
  for (const v of ventasFiltradas) {
    const serv = v?.detalle_ventaservicios || [];
    const prod = v?.detalle_ventaProductos || [];
    cantServicios += serv.length;
    cantProductos += prod.length;
    for (const it of serv) sumaServicios += (it?.tarifa_monto || 0);
    for (const it of prod) sumaProductos += (it?.tarifa_monto || 0);
  }
  return { cantServicios, cantProductos, sumaServicios, sumaProductos };
}, [ventasFiltradas]);

// -------------------- MÉTRICAS CLIENTES --------------------
const clientesStats = useMemo(() => {
  const countsInRange = new Map(); // id_cli -> compras en el rango
  for (const v of ventasFiltradas) {
    const id = v?.id_cli;
    if (!id) continue;
    countsInRange.set(id, (countsInRange.get(id) || 0) + 1);
  }

  let nuevos = 0, recurrentes = 0, repetidos = 0;
  for (const [id, cnt] of countsInRange.entries()) {
    const firstTs = firstPurchaseByClient.get(id);
    if (firstTs !== undefined && firstTs >= startDate) nuevos++;
    else recurrentes++;
    if (cnt >= 2) repetidos++;
  }
  return { nuevos, recurrentes, repetidos };
}, [ventasFiltradas, firstPurchaseByClient, startDate]);

  return (
    <div className="container py-1">
      <PageBreadcrumb title="COMPROBANTES POR RANGO DE FECHA" subName="Ventas" />
      {/* Filtro de fechas */}
      <Row>
        <Col lg={5}>
      <div className="mb-4">
        <FechaRangeMES
            rangoFechas={RANGE_DATE}
            onChange={setRangoFechas}
        />
      </div>

      {/* Buscador */}
      <div className="d-flex justify-content-between align-items-center">
        <div style={{ flex: 1 }} className=' d-flex justify-content-center'>
          <InputText
                            type="text"
                            style={{width: '300px'}}
                            placeholder="BUSCADOR"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                          />
          <div className="mt-2 d-flex flex-wrap">
            {palabras.map((palabra, idx) => (
              <span
                key={idx}
                className="badge bg-primary text-light me-2 mb-2"
                style={{ paddingRight: '0.6em', display: 'flex', alignItems: 'center' }}
              >
                {palabra}
                <button
                  type="button"
                  className="btn-close btn-close-white btn-sm ms-2"
                  onClick={() => eliminarPalabra(idx)}
                  style={{ fontSize: '0.6rem' }}
                />
              </span>
            ))}
          </div>
        </div>
      </div>
      
{/* Chips */}
<div className="mt-2 d-flex flex-wrap justify-content-center mb-3">
  {palabras.map((palabra, idx) => (
    <span
      key={idx}
      className="badge bg-primary text-light me-2 mb-2"
      style={{ paddingRight: '0.6em', display: 'flex', alignItems: 'center' }}
    >
      {palabra}
      <button
        type="button"
        className="btn-close btn-close-white btn-sm ms-2"
        onClick={() => eliminarPalabra(idx)}
        style={{ fontSize: '0.6rem' }}
      />
    </span>
  ))}
</div>

{/* --- RESUMEN (nuevo) --- */}
<div className="border rounded-3 p-3 mb-4 shadow-sm bg-light">
  <div className="row g-3 text-center">
    <div className="col-6 col-md-3">
      <div className="fw-bold text-secondary">CANT. SERVICIOS</div>
      <div className="fs-4">{resumen.cantServicios}</div>
    </div>
    <div className="col-6 col-md-3">
      <div className="fw-bold text-secondary">CANT. PRODUCTOS</div>
      <div className="fs-4">{resumen.cantProductos}</div>
    </div>
    <div className="col-6 col-md-3">
      <div className="fw-bold text-secondary">IMP. SERVICIOS</div>
      <div className="fs-4 text-primary">
        <SymbolSoles
          size={20}
          bottomClasss={'8'}
          numero={<NumberFormatMoney amount={resumen.sumaServicios} />}
        />
      </div>
    </div>
    <div className="col-6 col-md-3">
      <div className="fw-bold text-secondary">IMP. PRODUCTOS</div>
      <div className="fs-4 text-primary">
        <SymbolSoles
          size={20}
          bottomClasss={'8'}
          numero={<NumberFormatMoney amount={resumen.sumaProductos} />}
        />
      </div>
    </div>
    {/* --- RESUMEN DE CLIENTES (nuevo) --- */}
    <div className="border rounded-3 p-3 mb-4 shadow-sm bg-light">
      <div className="row g-3 text-center">
        <div className="col-12 col-md-4">
          <div className="fw-bold text-secondary">CLIENTES NUEVOS</div>
          <div className="fs-4">{clientesStats.nuevos}</div>
        </div>
        <div className="col-12 col-md-4">
          <div className="fw-bold text-secondary">CLIENTES RECURRENTES</div>
          <div className="fs-4">{clientesStats.recurrentes}</div>
        </div>
        <div className="col-12 col-md-4">
          <div className="fw-bold text-secondary">CLIENTES REPETIDOS (RANGO)</div>
          <div className="fs-4">{clientesStats.repetidos}</div>
        </div>
      </div>
    </div>
    {/* --- RESUMEN DE CLIENTES (nuevo) --- */}
    <div className="border rounded-3 p-3 mb-4 shadow-sm bg-light">
      <div className="row g-3 text-center">
        <div className="col-12 col-md-4">
          <div className="fw-bold text-secondary">VENTAS</div>
          <div className="fs-4">{ventasFiltradas.length}</div>
        </div>
      </div>
    </div>
  </div>
</div>
        </Col>
        <Col lg={7}>
      <div className=''>
            
      {/* Vista por comprobante */}
      {ventasFiltradas.length > 0 ? (
        ventasFiltradas.map((venta) => {
                      const sumaMontoServicios = (venta.detalle_ventaservicios || []).reduce((total, item) => total + (item?.tarifa_monto || 0), 0);
                      const sumaMontoProductos = (venta.detalle_ventaProductos || []).reduce((total, item) => total + (item?.tarifa_monto || 0), 0);
                      return (
                        <div className="mb-4 shadow" key={venta.id}>
                          <div className="card-body fs-3" style={{marginTop: '100px'}}>
                            <h1 className="text-center fw-bold mb-3">
                              {(venta.tb_cliente?.nombres_apellidos_cli || '').trim()}
                            </h1>
                            <div className="d-flex justify-content-between">
                              <div className="" style={{ width: '66%' }}>
                                <span className="text-primary">{DateMaskString(venta.fecha_venta, 'dddd DD [DE] MMMM')}</span> {DateMaskString(venta.fecha_venta, 'YYYY')}
                              </div>
                              <div className=" text-right" style={{ width: '33%' }}>
                                <strong>HORA: </strong>{DateMaskString(venta.fecha_venta, 'hh:mm A')}
                              </div>
                            </div>
        
                            <div className="d-flex justify-content-between mb-3">
                              <div className="text-primary" style={{ width: '66%', fontSize: '25px' }}>
                                <strong>{(dataComprobantes || []).find((c) => c.value === venta.id_tipoFactura)?.label}:</strong> {venta.numero_transac}
                              </div>
                              <div className="text-primary text-right" style={{ width: '33%', fontSize: '25px' }}>
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
                                  <span className="d-block fs-3">
                                    <span className="fw-light">MONTO PARCIAL: </span>
                                    <span className="fw-bold text-primary">
                                      <SymbolSoles isbottom bottomClasss={'10'} size={20} numero={FUNMoneyFormatter(e.parcial_monto, e.parametro_forma_pago?.id_param == 535 ? '$' : 'S/.')} />
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
      )}
      </div>
        </Col>
      </Row>
    </div>
  );
};

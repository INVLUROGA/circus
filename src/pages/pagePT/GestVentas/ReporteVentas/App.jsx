import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles';
import { DateMaskString, FUNMoneyFormatter, NumberFormatMoney } from '@/components/CurrencyMask';
import { InputText } from '@/components/Form/InputText';
import { FechaRangeMES } from '@/components/RangeCalendars/FechaRange';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore'
import { useVentasStore } from '@/hooks/hookApi/useVentasStore'
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import React, { useEffect, useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import { useSelector } from 'react-redux';
dayjs.extend(isoWeek);

export const App = ({ id_empresa }) => {
  const { obtenerTablaVentas, dataVentas } = useVentasStore();
  const { obtenerParametroPorEntidadyGrupo: obtenerDataComprobantes, DataGeneral: dataComprobantes } = useTerminoStore();

  useEffect(() => {
    obtenerTablaVentas(id_empresa);
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

  const ventasFiltradas = dataVentas
    .filter(ventaCoincide)
    .filter((venta) => {
      const fechaVenta = new Date(venta.fecha_venta);
      const desde = new Date(RANGE_DATE[0]);
      const hasta = new Date(RANGE_DATE[1]);
      
      return fechaVenta >= desde && fechaVenta <= hasta;
    });

  return (
    <div className="container py-1">
      {/* Filtro de fechas */}
      <Row>
        <Col lg={5}>
      <div className="mb-4">
        <FechaRangeMES
            
            rangoFechas={RANGE_DATE}
        //   textColor="#007bff"
          onChange={setRangoFechas}
        />
      </div>

      {/* Buscador */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div style={{ flex: 1 }} className=' d-flex justify-content-center'>
          <InputText
                            type="text"
                            className="form-control "
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

import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles';
import { DateMaskString, NumberFormatMoney } from '@/components/CurrencyMask';
import { FechaRangeMES } from '@/components/RangeCalendars/FechaRange';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore'
import { useVentasStore } from '@/hooks/hookApi/useVentasStore'
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import React, { useEffect, useState } from 'react';
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
    <div className="container py-4">
      {/* Filtro de fechas */}
      <div className="mb-4">
        <FechaRangeMES
            rangoFechas={RANGE_DATE}
        //   textColor="#007bff"
          onChange={setRangoFechas}
        />
      </div>

      {/* Buscador */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div style={{ flex: 1 }}>
          <input
            type="text"
            className="form-control"
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
      <div className='card'>

      </div>
      {/* Vista por comprobante */}
      {ventasFiltradas.length > 0 ? (
        ventasFiltradas.map((venta) => {
          const sumaMontoServicios = venta.detalle_ventaservicios.reduce(
            (total, item) => total + (item?.tarifa_monto || 0),
            0
          );
          return (
            <div className="card mb-4 shadow" key={venta.id}>
              <div className="card-body fs-3">
                <h1 className="text-center fw-bold mb-3">
                  {venta.tb_cliente?.nombres_apellidos_cli.trim()}
                </h1>
                <div className="d-flex justify-content-between">
                  <div className='bg-danger' style={{width: '33%'}}>
                    <strong></strong>{' '}
                    <span className="text-primary">
                      {DateMaskString(venta.fecha_venta, 'dddd DD [DE] MMMM')}
                    </span>{' '}
                    {DateMaskString(venta.fecha_venta, 'YYYY')}
                  </div>
                  <div className='bg-danger' style={{width: '33%'}}>
                    <strong>HORA: </strong>
                    {DateMaskString(venta.fecha_venta, 'hh:mm A')}
                  </div>
                  <div className='bg-danger' style={{width: '33%'}}>
                    <strong>
                      {
                        dataComprobantes.find(
                          (comprobante) => comprobante.value === venta.id_tipoFactura
                        )?.label
                      }
                      :
                    </strong>{' '}
                    {venta.numero_transac}
                  </div>
                </div>
                <div className="d-flex justify-content-between mb-3">
                  <div></div>
                  <div></div>
                  <div>
                    <strong>TOTAL: </strong>S/
                    <NumberFormatMoney amount={sumaMontoServicios} />
                  </div>
                </div>
                <div>
                  <h3 className="fw-bold">Servicios:</h3>
                  <ul className="list-group">
                    {venta.detalle_ventaservicios.map((s, i) => (
                      <li key={i} className="list-group-item">
                        <span className="text-primary">
                          {s.empleado_servicio?.nombres_apellidos_empl.split(' ')[0]}
                        </span>{' '}
                        -{' '}
                        <span className="text">
                          S/<NumberFormatMoney amount={s.tarifa_monto} />
                        </span>{' '}
                        - {s.circus_servicio?.nombre_servicio}
                      </li>
                    ))}
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
  );
};

import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles';
import { NumberFormatMoney } from '@/components/CurrencyMask';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore'
import { useVentasStore } from '@/hooks/hookApi/useVentasStore'
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import React, { useEffect, useState } from 'react'
dayjs.extend(isoWeek);

export const App = ({id_empresa}) => {
      const { obtenerTablaVentas, dataVentas } = useVentasStore()
      const  { obtenerParametroPorEntidadyGrupo:obtenerDataComprobantes, DataGeneral:dataComprobantes } = useTerminoStore()
      useEffect(() => {
          obtenerTablaVentas(id_empresa)
          obtenerDataComprobantes('nueva-venta', 'comprobante')
      }, [])
      
//   return (
//     <div>
//         <pre>
//             {JSON.stringify(dataVentas, null, 2)}
//         </pre>
//     </div>
//   )
  const [palabras, setPalabras] = useState([]);
  const [input, setInput] = useState('');
  const [modo, setModo] = useState('comprobante');

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

  const ventasFiltradas = dataVentas.filter(ventaCoincide);

  const agruparPorModo = () => {
    const grupos = {};
    const clientePrimeraVenta = {};

    // Ordenar ventas por fecha
    const ordenadas = [...ventasFiltradas].sort(
      (a, b) => new Date(b.fecha_venta) - new Date(a.fecha_venta)
    );

    for (const venta of ordenadas) {
      const fecha = dayjs(venta.fecha_venta);
      let clave = '';
      let label = '';

      switch (modo) {
        case 'dia':
          clave = fecha.format('YYYY-MM-DD');
          label = fecha.format('dddd D [de] MMMM [del] YYYY');
          break;
        case 'semana':
          clave = `${fecha.isoWeek()}-${fecha.year()}`;
          label = `Semana ${fecha.isoWeek()}, de ${fecha.format('MMMM [del] YYYY')}`;
          break;
        case 'mes':
          clave = fecha.format('MM-YYYY');
          label = fecha.format('MMMM YYYY');
          break;
        case 'anio':
          clave = fecha.format('YYYY');
          label = fecha.format('YYYY');
          break;
        default:
          break;
      }

      if (!grupos[clave]) {
        grupos[clave] = {
          label,
          ventas: [],
          clientesVistos: new Set(),
          clientesNuevos: new Set(),
          clientesRecurrentes: new Set()
        };
      }

      const nombreCliente = venta.tb_cliente?.nombres_apellidos_cli.trim();
      const grupo = grupos[clave];

      grupo.ventas.push(venta);

      // Detectar cliente nuevo vs recurrente en base a su primera aparición
      if (!clientePrimeraVenta[nombreCliente]) {
        clientePrimeraVenta[nombreCliente] = clave;
        grupo.clientesNuevos.add(nombreCliente);
      } else {
        if (clientePrimeraVenta[nombreCliente] === clave) {
          grupo.clientesNuevos.add(nombreCliente);
        } else {
          grupo.clientesRecurrentes.add(nombreCliente);
        }
      }

      grupo.clientesVistos.add(nombreCliente);
    }

    return Object.values(grupos);
  };

  const resumenes = ['comprobante'].includes(modo) ? [] : agruparPorModo();

  return (
    <div className="container py-4">
      {/* Buscador + selector */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div style={{ flex: 1 }}>
          <input
            type="text"
            className="form-control"
            placeholder="Escribe y presiona Enter"
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
        <div className="ms-3" style={{ minWidth: '200px' }}>
          <select className="form-select" value={modo} onChange={(e) => setModo(e.target.value)}>
            <option value="comprobante">Por comprobante</option>
            <option value="dia">Por día</option>
            <option value="semana">Por semana</option>
            <option value="mes">Por mes</option>
            <option value="anio">Por año</option>
          </select>
        </div>
      </div>

      {/* Vista por comprobante */}
      {modo === 'comprobante' ? (
        ventasFiltradas.length > 0 ? (
          ventasFiltradas.map((venta) => (
            <div className="card mb-4 shadow" key={venta.id}>
              <div className="card-body">
                <h1 className="text-center fw-bold mb-3">
                  {venta.tb_cliente?.nombres_apellidos_cli.trim()}
                </h1>
                <div className="row text-center mb-3">
                  <div className="col"><strong>Boleta:</strong> {venta.numero_transac}</div>
                  <div className="col"><strong>Origen:</strong> {venta.id_origen}</div>
                  <div className="col"><strong>Tipo Comprobante:</strong> {venta.id_tipoFactura}</div>
                  <div className="col"><strong>Fecha:</strong> {new Date(venta.fecha_venta).toLocaleDateString()}</div>
                </div>
                <div>
                  <h6 className="fw-bold">Servicios:</h6>
                  <ul className="list-group">
                    {venta.detalle_ventaservicios.map((s, i) => (
                      <li key={i} className="list-group-item">
                        {s.empleado_servicio?.nombres_apellidos_empl} - {s.circus_servicio?.nombre_servicio} - {s.tarifa_monto}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="alert alert-warning">No se encontraron resultados.</div>
        )
      ) : (
        // Vista resumen
        resumenes.map((grupo, idx) => {
          const servicios = grupo.ventas.flatMap((v) => v.detalle_ventaservicios);
          const total = servicios.reduce((sum, s) => sum + (s.tarifa_monto || 0), 0);
          return (
            <div key={idx} className="card mb-4 shadow">
              <div className="card-body">
                <h1 className="text-center fw-bold mb-4 text-uppercase">{grupo.label}</h1>
                <ul className="list-group list-group-flush">
                  <li className="list-group-item h2">
                    <div className='d-flex justify-content-between'>
                        <span className='text-primary'>Total vendido: </span> <span className='text-end'><SymbolSoles numero={<NumberFormatMoney amount={total}/>}/></span>
                    </div>
                    </li>
                  <li className="list-group-item h2">
                    <div className='d-flex justify-content-between'>
                    <span className='text-primary'>Servicios vendidos:</span> <span className='text-end'>{servicios.length}</span>
                    </div>
                  </li>
                  <li className="list-group-item h2">
                    <div className='d-flex justify-content-between'>
                    <span className='text-primary'>Boletas emitidas:</span>  <span className='text-end'>{grupo.ventas.length}</span>
                    </div>
                  </li>
                  <li className="list-group-item h2">
                    <div className='d-flex justify-content-between'>
                    <span className='text-primary'>Clientes únicos:</span> <span className='text-end'>{grupo.clientesVistos.size}</span>
                    </div>
                  </li>
                  <li className="list-group-item h2">
                    <div className='d-flex justify-content-between'>
                    <span className='text-primary'>Clientes nuevos:</span>  <span className='text-end'>{grupo.clientesNuevos.size}</span>
                    </div>
                  </li>
                  <li className="list-group-item h2">
                    <div className='d-flex justify-content-between'>
                    <span className='text-primary'>Clientes recurrentes:</span> <span>{grupo.clientesRecurrentes.size}</span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}


function VentaCard({ venta }) {
  const [palabrasClave, setPalabrasClave] = useState([]);
  const [input, setInput] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && input.trim() !== '') {
      setPalabrasClave((prev) => [...prev, input.trim()]);
      setInput('');
    }
  };

  return (
    <div className="card mb-4 shadow">
      <div className="card-body">
        <h5 className="text-center fw-bold mb-3">
          {venta.tb_cliente.nombres_apellidos_cli.trim()}
        </h5>

        <div className="row text-center mb-3">
          <div className="col"><strong>Boleta:</strong> {venta.numero_transac}</div>
          <div className="col"><strong>Origen:</strong> {venta.id_origen}</div>
          <div className="col"><strong>Tipo Comprobante:</strong> {venta.id_tipoFactura}</div>
          <div className="col"><strong>Fecha:</strong> {new Date(venta.fecha_venta).toLocaleDateString()}</div>
        </div>

        <div className="mb-3">
          <h6 className="fw-bold">Servicios:</h6>
          <ul className="list-group">
            {venta.detalle_ventaservicios.map((servicio, idx) => (
              <li key={idx} className="list-group-item">
                {servicio.empleado_servicio.nombres_apellidos_empl} - {servicio.circus_servicio.nombre_servicio} - {servicio.tarifa_monto}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h6 className="fw-bold">Se busca:</h6>
          <input
            type="text"
            className="form-control"
            placeholder="Escribe una palabra y presiona Enter"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="mt-2">
            {palabrasClave.map((palabra, idx) => (
              <span key={idx} className="badge bg-info text-dark me-1">{palabra}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
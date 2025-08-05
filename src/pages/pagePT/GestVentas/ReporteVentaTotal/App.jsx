import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles';
import { DateMask, DateMaskString, NumberFormatMoney } from '@/components/CurrencyMask';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore'
import { useVentasStore } from '@/hooks/hookApi/useVentasStore'
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import React, { useEffect, useState } from 'react'
import { Col, Row } from 'react-bootstrap';
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
      ),
      ...venta.detalle_ventaProductos.map((p)=>normalizar(`${p.tb_producto?.nombre_producto} ${p.empleado_producto?.nombres_apellidos_empl} ${p.cantidad} unidad ${p.tarifa_monto}`))
    ].join(' ');

    return palabras.every((palabra) => textoVenta.includes(palabra));
  };



  const ventasFiltradas = dataVentas.filter(ventaCoincide);
  console.log({dataVentas, ventaCoincide});
  
  const agruparPorModo = () => {
    const grupos = {};
    const clientePrimeraVenta = {};

    // Ordenar ventas por fecha
    const ordenadas = [...ventasFiltradas].sort(
      (a, b) => new Date(b.fecha_venta) - new Date(a.fecha_venta)
    );

    for (const venta of ordenadas) {
      const fecha = dayjs(venta.fecha_venta).subtract(5, 'hour');
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
    <Row >
      
    <Col lg={4} style={{position: 'sticky', left: '0', top: 140, height: '200px'}} className='bg-danger p-3'>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Row>
          <Col lg={12}>
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
          </Col>
          <Col lg={12}>
            <div className="ms-3" style={{ width: '240px' }}>
              <select className="form-select" value={modo} onChange={(e) => setModo(e.target.value)}>
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

      {/* Buscador + selector */}
    <Col lg={8}  className=''>
    
      {modo === 'comprobante' ? (
        ventasFiltradas.length > 0 ? (
          ventasFiltradas.map((venta) => {
            const sumaMontoServicios = venta.detalle_ventaservicios.reduce((total, item) => total + (item?.tarifa_monto || 0), 0)
            const sumaMontoProductos = venta.detalle_ventaProductos.reduce((total, item) => total + (item?.tarifa_monto || 0), 0)
            // const sumaProductos = venta?.detalle_ventaproductos.reduce((total, item) => total + (item?.tarifa_monto || 0), 0)
            return (
            <div className="card mb-4 shadow" key={venta.id}>
              <div className="card-body fs-3">
                <h1 className="text-center fw-bold mb-3">
                  {venta.tb_cliente?.nombres_apellidos_cli.trim()}
                </h1>
                <div className="d-flex justify-content-between">
                  {/* dddd DD [de] MMMM YYYY [] hh:mm A */}
                  <div className='' style={{width: '33%'}}><strong></strong> <span className='text-primary'>{DateMaskString(venta.fecha_venta, 'dddd DD [DE] MMMM')}</span> {DateMaskString(venta.fecha_venta, 'YYYY')}</div>
                  <div className='' style={{width: '33%'}}><strong>HORA: </strong>{DateMaskString(venta.fecha_venta, 'hh:mm A')}</div>
                  <div className='text-primary' style={{width: '33%', fontSize: '25px'}}><strong>{dataComprobantes.find(comprobante=>comprobante.value===venta.id_tipoFactura)?.label}:</strong> {venta.numero_transac}</div>
                </div>
                <div className="d-flex justify-content-between mb-3">
                  {/* dddd DD [de] MMMM YYYY [] hh:mm A */}
                  <div className='' style={{width: '33%'}}><strong></strong> </div>
                  <div className='' style={{width: '33%'}}><strong></strong> </div>
                  <div className='text-primary' style={{width: '33%', fontSize: '25px'}}><strong>TOTAL: </strong><SymbolSoles size={20} bottomClasss={'8'} numero={<NumberFormatMoney amount={sumaMontoServicios+sumaMontoProductos}/>}/></div>
                </div>
                <div>
                  <h3 className="fw-bold">Servicios cantidad: <span className='text-primary' style={{fontSize: '27px'}}>{venta.detalle_ventaservicios.length}</span></h3>
                  <ul className="list-group">
                    {venta.detalle_ventaservicios.map((s, i) => (
                      <li key={i} className="list-group-item">
                        <div className='d-flex flex-row'>
                        <div className='text-primary bg-da mx-1 ' style={{width: '200px', fontSize: '25px'}}>
                        {s.empleado_servicio?.nombres_apellidos_empl.split(' ')[0]} 
                        </div>
                        <div className='text-end bg-da mx-1' style={{width: '150px'}}><SymbolSoles size={20} bottomClasss={'8'} numero={<NumberFormatMoney amount={s.tarifa_monto}/>}/> - </div> 
                        <div className='text-end bg-da mx-1' style={{width: 'auto'}}>
                          {s.circus_servicio?.nombre_servicio}
                        </div>
                        </div>
                      </li>
                    ))}
                    <li className='list-group-item' style={{backgroundColor: '#F8F8FA'}}>
                      <div className='d-flex flex-row'>
                        <div className=' bg-da mx-1 ' style={{width: '200px', fontSize: '25px'}}>
                          TOTAL VENTA:
                        </div>
                        <div className='text-end align-content-center mx-1' style={{width: '150px', fontSize: '27px'}}>
                            <SymbolSoles size={20} bottomClasss={'8'} numero={<NumberFormatMoney amount={sumaMontoServicios}/>}/> <span className='opacity-0'>-</span>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
                
                <div className='mt-5'>
                  <h3 className="fw-bold">PRODUCTOS cantidad: <span className='text-primary' style={{fontSize: '27px'}}>{venta.detalle_ventaProductos.length}</span></h3>
                  <ul className="list-group">
                    {venta.detalle_ventaProductos.map((s, i) => (
                      <li key={i} className="list-group-item">
                        <div className='d-flex flex-row'>
                        <div className='text-primary bg-da mx-1 ' style={{width: '200px', fontSize: '25px'}}>
                        {s.empleado_producto?.nombres_apellidos_empl.split(' ')[0]}
                        </div>
                        <div className='text-end bg-da mx-1' style={{width: '150px'}}><SymbolSoles size={20} bottomClasss={'8'} numero={<NumberFormatMoney amount={s.tarifa_monto}/>}/> - </div> 
                        <div className='text-end bg-da mx-1' style={{width: 'auto'}}>
                          {s.tb_producto?.nombre_producto} - {s.cantidad} unidad
                        </div>
                        </div>
                      </li>
                    ))}
                    
                    <li className='list-group-item ' style={{backgroundColor: '#F8F8FA'}}>
                      <div className='d-flex flex-row'>
                        <div className=' bg-da mx-1 ' style={{width: '200px', fontSize: '25px'}}>
                          TOTAL VENTA:
                        </div>
                        <div className='text-end bg-da mx-1 align-content-center' style={{width: '150px', fontSize: '27px'}}>
                            <SymbolSoles size={20} bottomClasss={'8'} numero={<NumberFormatMoney amount={sumaMontoProductos}/>}/> <span className='opacity-0'>-</span>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )
          }
        )
        ) : (
          <div className="alert alert-warning">No se encontraron resultados.</div>
        )
      ) : (
        // Vista resumen
        resumenes.map((grupo, idx) => {
          const servicios = grupo.ventas.flatMap((v) => v.detalle_ventaservicios);
          const productos = grupo.ventas.flatMap((v) => v.detalle_ventaProductos);
          const total = servicios.reduce((sum, s) => sum + (s.tarifa_monto || 0), 0);
          return (
            <div key={idx} className="card mb-4 shadow">
              <div className="card-body">
                <h1 className="text-center fw-bold mb-4 text-uppercase text-primary">{grupo.label}</h1>
                <ul className="list-group list-group-flush">
                  <li className="list-group-item h2" style={{backgroundColor: '#F8F8FA'}}>
                    <div className='d-flex justify-content-between'>
                        <span className=''>Total vendido: </span> <span className='text-end fs-1'><SymbolSoles size={25} bottomClasss={'20'} numero={<NumberFormatMoney amount={total}/>}/></span>
                    </div>
                  </li>
                  <li className="list-group-item h2">
                    <div className='d-flex justify-content-between'>
                    <span className=''>TOTAL Servicios vendidos:</span> <span className='text-end fs-1'>{servicios.length}</span>
                    </div>
                  </li>
                  <li className="list-group-item h2" style={{backgroundColor: '#F8F8FA'}}>
                    <div className='d-flex justify-content-between'>
                    <span className=''>TOTAL Productos vendidos:</span> <span className='text-end fs-1'>{productos.length}</span>
                    </div>
                  </li>
                  <li className="list-group-item h2">
                    <div className='d-flex justify-content-between'>
                    <span className='text-primary'>Boletas emitidas:</span>  <span className='text-end fs-1'>{grupo.ventas.length}</span>
                    </div>
                  </li>
                  <li className="list-group-item h2" style={{backgroundColor: '#F8F8FA'}}>
                    <div className='d-flex justify-content-between'>
                    <span className='text-primary'>Clientes nuevos:</span>  <span className='text-end fs-1'>{grupo.clientesNuevos.size}</span>
                    </div>
                  </li>
                  <li className="list-group-item h2">
                    <div className='d-flex justify-content-between'>
                    <span className='text-primary'>Clientes recurrentes:</span> <span className='fs-1'>{grupo.clientesRecurrentes.size}</span>
                    </div>
                  </li>
                  <li className="list-group-item h2" style={{backgroundColor: '#F8F8FA'}}>
                    <div className='d-flex justify-content-between'>
                    <span className='text-primary'>Clientes por recurrencia en el mes:</span> <span className='fs-1'>0</span>
                    </div>
                  </li>
                  <li className="list-group-item h2">
                    <div className='d-flex justify-content-between' style={{fontSize: '37px'}}>
                    <span className=''>TOTAL Clientes:</span> <span className='text-end'>{grupo.clientesVistos.size}</span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          );
        })
      )}
    </Col>

    </Row>
  );
}

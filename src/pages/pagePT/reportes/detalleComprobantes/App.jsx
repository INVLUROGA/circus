import React, { useEffect, useState, useMemo } from 'react';
import { Col, Row } from 'react-bootstrap';
import { PageBreadcrumb } from '@/components';
import { InputText } from '@/components/Form/InputText';
import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles';
import { NumberFormatMoney } from '@/components/CurrencyMask';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore';
import { useVentasStore } from '@/hooks/hookApi/useVentasStore';
import dayjs from 'dayjs';

// --- Helpers y Utils ---
import { 
  normalizar, 
  getRangeFromGroup, 
  encontrarRepetidos, 
  agruparPagos 
} from './adapters/reporteUtils';

// --- Componentes ---
import { VentaCard } from './components/VentaCard';
import { ModalResumenServicios } from './components/ModalResumenServicios';
import { ModalResumenProductos } from './components/ModalResumenProductos'; 
import { ModalVistaComprobantes } from './components/ModalVistaComprobante'; 

export const App = ({ id_empresa }) => {
  // Hooks
  const { obtenerTablaVentas, dataVentas } = useVentasStore();
  const { obtenerParametroPorEntidadyGrupo: obtenerDataComprobantes, DataGeneral: dataComprobantes } = useTerminoStore();
  const { obtenerParametroPorEntidadyGrupo: obtenerDataCategorias, DataGeneral: dataCategorias } = useTerminoStore();

  useEffect(() => {
    obtenerTablaVentas(599);
    obtenerDataComprobantes('nueva-venta', 'comprobante');
    obtenerDataCategorias('producto', 'categoria');
  }, []);

  // Estados
  const [palabras, setPalabras] = useState([]);
  const [input, setInput] = useState('');
  const [modo, setModo] = useState('comprobante');

  // Estados de Modales
  const [modalServicios, setModalServicios] = useState({ show: false, label: '', ventas: [], servicios: [] });
  const [modalProductos, setModalProductos] = useState({ show: false, label: '', productos: [] });
  const [modalVista, setModalVista] = useState({ show: false, label: '', ventas: [] });

  // Filtros y Buscador
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && input.trim() !== '') {
      const nuevaPalabra = input.trim().toLowerCase();
      if (!palabras.includes(nuevaPalabra)) setPalabras((prev) => [...prev, nuevaPalabra]);
      setInput('');
    }
  };
  
  const eliminarPalabra = (idx) => setPalabras((prev) => prev.filter((_, i) => i !== idx));

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

  // Agrupación
  const resumenes = useMemo(() => {
    if (modo === 'comprobante') return [];

    const grupos = {};
    const clientePrimeraVenta = {};
    const ordenadas = [...ventasFiltradas].sort((a, b) => new Date(b.fecha_venta) - new Date(a.fecha_venta));

    for (const venta of ordenadas) {
      const fecha = dayjs(venta.fecha_venta);
      let clave = '', label = '';
      
      switch (modo) {
        case 'dia': clave = fecha.format('YYYY-MM-DD'); label = fecha.format('dddd D [de] MMMM [del] YYYY'); break;
        case 'semana': clave = `${fecha.isoWeek()}-${fecha.year()}`; label = `Semana ${fecha.isoWeek()}, de ${fecha.format('MMMM [del] YYYY')}`; break;
        case 'mes': clave = fecha.format('MM-YYYY'); label = fecha.format('MMMM YYYY'); break;
        case 'anio': clave = fecha.format('YYYY'); label = fecha.format('YYYY'); break;
        default: break;
      }

      if (!grupos[clave]) {
        grupos[clave] = { clave, label, ventas: [], clientesVistos: new Set(), clientesNuevos: new Set(), clientesRecurrentes: new Set() };
      }
      const grupo = grupos[clave];
      grupo.ventas.push(venta);
      
      const nombreCliente = (venta.tb_cliente?.nombres_apellidos_cli || '').trim();
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
  }, [ventasFiltradas, modo]);

  // Handlers Modales
  const abrirServicios = (grupo) => {
    const rango = getRangeFromGroup(modo, grupo.clave);
    const ventasRango = (dataVentas || []).filter((v) => {
      const f = dayjs(v.fecha_venta);
      return (!rango) || (f.valueOf() >= rango.desde.valueOf() && f.valueOf() < rango.hasta.valueOf());
    });
    const servicios = ventasRango.flatMap((v) => v.detalle_ventaservicios || []);
    setModalServicios({ show: true, label: grupo.label, ventas: ventasRango, servicios });
  };

  const abrirProductos = (grupo) => {
    const rango = getRangeFromGroup(modo, grupo.clave);
    const productos = (dataVentas || []).filter((v) => {
        const f = dayjs(v.fecha_venta);
        return (!rango) || (f.valueOf() >= rango.desde.valueOf() && f.valueOf() < rango.hasta.valueOf());
    }).flatMap((v) => v.detalle_ventaProductos || []);
    setModalProductos({ show: true, label: grupo.label, productos });
  };

  const abrirVista = (grupo) => {
    const rango = getRangeFromGroup(modo, grupo.clave);
    const ventasRango = (dataVentas || []).filter((v) => {
        const f = dayjs(v.fecha_venta);
        return (!rango) || (f.valueOf() >= rango.desde.valueOf() && f.valueOf() < rango.hasta.valueOf());
    });
    setModalVista({ 
      show: true, 
      label: grupo.label, 
      ventas: ventasRango.sort((a, b) => dayjs(b.fecha_venta).valueOf() - dayjs(a.fecha_venta).valueOf()) 
    });
  };

  return (
    <>
      <PageBreadcrumb title="DETALLE DE COMPROBANTES" subName="Ventas" />
      <Row className="d-flex justify-content-center">
        <Col lg={2} style={{ position: 'sticky', left: '0', top: 140, height: 'fit-content', minHeight:'300px' }}>
          <div className="mb-4">
              <InputText type="text" className="form-control fw-bold fs-4" placeholder="BUSCADOR" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} />
              <div className="mt-2 d-flex flex-wrap">
                {palabras.map((palabra, idx) => (
                  <span key={idx} className="badge bg-primary text-light me-2 mb-2 d-flex align-items-center">
                    {palabra} <button type="button" className="btn-close btn-close-white btn-sm ms-2" onClick={() => eliminarPalabra(idx)} />
                  </span>
                ))}
              </div>
          </div>
          <select className="form-select fs-4 fw-bold" value={modo} onChange={(e) => setModo(e.target.value)}>
             <option value="comprobante">Por comprobante</option>
             <option value="dia">Por día</option>
             <option value="semana">Por semana</option>
             <option value="mes">Por mes</option>
             <option value="anio">Por año</option>
          </select>
        </Col>

        <Col lg={10}>
          {modo === 'comprobante' ? (
            ventasFiltradas.length > 0 ? (
              ventasFiltradas.map((venta) => (
                <VentaCard key={venta.id} venta={venta} dataComprobantes={dataComprobantes} dataCategorias={dataCategorias} />
              ))
            ) : <div className="alert alert-warning fs-4">No se encontraron resultados.</div>
          ) : (
            resumenes.map((grupo, idx) => {
               const totalVenta = grupo.ventas.reduce((acc, v) => {
                   const s = (v.detalle_ventaservicios||[]).reduce((t, i) => t + Number(i.tarifa_monto||0), 0);
                   const p = (v.detalle_ventaProductos||[]).reduce((t, i) => t + Number(i.tarifa_monto||0), 0);
                   return acc + s + p;
               }, 0);

               return (
                 // AÑADIDO: style={{ maxWidth: '850px', margin: '0 auto' }} para compactar
                 <div key={idx} className="card mb-4 shadow" style={{ maxWidth: '850px', margin: '0 auto' }}>
                   <div className="card-body">
                     <h1 className="text-center fw-bold mb-4 text-uppercase text-primary">{grupo.label}</h1>
                     <ul className="list-group list-group-flush fs-3">
                        <li className="list-group-item d-flex justify-content-between"><span>TOTAL Clientes:</span> <span className="fw-bold">{grupo.clientesVistos.size}</span></li>
                        <li className="list-group-item bg-light cursor-pointer d-flex justify-content-between align-items-center" style={{ cursor: 'pointer' }} onClick={() => abrirVista(grupo)}>
                            <span className="fw-bold text-primary">COMPROBANTES VÁLIDOS (Click):</span><span className="fs-2 badge bg-primary">{grupo.ventas.length}</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between align-items-center">
                           <span>Total vendido:</span><SymbolSoles size={25} bottomClasss={'20'} numero={<NumberFormatMoney amount={totalVenta} />} />
                        </li>
                        <li className="list-group-item cursor-pointer d-flex justify-content-between align-items-center" style={{ cursor: 'pointer' }} onClick={() => abrirServicios(grupo)}>
                            <span>Servicios:</span><span className="fs-2 badge bg-info text-dark">{grupo.ventas.flatMap(v=>v.detalle_ventaservicios||[]).length}</span>
                        </li>
                        <li className="list-group-item bg-light cursor-pointer d-flex justify-content-between align-items-center" style={{ cursor: 'pointer' }} onClick={() => abrirProductos(grupo)}>
                            <span>Productos:</span><span className="fs-2 badge bg-secondary">{grupo.ventas.flatMap(v=>v.detalle_ventaProductos||[]).length}</span>
                        </li>
                        <div className="mt-3 p-2 border rounded">
                            <li className="list-group-item d-flex justify-content-between text-secondary border-0 p-1"><span>Nuevos:</span> <span>{grupo.clientesNuevos.size}</span></li>
                            <li className="list-group-item d-flex justify-content-between text-secondary border-0 p-1"><span>Recurrentes:</span> <span>{grupo.clientesRecurrentes.size}</span></li>
                            <li className="list-group-item d-flex justify-content-between text-secondary border-0 p-1"><span>Recurrencia periodo:</span> <span>{encontrarRepetidos(grupo.ventas).cantidadRep}</span></li>
                        </div>
                        
                        {/* SECCIÓN DE PAGOS MODIFICADA PARA TAMAÑO GRANDE */}
                        <div className="mt-4">
                            <h5 className="text-dark fw-bold mb-3 text-uppercase border-bottom pb-2">Desglose de Pagos:</h5>
                            {agruparPagos(grupo.ventas).resumenSoloSuma.map((formas, i) => (
                               <li key={i} className="list-group-item bg-light d-flex justify-content-between align-items-center py-3 my-1 border rounded">
                                  <span className="fw-bold fs-4 text-uppercase text-secondary">{formas.forma_pago}</span>
                                  <div className="fs-3 fw-bold text-dark">
                                      <SymbolSoles size={25} bottomClasss={'6'} numero={<NumberFormatMoney amount={formas.suma_total_parcial} />} />
                                  </div>
                               </li>
                            ))}
                        </div>

                     </ul>
                   </div>
                 </div>
               );
            })
          )}
        </Col>
      </Row>

      <ModalResumenServicios show={modalServicios.show} onHide={() => setModalServicios({ ...modalServicios, show: false })} label={modalServicios.label} ventasRaw={modalServicios.ventas} serviciosRaw={modalServicios.servicios} />
      <ModalResumenProductos show={modalProductos.show} onHide={() => setModalProductos({...modalProductos, show: false})} label={modalProductos.label} productosRaw={modalProductos.productos} />
      <ModalVistaComprobantes show={modalVista.show} onHide={() => setModalVista({...modalVista, show: false})} label={modalVista.label} ventas={modalVista.ventas} />
    </>
  );
};
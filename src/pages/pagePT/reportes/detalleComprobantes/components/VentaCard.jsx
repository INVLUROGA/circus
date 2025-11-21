import React from 'react';
import { Badge } from 'react-bootstrap';
import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles';
import { DateMaskString, NumberFormatMoney, FUNMoneyFormatter } from '@/components/CurrencyMask';
import { agruparServiciosPorEmpleado } from '../adapters/reporteUtils'; 

export const VentaCard = ({ venta, dataComprobantes, dataCategorias }) => {
  const sumaMontoProductos = (venta.detalle_ventaProductos || []).reduce((total, item) => total + (item?.tarifa_monto || 0), 0);
  
  // Filtros de servicios
  const serviciosPeluqueria = (venta.detalle_ventaservicios || []).filter(vserv => vserv?.circus_servicio?.id_categoria !== 1478);
  const serviciosManicure = (venta.detalle_ventaservicios || []).filter(vserv => vserv?.circus_servicio?.id_categoria === 1478);
  
  const gruposPeluqueria = agruparServiciosPorEmpleado(serviciosPeluqueria);
  const gruposManicure = agruparServiciosPorEmpleado(serviciosManicure);
  
  const totalPeluqueria = serviciosPeluqueria.reduce((t, i) => t + (i?.tarifa_monto || 0), 0);
  const totalManicure = serviciosManicure.reduce((t, i) => t + (i?.tarifa_monto || 0), 0);
  const grandTotal = totalPeluqueria + totalManicure + sumaMontoProductos;

  return (
    // AÑADIDO: style={{ maxWidth: '850px', margin: '0 auto' }} para compactar igual que el resumen
    <div className="border border-primary border-4 mb-5" style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div className="card-body fs-3">
        {/* Cabecera Cliente */}
        <h1 className="text-center fw-bold mb-3">{(venta.tb_cliente?.nombres_apellidos_cli || '').trim()}</h1>
        
        {/* Fecha y Hora */}
        <div className="d-flex justify-content-between">
          <div style={{ width: '100%' }}>
            <span className="text-primary">{DateMaskString(venta.fecha_venta, 'dddd DD [DE] MMMM')}</span> {DateMaskString(venta.fecha_venta, 'YYYY')}
          </div>
          <div style={{ width: '100%' }}><strong>HORA: </strong>{DateMaskString(venta.fecha_venta, 'hh:mm A')}</div>
        </div>

        {/* Comprobante y Total */}
        <div className="d-flex justify-content-between mb-3 align-items-center">
           <div className="text-primary" style={{ width: '100%', fontSize: '25px' }}>
             <strong>{(dataComprobantes || []).find((c) => c.value === venta.id_tipoFactura)?.label} {venta.numero_transac ? ':' : 'CANJE'}</strong> {venta.numero_transac}
           </div>
           <div className="text-primary ml-4" style={{ width: '100%', fontSize: '34px' }}>
             <strong>TOTAL: </strong><SymbolSoles size={35} bottomClasss={'8'} numero={<NumberFormatMoney amount={grandTotal} />} />
           </div>
        </div>

        {/* Pagos */}
        <div>
          {(venta?.detalleVenta_pagoVenta || []).map((e, i) => (
             <div key={i} className="timeline-item-info border border-4 p-2 border-gray mb-2">
               <span className="mb-1 d-block fs-3">
                 <span className="fw-light">FORMA DE PAGO: </span>{e.parametro_forma_pago?.label_param}<br />
                 {e.parametro_tarjeta && <><span className="fw-light">TARJETA: </span>{e.parametro_tarjeta.label_param} <br/></>}
                 {e.parametro_tipo_tarjeta && <><span className="fw-light">TIPO DE TARJETA:</span> {e.parametro_tipo_tarjeta.label_param}</>}
               </span>
               <span className="fw-light fs-3">IMPORTE: </span>
               <span className="fw-bold text-primary">
                 <SymbolSoles size={25} bottomClasss={'10'} numero={FUNMoneyFormatter(e.parcial_monto, e.parametro_forma_pago?.id_param == 535 ? '$' : 'S/.')} />
               </span>
             </div>
          ))}
        </div>

        {/* Renderizar Bloques de Servicios (Peluqueria / Manicure) */}
        {serviciosPeluqueria.length > 0 && (
           <ServiceBlock 
             title="Servicios peluqueria" 
             count={serviciosPeluqueria.length} 
             groups={gruposPeluqueria} 
             total={totalPeluqueria} 
             dataCategorias={dataCategorias} 
             variant="primary" 
           />
        )}
        
        {serviciosManicure.length > 0 && (
           <ServiceBlock 
             title="Servicios MANICURE" 
             count={serviciosManicure.length} 
             groups={gruposManicure} 
             total={totalManicure} 
             dataCategorias={dataCategorias} 
             variant="manicure" 
           />
        )}

        {/* Productos */}
        {(venta.detalle_ventaProductos || []).length > 0 && (
          <div className="mt-5">
             <h3 className="fw-bold">PRODUCTOS cantidad: <span style={{ fontSize: '27px' }}>{(venta.detalle_ventaProductos || []).length}</span></h3>
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
                {/* Footer Total Productos */}
                <li className="list-group-item" style={{ backgroundColor: '#F8F8FA' }}>
                  <div className="d-flex flex-row">
                    <div className="mx-1" style={{ width: '200px', fontSize: '25px' }}>TOTAL VENTA:</div>
                    <div className="text-end mx-1 align-content-center" style={{ width: '150px', fontSize: '27px' }}>
                      <SymbolSoles size={30} bottomClasss={'8'} numero={<NumberFormatMoney amount={sumaMontoProductos} />} />
                    </div>
                  </div>
                </li>
             </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// Sub-componente interno para evitar repetir código entre Manicure y Peluquería
const ServiceBlock = ({ title, count, groups, total, dataCategorias, variant }) => (
  <div className='mt-3'>
    <h3 className={`fw-bold text-${variant}`} style={{fontSize: '34px'}}>
      {title}: <span className="ml-2 text-black">{count}</span>
    </h3>
    <ul className="list-group">
      {groups.map((g) => (
        <li key={g.id_empl} className="list-group-item p-0">
           {/* Encabezado del Empleado */}
           <div className={`bg-${variant} text-white px-2 py-1 d-flex justify-content-between align-items-center`}>
              <strong>{(g.empleado || "-").split(" ")[0]}</strong>
              <div className="text-end">
                 <SymbolSoles size={16} bottomClasss={"4"} numero={<NumberFormatMoney amount={g.total} />} />
              </div>
           </div>

           {/* Lista de items del empleado */}
           <ul className="list-group list-group-flush">
              {g.items.map((s, i) => (
                <li key={`${g.id_empl}-${i}`} className="list-group-item m-0 p-0">
                  <div className="d-flex flex-row justify-content-between">
                    <div className={`text-${variant} mx-1`} style={{ width: "100%", fontSize: "16px" }}>
                      {(dataCategorias.find(c => c.value == s?.circus_servicio?.id_categoria)?.label ?? "-")} / {s?.circus_servicio?.nombre_servicio ?? "-"}
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

    {/* Footer del bloque Total */}
    <ul className="list-group">
        <li className={`list-group-item px-0 bg-${variant} text-white`}>
            <div className="d-flex flex-row justify-content-between">
                <div className="mx-1" style={{ width: '100%', fontSize: '34px' }}>TOTAL:</div>
                <div className="text-end mx-2" style={{ width: '150px', fontSize: '34px' }}>
                    <SymbolSoles size={30} bottomClasss={'8'} numero={<NumberFormatMoney amount={total} />} />
                </div>
            </div>
        </li>
    </ul>
  </div>
);
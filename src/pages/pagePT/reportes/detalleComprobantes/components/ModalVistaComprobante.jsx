import React from 'react';
import { Modal, Button, Badge } from 'react-bootstrap';
import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles';
import { NumberFormatMoney, DateMaskString } from '@/components/CurrencyMask';

export const ModalVistaComprobantes = ({ show, onHide, label, ventas }) => {
  return (
    <Modal show={show} onHide={onHide} size="xl" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Comprobantes — {label}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-light">
        {ventas.length === 0 ? (
          <div className="text-center py-5 text-muted fs-4">No hay ventas en el rango seleccionado.</div>
        ) : (
          ventas.map((venta) => {
            const servicios = venta.detalle_ventaservicios || [];
            const productos = venta.detalle_ventaProductos || [];
            const total = [...servicios, ...productos].reduce((s, x) => s + Number(x?.tarifa_monto || 0), 0);

            return (
              <div className="card mb-3 shadow-sm border-0" key={venta.id}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                    <div>
                      <h5 className="fw-bold m-0 text-primary">
                        {(venta.tb_cliente?.nombres_apellidos_cli || '').trim()}
                      </h5>
                      <small className="text-muted">
                        {DateMaskString(venta.fecha_venta, 'DD/MM/YYYY hh:mm A')} — {venta.numero_transac || 'S/N'}
                      </small>
                    </div>
                    <div className="text-end">
                       <SymbolSoles size={22} bottomClasss={'6'} numero={<NumberFormatMoney amount={total} />} />
                    </div>
                  </div>

                  <ul className="list-group list-group-flush">
                    {servicios.map((s, i) => (
                      <li key={`s-${i}`} className="list-group-item d-flex justify-content-between align-items-center px-0 py-1 border-0">
                         <div className="d-flex align-items-center gap-2 text-truncate">
                            <Badge bg="success" pill>SERV</Badge>
                            <span className="fw-bold text-secondary" style={{fontSize:'0.9rem'}}>
                                {s.circus_servicio?.nombre_servicio}
                            </span>
                            <small className="text-muted fst-italic">
                                — {(s.empleado_servicio?.nombres_apellidos_empl || '-').split(' ')[0]}
                            </small>
                         </div>
                         <div className="fw-bold">
                            <NumberFormatMoney amount={s.tarifa_monto} />
                         </div>
                      </li>
                    ))}

                    {productos.map((p, i) => (
                      <li key={`p-${i}`} className="list-group-item d-flex justify-content-between align-items-center px-0 py-1 border-0 bg-light rounded px-2 mt-1">
                         <div className="d-flex align-items-center gap-2 text-truncate">
                            <Badge bg="info" pill>PROD</Badge>
                            <span className="fw-bold text-secondary" style={{fontSize:'0.9rem'}}>
                                {p.tb_producto?.nombre_producto}
                            </span>
                            <small className="text-muted">
                                (x{p.cantidad}) — {(p.empleado_producto?.nombres_apellidos_empl || '-').split(' ')[0]}
                            </small>
                         </div>
                         <div className="fw-bold">
                            <NumberFormatMoney amount={p.tarifa_monto} />
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
        <Button variant="secondary" onClick={onHide}>Cerrar</Button>
      </Modal.Footer>
    </Modal>
  );
};
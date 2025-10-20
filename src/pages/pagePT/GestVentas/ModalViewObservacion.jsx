import React, { useEffect, useMemo, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import Select from 'react-select';
import { TabView, TabPanel } from 'primereact/tabview';
import { Link } from 'react-router-dom';
import { Table } from 'react-bootstrap';

import { DateMask, FormatoDateMask, FUNMoneyFormatter } from '@/components/CurrencyMask';
import { useVentasStore } from '@/hooks/hookApi/useVentasStore';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore';
import { useGestVentasStore } from './useGestVentasStore';
import { arrayCategoriaProducto, arrayFacturas } from '@/types/type';

// -------------------- Utils fecha (Lima -05:00) --------------------
const pad = (n) => String(n).padStart(2, '0');

const toInputDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const toInputDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Construye ISO asumiendo hora local Lima (-05:00)
const toIsoFromLocalDate = (yyyyMmDd) =>
  yyyyMmDd ? new Date(`${yyyyMmDd}T00:00:00-05:00`).toISOString() : null;

const toIsoFromLocalDateTime = (yyyyMmDdThhmm) =>
  yyyyMmDdThhmm ? new Date(`${yyyyMmDdThhmm}:00-05:00`).toISOString() : null;

// ==================== Componente ====================
export const ModalViewObservacion = ({
  show,
  onHide,
  id,
  // Opcional: pasa tu lista real de clientes como [{ value:id_cli, label:nombre_completo }, ...]
  clientesOptions = [],
}) => {
  const { obtenerVentaporId, dataVentaxID, isLoading } = useVentasStore();
  const { obtenerParametroPorEntidadyGrupo: obtenerDataOrigen, DataGeneral: dataOrigen } = useTerminoStore();
  const { putVentas } = useGestVentasStore();

  // ------- Toggles de edición -------
  const [editOrigen, setEditOrigen] = useState(false);
  const [editncomprobante, setEditncomprobante] = useState(false);
  const [editFechaVenta, setEditFechaVenta] = useState(false);
  const [editCliente, setEditCliente] = useState(false);

  // ------- Formularios -------
  const [formOrigen, setFormOrigen] = useState({ id_origen: null });
  const [formFechaVenta, setFormFechaVenta] = useState({ fecha_venta: '' }); // input datetime-local
  const [formNComprobante, setFormNComprobante] = useState({ numero_transac: '' }); // input datetime-local
  const [formCliente, setFormCliente] = useState({ id_cli: null });

  // ------- Carga inicial -------
  useEffect(() => {
    if (!id) return;
    obtenerVentaporId(id);
    obtenerDataOrigen('nueva-venta-circus', 'origen');
  }, [id]);

  // ------- Sincronización cuando llega la venta (si NO estás editando) -------
  useEffect(() => {
    const v = dataVentaxID?.[0];
    if (!v) return;

    if (!editOrigen) setFormOrigen({ id_origen: v?.id_origen ?? null });
    if (!editCliente) setFormCliente({ id_cli: v?.id_cli ?? null });
    if (!editFechaVenta) setFormFechaVenta({ fecha_venta: toInputDate(v?.fecha_venta) });
  }, [dataVentaxID, editOrigen, editCliente, editFechaVenta]);

  // ------- Opciones de Origen -------
  const opcionesOrigen = useMemo(() => (Array.isArray(dataOrigen) ? dataOrigen : []), [dataOrigen]);

  // ------- Origen -------
  const abrirEditOrigen = () => setEditOrigen(true);
  const cerrarEditOrigen = () => setEditOrigen(false);
  const onChangeOrigen = (opt) => setFormOrigen({ id_origen: opt?.value ?? null });
  const submitOrigen = () => {
    if (!formOrigen.id_origen) return cerrarEditOrigen();
    putVentas({ id_origen: formOrigen.id_origen }, dataVentaxID[0].id, obtenerVentaporId);
    cerrarEditOrigen();
  };

  // ------- Fecha de venta -------
  const abrirEditFechaVenta = () => {
    const v = dataVentaxID?.[0];
    setFormFechaVenta({ fecha_venta: toInputDateTime(v?.fecha_venta) });
    setEditFechaVenta(true);
  };
  
  const cerrarEditFechaVenta = () => setEditFechaVenta(false);
  const onChangeFechaVenta = (e) => setFormFechaVenta({ fecha_venta: e.target.value });
  const submitFechaVenta = () => {
    const iso = toIsoFromLocalDateTime(formFechaVenta.fecha_venta);
    if (!iso) return cerrarEditFechaVenta();
    putVentas({ fecha_venta: iso }, dataVentaxID[0].id, obtenerVentaporId);
    cerrarEditFechaVenta();
  };

  // ------- Cliente -------
  const abrirEditCliente = () => {
    const v = dataVentaxID?.[0];
    setFormCliente({ id_cli: v?.id_cli ?? null });
    setEditCliente(true);
  };
  const cerrarEditCliente = () => setEditCliente(false);
  const onChangeCliente = (opt) => setFormCliente({ id_cli: opt?.value ?? null });
  const submitCliente = () => {
    if (!formCliente.id_cli) return cerrarEditCliente();
    putVentas({ id_cli: formCliente.id_cli }, dataVentaxID[0].id, obtenerVentaporId);
    cerrarEditCliente();
  };
  
  // ------- NUMERO DE COMPROBANTE -------
  const abrirEditNComprobante = () => {
    const v = dataVentaxID?.[0];
    setFormNComprobante({ numero_transac: v.numero_transac});
    setEditncomprobante(true);
  };
  
  const cerrarEditNComprobante = () => setEditncomprobante(false);
  const onChangeNComprobante = (e) => setFormNComprobante({ numero_transac: e.target.value });
  const submitNComprobante = () => {
    if (!formNComprobante.numero_transac) return cerrarEditNComprobante();
    putVentas({ numero_transac: formNComprobante.numero_transac }, dataVentaxID[0].id, obtenerVentaporId);
    cerrarEditNComprobante();
  };


  // ------- Footer -------
  const footer = (
    <>
      <Button className="float-left" label="GENERAR PDF" icon="pi pi-file-pdf fs-3" outlined onClick={onHide} />
      <Button label="Cerrar" icon="pi pi-times" outlined onClick={onHide} />
    </>
  );

  const venta = dataVentaxID?.[0];

  return (
    <Dialog
      visible={show}
      style={{ width: '50rem', height: '80rem' }}
      breakpoints={{ '960px': '75vw', '641px': '90vw' }}
      header={`Venta #${id ?? ''}`}
      modal
      className="p-fluid"
      footer={footer}
      onHide={onHide}
    >
      {isLoading ? (
        'Cargando...'
      ) : !venta ? (
        'No se encontró la venta.'
      ) : (
        <TabView>
          
          {/* ===================== Info de venta ===================== */}
          <TabPanel header="Información de venta">
            
            <ul className="list-none">
              {/* Recepción */}
              <li className="mb-4 d-flex justify-content-between">
                <span>RECEPCIÓN:</span>
                <span style={{ paddingRight: 40 }}>
                  {venta?.tb_empleado?.nombres_apellidos_empl ?? '—'}
                </span>
              </li>

              {/* Cliente (editable) */}
              <li className="mb-4 d-flex justify-content-between">
                <span>CLIENTE:</span>
                <span className="d-flex align-items-center" style={{ paddingRight: 40, minWidth: 320 }}>
                  {editCliente ? (
                    <>
                      <div style={{ minWidth: 260 }}>
                        <Select
                          placeholder="Seleccionar cliente"
                          className="react-select"
                          classNamePrefix="react-select"
                          options={clientesOptions}
                          value={clientesOptions.find(o => o.value === formCliente.id_cli) ?? null}
                          onChange={onChangeCliente}
                          isClearable
                        />
                      </div>
                      <i className="pi pi-check hover-text cursor-pointer ml-4" onClick={submitCliente} />
                      <i className="pi pi-times hover-text cursor-pointer ml-4" onClick={cerrarEditCliente} />
                    </>
                  ) : (
                    <>
                      {venta?.tb_cliente?.nombres_apellidos_cli ?? '—'}
                      <i className="pi pi-pencil hover-text cursor-pointer ml-4" onClick={abrirEditCliente} />
                    </>
                  )}
                </span>
              </li>

              {/* Origen (editable) */}
              <li className="mb-4 d-flex justify-content-between">
                <span>Origen:</span>
                <span className="d-flex align-items-center" style={{ paddingRight: 40, minWidth: 320 }}>
                  {editOrigen ? (
                    <>
                      <div style={{ minWidth: 260 }}>
                        <Select
                          placeholder="Seleccionar origen"
                          className="react-select"
                          classNamePrefix="react-select"
                          options={opcionesOrigen}
                          value={opcionesOrigen.find(o => o.value === formOrigen.id_origen) ?? null}
                          onChange={onChangeOrigen}
                          isClearable
                        />
                      </div>
                      <i className="pi pi-check hover-text cursor-pointer ml-4" onClick={submitOrigen} />
                      <i className="pi pi-times hover-text cursor-pointer ml-4" onClick={cerrarEditOrigen} />
                    </>
                  ) : (
                    <>
                      {opcionesOrigen.find(o => o.value === venta?.id_origen)?.label ?? '—'}
                      <i className="pi pi-pencil hover-text cursor-pointer ml-4" onClick={abrirEditOrigen} />
                    </>
                  )}
                </span>
              </li>

              {/* Comprobante */}
              <li className="mb-4 d-flex justify-content-between">
                <span>{arrayFacturas.find(e => e.value === venta?.id_tipoFactura)?.label ?? 'Comprobante'}:</span>
                {/* <span style={{ paddingRight: 40 }}>{venta?.numero_transac ?? '—'}</span> */}
                {editncomprobante ? (
                    <>
                      <input
                        name="numero_transac"
                        className="form-control"
                        value={formNComprobante.numero_transac ?? ''}
                        onChange={onChangeNComprobante}
                        required
                        style={{ minWidth: 220 }}
                      />
                      <i className="pi pi-check hover-text cursor-pointer ml-4" onClick={submitNComprobante} />
                      <i className="pi pi-times hover-text cursor-pointer ml-4" onClick={cerrarEditNComprobante} />
                    </>
                  ) : (
                    <>
                      {formNComprobante.numero_transac ?? '—'}
                      <i className="pi pi-pencil hover-text cursor-pointer ml-4" onClick={abrirEditNComprobante} />
                    </>
                  )}
              </li>

              {/* Fecha de venta (editable) */}
              <li className="mb-4 d-flex justify-content-between">
                <span>Fecha en la que realizó la venta:</span>
                <span className="d-flex align-items-center" style={{ paddingRight: 40 }}>
                  {editFechaVenta ? (
                    <>
                      <input
                        type="datetime-local"
                        name="fecha_venta"
                        className="form-control"
                        value={formFechaVenta.fecha_venta ?? ''}
                        onChange={onChangeFechaVenta}
                        required
                        style={{ minWidth: 220 }}
                      />
                      <i className="pi pi-check hover-text cursor-pointer ml-4" onClick={submitFechaVenta} />
                      <i className="pi pi-times hover-text cursor-pointer ml-4" onClick={cerrarEditFechaVenta} />
                    </>
                  ) : (
                    <>
                      {FormatoDateMask(venta?.fecha_venta, 'D [de] MMMM [del] YYYY [a las] h:mm A')}
                      <i className="pi pi-pencil hover-text cursor-pointer ml-4" onClick={abrirEditFechaVenta} />
                    </>
                  )}
                </span>
              </li>

              {/* Observación */}
              <li className="mb-4 d-flex justify-content-between">
                <span>Observación:</span>
                <span style={{ paddingRight: 40, textAlign: 'right' }}>
                  {venta?.observacion ?? '—'}
                </span>
              </li>
            </ul>
          </TabPanel>

          {/* ===================== Compras ===================== */}
          <TabPanel header="Compras">
            
            <pre>
              {
                JSON.stringify(venta, null, 2)
              }
            </pre>
            {venta?.detalle_ventaProductos?.length > 0 && (
              <>
                <div className="text-2xl font-bold text-800 mb-3">PRODUCTOS:</div>
                {venta.detalle_ventaProductos.map((e, idx) => (
                  <Table key={idx} responsive hover className="table-centered table-nowrap mb-3">
                    <tbody>
                      <tr>
                        <td>
                          <h5 className="font-14 my-1">
                            <Link to="" className="text-body">
                              {e.tb_producto?.nombre_producto}
                            </Link>
                          </h5>
                          <span className="text-muted font-13">
                            TIPO: {arrayCategoriaProducto.find(i => i.value === e.tb_producto?.id_categoria)?.label ?? '—'}
                          </span>
                        </td>
                        <td>
                          <span className="text-muted font-13">CANTIDAD</span> <br />
                          <span className="font-14 mt-1 fw-normal">{e.cantidad}</span>
                        </td>
                        <td>
                          <span className="text-muted font-13">MONTO</span> <br />
                          <span className="font-14 mt-1 fw-normal">{FUNMoneyFormatter(e.tarifa_monto)}</span>
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                ))}
              </>
            )}
                        {venta?.detalle_ventaservicios?.length > 0 && (
              <>
                <div className="text-2xl font-bold text-800 mb-3">SERVICIO:</div>
                {venta.detalle_ventaservicios.map((e, idx) => (
                  <Table key={idx} responsive hover className="table-centered table-nowrap mb-3">
                    <tbody>
                      <tr>
                        <td>
                          <h5 className="font-14 my-1">
                            <Link to="" className="text-body">
                              {e.circus_servicio?.nombre_producto}
                            </Link>
                          </h5>
                          <span className="text-muted font-13">
                            TIPO: {arrayCategoriaProducto.find(i => i.value === e.tb_producto?.id_categoria)?.label ?? '—'}
                          </span>
                        </td>
                        <td>
                          <span className="text-muted font-13">CANTIDAD</span> <br />
                          <span className="font-14 mt-1 fw-normal">{e.cantidad}</span>
                        </td>
                        <td>
                          <span className="text-muted font-13">MONTO</span> <br />
                          <span className="font-14 mt-1 fw-normal">{FUNMoneyFormatter(e.tarifa_monto)}</span>
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                ))}
              </>
            )}
          </TabPanel>

          {/* ===================== Pagos ===================== */}
          <TabPanel header="Pagos">
            {venta?.detalleVenta_pagoVenta?.length > 0 &&
              venta.detalleVenta_pagoVenta.map((e, idx) => (
                <div key={idx} className="timeline-item-info border border-4 p-2 border-gray mb-3">
                  <h4 className="fw-bold mb-1 d-block">
                    | FORMA DE PAGO: {e.parametro_forma_pago?.label_param}
                    {e.parametro_tipo_tarjeta ? ` || TIPO DE TARJETA: ${e.parametro_tipo_tarjeta.label_param}` : ''}
                    {e.parametro_banco ? ` || BANCO: ${e.parametro_banco.label_param}` : ''}
                    {e.parametro_tarjeta ? ` || TARJETA: ${e.parametro_tarjeta.label_param}` : ''} |
                  </h4>
                  <small>
                    IMPORTE:
                    <span className="fw-bold">
                      {' '}
                      {FUNMoneyFormatter(e.parcial_monto, e.parametro_forma_pago?.id_param === 535 ? '$' : 'S/.')}
                    </span>
                  </small>
                  <br />

                  <small>
                    FECHA DE PAGO:
                    <span className="fw-bold">
                      {' '}
                      {DateMask({ date: e.fecha_pago, format: 'D [de] MMMM [del] YYYY [a las] h:mm A' })}
                    </span>
                  </small>
                  <br />

                  <small>
                    N° OPERACIÓN:
                    <span className="fw-bold"> {e.n_operacion}</span>
                  </small>

                  <p className="mb-0 pb-2">
                    <small className="text-muted">{e.observacion}</small>
                  </p>
                </div>
              ))}
          </TabPanel>
        </TabView>
      )}
    </Dialog>
  );
};

import { Dialog } from 'primereact/dialog'
import React, { useEffect, useMemo, useState } from 'react'
import { Col, Row, Table } from 'react-bootstrap'
import Select from 'react-select'
import { useComandasStore } from './useComandasStore'
import { useForm } from '@/hooks/useForm'
import { arrayEstadosVenta } from '@/types/type'
import { Button } from 'primereact/button'
import { DateMask, NumberFormatMoney } from '@/components/CurrencyMask'

// -------------------- helpers --------------------
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100
const pctOptions = 
[
    {value: 0, label: '0%'},
    {value: 5, label: '5%'},
    {value: 10, label: '-10%'},
    {value: 15, label: '-15%'},
    {value: 20, label: '-20%'},
    {value: 25, label: '-25%'},
    {value: 30, label: '-30%'},
    {value: 35, label: '-35%'},
    {value: 40, label: '-40%'},
    {value: 45, label: '-45%'},
    {value: 50, label: '-50%'},
    // INCREMENTO
    // {value: -10, label: '10%'},
    // {value: -15, label: '15%'},
    // {value: -20, label: '20%'},
    // {value: -25, label: '25%'},
    // {value: -30, label: '30%'},
    // {value: -35, label: '35%'},
    // {value: -40, label: '40%'},
    // {value: -45, label: '45%'},
    // {value: -50, label: '50%'},
].map(v => ({ value: v.value, label: `${v.label}` }))

// Estructura de opción esperada para productos/servicios:
// { tipo: 'producto' | 'servicio', value, label, subCategoria, precio, duracion, uid }
const mapToOption = (x, tipo) => ({
  tipo,
  value: x.value || 0,
  label: x.nombre || x.label || x.nombre_producto || x.nombre_servicio || '',
  subCategoria: x.subCategoria || (tipo === 'producto' ? 'PRODUCTO' : 'SERVICIO'),
  precio: x.precio ?? x.prec_venta ?? 0,
  prec_compra: 0,
  duracion: x.duracion ?? 0,
  uid: `${x.uid}`
})

const rowTemplate = (i = 1) => ({
  id: crypto.randomUUID?.() || `${Date.now()}-${i}`,
  clase: null,                 // 'producto' | 'servicio'
  colaborador: null,           // {value,label}
  item: null,                  // opción de producto/servicio
  porcentaje: pctOptions[0],   // default 10%
  precioBase: 0,               // precio del item
  precio_compra: 0,
})

// -------------------- componente --------------------
const customcomandas = { id_cli: 0, observacion: '', status_remove: 0 }

export const ModalCustomComanda2 = ({
  onHide,
  show,
  // pásame estos arreglos desde tu store/prop:
  productos = [],              // [{id, nombre_producto, prec_venta, ...}]
  servicios = [],              // [{id, nombre_servicio, precio, ...}]
  colaboradores = []           // [{value, label}]
}) => {
  const { obtenerClientes, DataClientes, onPostComandas } = useComandasStore()
  const { id_cli, observacion, status_remove, onInputChange, onInputChangeReact, onResetForm } = useForm(customcomandas)

  const opcionesProductos = useMemo(
    () => (productos || []).map((p) => mapToOption({ ...p, nombre: p.nombre_producto,  label: p.label }, 'producto')),
    [productos]
  )
  const opcionesServicios = useMemo(
    () => (servicios || []).map((s) => mapToOption({ ...s, nombre: s.nombre_servicio, label: s.label }, 'servicio')),
    [servicios]
  )

  const [rows, setRows] = useState([rowTemplate()])

  useEffect(() => {
    if (show) obtenerClientes()
  }, [show])

  const computeMonto = (r) => round2((r.precioBase || 0) * ((r.porcentaje?.value || 0) / 100))

  const total = useMemo(() => rows.reduce((acc, r) => acc + r.precioBase - computeMonto(r), 0), [rows])
  const precioBaseTotal = useMemo(() => rows.reduce((acc, r) => acc + r.precioBase, 0), [rows])
  console.log({rows});
  
  const onChangeClase = (idx, claseOpt) => {
    setRows((prev) => {
      const cp = [...prev]
      cp[idx] = { ...cp[idx], clase: claseOpt?.value ?? null, item: null, precioBase: 0, prec_compra: 1 }
      return cp
    })
  }

  const onChangeColaborador = (idx, colab) => {
    setRows((prev) => {
      const cp = [...prev]
      cp[idx] = { ...cp[idx], colaborador: colab || null }
      return cp
    })
  }

  const onChangeItem = (idx, item) => {
    setRows((prev) => {
      const cp = [...prev]
      cp[idx] = { ...cp[idx], item: item || null, precioBase: item?.precio ?? 0 }
      return cp
    })
  }

  const onChangePct = (idx, pct) => {
    setRows((prev) => {
      const cp = [...prev]
      cp[idx] = { ...cp[idx], porcentaje: pct || pctOptions[0] }
      return cp
    })
  }

  const addRow = () => setRows((prev) => [...prev, rowTemplate(prev.length + 1)])

  const removeRow = (idx) => setRows((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx))

  const onClickModalAgregarComanda = () => {
    // arma el payload de detalle tal cual lo necesitas:
    const detalle = rows.map(r => ({
      clase: r.clase,                               // 'producto' | 'servicio'
      colaborador: r.colaborador?.value || null,
      colaborador_label: r.colaborador?.label || '',
      item_id: r.item?.value || null,
      item_label: r.item?.label || '',
      porcentaje: r.porcentaje?.value || 0,
      precio_base: r.precioBase,
      monto: computeMonto(r),
      id_producto: r.item?.value,
      id_servicio: r.item?.value,
      id_empl: r.colaborador.value,
      id_empresa: 599,
      cantidad: 1,
      tarifa_monto: computeMonto(r),
      prec_compra: 0,
    }))

    onPostComandas({
      id_cli,
      observacion,
      status_remove,
      fecha_venta: new Date(),
      detalle
    })

    // onResetForm()
    // setRows([rowTemplate()])
    // onHide?.()
  }

  const onClickModalCancelarComanda = () => {
    onResetForm()
    setRows([rowTemplate()])
    onHide?.()
  }
  
  const footerButtons = (
    <>
    </>
  )
  console.log({rows, opcionesProductos, opcionesServicios, id_cli, status_remove, fecha_venta: new Date(), observacion, });
  return (
    <Dialog footer={footerButtons} style={{ width: '100%', height: '100rem' }} onHide={onHide} visible={show} header={'AGREGAR COMANDA'} position='top'>
      <form>
        <Row>
          <Col xl={3} sm={12}>
            <div className='mb-3'>
              <label>CLIENTE:</label>
              <Select
                onChange={(e) => onInputChangeReact(e, 'id_cli')}
                name="id_cli"
                placeholder={'Seleccionar el cliente'}
                className="react-select"
                classNamePrefix="react-select"
                options={DataClientes}
                value={DataClientes.find(o => o.value === id_cli) || null}
                required
              />
            </div>
          </Col>

          <Col xl={3} sm={12}>
            <div className='mb-3'>
              <label>ESTADO:</label>
              <Select
                onChange={(e) => onInputChangeReact(e, 'status_remove')}
                name="status_remove"
                placeholder={'Seleccionar el estado'}
                className="react-select"
                classNamePrefix="react-select"
                options={arrayEstadosVenta}
                value={arrayEstadosVenta.find(o => o.value === status_remove) || null}
                required
              />
            </div>
          </Col>

          <Col xl={6} sm={12}>
            <div className='mb-3'>
              FECHA: <DateMask date={new Date()} format={'dddd DD [DE] MMMM [DEL] YYYY'} />
            </div>
          </Col>

          <Col xl={12} sm={12}>
            <Table striped bordered>
              <thead className='bg-primary fs-2'>
                <tr>
                  <th><div className='text-white'>#</div></th>
                  <th><div className='text-white'>CLASE</div></th>
                  <th><div className='text-white'>COLABORADOR</div></th>
                  <th><div className='text-white text-center'>SERVICIO <br/>
                    <div className=' d-flex justify-content-center mt-3'><div className='text-center' style={{border: '2px solid white', width: '60px', height: '1px'}}></div></div>
                    <br/>  PRODUCTO</div></th>
                  <th><div className='text-white'><div>PRECIO LISTA</div></div></th>
                  <th><div className='text-white'><div>PRECIO COMPRA</div></div></th>
                  <th  style={{width: '300px'}}><div className='text-change text-center'>PROMO.
                    <br/>
                    <div className=' d-flex justify-content-center mt-3'><div className='text-center' style={{border: '2px solid #CD1014', width: '60px', height: '1px'}}></div></div>
                    <br/> 
                % DESC.</div></th>
                  <th className='' style={{width: '100px', margin: '0'}}><div className='text-white'>TOTAL <br/>CON<br/> DESC. <br/>A <br/> PAGAR <br/> (S/)</div></th>
                  <th></th>
                </tr>
              </thead>
              <tbody className='fs-2'>
                {rows.map((r, idx) => {
                  const claseOptions = [
                    { value: 'producto', label: 'Producto' },
                    { value: 'servicio', label: 'Servicio' }
                  ]
                  const itemsOptions = r.clase === 'producto' ? opcionesProductos
                    : r.clase === 'servicio' ? opcionesServicios
                    : []
                  return (
                    <tr key={r.id}>
                      <td className='fs-3 align-middle'>{idx + 1}</td>
                      <td className='fs-3'>
                        <div className='' style={{width: '200px'}}>
                            <Select
                            placeholder='Clase'
                            options={claseOptions}
                            value={claseOptions.find(o => o.value === r.clase) || null}
                            onChange={(v) => onChangeClase(idx, v)}
                            />
                        </div>
                      </td>
                      <td className='fs-3'>
                        <Select
                          placeholder='Colaborador'
                          options={colaboradores}
                          value={colaboradores.find(o => o.value === r.colaborador?.value) || null}
                          onChange={(v) => onChangeColaborador(idx, v)}
                        />
                      </td>
                      <td className='fs-3'>
                        <Select
                          placeholder={r.clase ? `Seleccionar ${r.clase}` : 'Primero elige clase'}
                          options={itemsOptions}
                          value={itemsOptions.find(o => o.value === r.item?.value) || null}
                          onChange={(v) => onChangeItem(idx, v)}
                          isDisabled={!r.clase}
                        />
                      </td>
                      <td className='fs-3 text-end align-middle' style={{width: '60px'}}>
                        <div className=''>
                            <NumberFormatMoney amount={r.precioBase} />
                        </div>
                      </td>
                      <td className='fs-3 text-end align-middle' style={{width: '60px'}}>
                        <div className=''>
                            <NumberFormatMoney amount={r.precioBase} />
                        </div>
                      </td>
                      <td className='fs-3 d-flex align-items-center'  style={{width: '300px'}}>
                        <div className='bg-danger'  style={{width: '300px'}}>
                            <Select
                            placeholder='%'
                            
                                                   styles={{
                                                        dropdownIndicator: (provided) => ({
                                  ...provided,
                                  color: "#CD1014",
                                }),
                                indicatorSeparator: (provided) => ({
                                  ...provided,
                                  backgroundColor: "#CD1014",
                                }),
                                control: (provided) => ({
                                  ...provided,
                                  borderColor: "##CD1014",
                                  color: "#CD1014",
                                }),
                                option: (provided, state) => ({
                                  ...provided,
                                  color: "#CD1014",
                                  fontWeight: "bold",
                                }),
                                singleValue: (provided) => ({
                                  ...provided,
                                  color: "#CD1014",
                                  fontWeight: "bold",
                                }),
                                      }}
                            options={pctOptions}
                            value={pctOptions.find(o => o.value === r.porcentaje?.value) || pctOptions[0]}
                            onChange={(v) => onChangePct(idx, v)}
                            />
                        </div>
                        <div className='ml-2 text-change text-end w-100'>
                            -<NumberFormatMoney amount={ computeMonto(r)} />
                        </div>
                      </td>
                      <td className='fs-3 text-end align-middle' style={{width: '30px'}}>
                        <div style={{width: '100%'}}>
                            <NumberFormatMoney amount={ r.precioBase - computeMonto(r)} />
                        </div>
                      </td>
                      <td className='text-center fs-3 align-middle'>
                        <Button icon="pi pi-trash" rounded text severity="danger" onClick={() => removeRow(idx)} disabled={rows.length === 1} />
                      </td>
                    </tr>
                  )
                })}

              </tbody>
                <tr>
                  <td></td><td></td><td></td>
                  <td className='bg-primary'>
                    <div className='fs-2 text-black bg-primary m-0 p-0'>TOTAL</div>
                  </td>
                  <td className='fs-2 text-end'>
                    <NumberFormatMoney amount={precioBaseTotal} />
                  </td>
                  <td className='fs-2 text-end'>
                    <NumberFormatMoney amount={precioBaseTotal} />
                  </td>
                  <td>
                    <div className='fs-2 text-end' style={{color: '#CD1014'}}>
                        -<NumberFormatMoney amount={precioBaseTotal-total} />
                    </div>
                  </td>
                  <td className='fs-1 text-end bg-primary text-black'>
                    <NumberFormatMoney amount={total} />
                  </td>
                </tr>
                <tr>
                  <td colSpan={8} className='p-0 bg-primary'>
                    <div
                      className='fs-3 cursor-pointer text-center text-white py-2'
                      onClick={addRow}
                    >
                       AGREGAR ITEMS A LA COMANDA
                    </div>
                  </td>
                </tr>
                <tr className='text-change'>
                  <td  colSpan={3} rowSpan={2} style={{width: '40px'}}>
                    <div className=' bg-danger' style={{fontSize: '50px'}}>
                      COMISION: 15.31
                    </div>
                    <div className='fs-2 bg-danger'>
                        <span className='text-change mr-1'>NOTA:</span> EN CASO LA VENTA SEA <br/>EN EFECTIVO, NO APLICA EL DESCUENTO OPENPAY
                    </div>
                    </td>
                    <td colSpan={1}></td>
                    <td colSpan={2} className='fs-1 text-change'>
                    <div className='fs-1 text-change' style={{color: '#CD1014'}}>OPENPAY</div>
                  </td>
                  <td className='fs-1 text-end text-change'>
                    -<NumberFormatMoney amount={total*(5/100)} />
                  </td>
                  <td></td>
                </tr>
                <tr className='text-change'>
                    <td colSpan={1}></td>
                  <td colSpan={1} className='fs-1 text-change'>
                    <div className='fs-1 text-change' style={{color: '#CD1014'}}>IGV</div>
                  </td>
                  <td colSpan={2} className='fs-1 text-end text-change'>
                    -<NumberFormatMoney amount={(total)-(total/(1.18))} />
                  </td>
                  <td></td>
                </tr>
                <tr className='text-change'>
                    <td colSpan={4}>
                        <div className='fs-2 bg-danger'>
                            <Button className=' ' style={{width: '400px'}} onClick={onClickModalAgregarComanda}  label={<div className='fs-2'>GRABAR COMANDA</div>} />
                        </div>
                    </td>
                    <td colSpan={2} className='fs-1 text-change'>
                    <div className='fs-1 text-change' style={{color: '#CD1014'}}>IMP. RENT.</div>
                  </td>
                  <td className='fs-1 text-end text-change'>
                    -<NumberFormatMoney amount={(total-(total-(total/(1.18))))*(2/100)} />
                  </td>
                  <td></td>
                </tr>
                <tr className='text-change'>
                    <td colSpan={4}>
                        <div className='fs-2 bg-danger'>
                            <Button className='bg-change ' style={{width: '400px'}} onClick={onClickModalCancelarComanda}  label={<div className='fs-2'>CANCELAR</div>}/>
                        </div>
                    </td>
                    <td colSpan={2} className='fs-1 text-change'>
                    <div className='fs-1 text-change' style={{color: '#CD1014'}}>TOTAL IMPUESTOS</div>
                  </td>
                  <td className='fs-1 text-end text-change'>
                    -<NumberFormatMoney amount={
                        ((total-(total-(total/(1.18))))*(2/100))+
                        ((total)-(total/(1.18)))+
                        (total*(5/100))} />
                  </td>
                  <td></td>
                </tr>
                <tr>
                    <td colSpan={4}>
                        <div className='fs-2 bg-danger' style={{width: '400px'}}>
                            <div className='mb-3'>
                            <label  className='text-primary fw-bold fs-2 '>OBSERVACIONES:</label>
                            <textarea
                                className='form-control border border-primary border-4 '
                                onChange={onInputChange}
                                name='observacion'
                                value={observacion}
                            />
                            </div>
                        </div>
                    </td>   
                    <td colSpan={2} className='fs-1'>
                    <div className='bg-primary fs-1 text-black'>VENTA NETA</div>
                  </td>
                  <td className='fs-1 text-end'>
                    <NumberFormatMoney amount={total-total*(5/100)-((total)-(total/(1.18)))-((total-(total-(total/(1.18))))*(2/100))} />
                  </td>
                  <td></td>
                </tr>
            </Table>
          </Col>

          {/* <Col xl={12} sm={12}>
            <Row>
                <Col xl={3}>
                <div className='d-flex justify-content-center flex-column'>
                    <Button onClick={onClickModalAgregarComanda} label={<div className='fs-2'>GRABAR COMANDA</div>} />
                        <br/>
                    <Button className='bg-change' onClick={onClickModalCancelarComanda} label={<div className='fs-2'>CANCELAR</div>}/>
                </div>
                </Col>
                <Col xl={9}>
                    <div className='mb-3'>
                    <label>OBSERVACIÓN:</label>
                    <textarea
                        className='form-control'
                        onChange={onInputChange}
                        name='observacion'
                        value={observacion}
                    />
                    </div>
                </Col>
            </Row>
          </Col> */}
        </Row>
      </form>
    </Dialog>
  )
}

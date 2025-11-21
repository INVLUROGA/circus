import { Dialog } from 'primereact/dialog'
import React, { useEffect, useMemo, useState } from 'react'
import { Col, Row, Table } from 'react-bootstrap'
import Select from 'react-select'
import { useComandasStore } from './useComandasStore'
import { useForm } from '@/hooks/useForm'
import { arrayEstadosVenta } from '@/types/type'
import { Button } from 'primereact/button'
import { DateMask, NumberFormatMoney } from '@/components/CurrencyMask'
import { Formulas } from '../Formulas'

// -------------------- helpers --------------------
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100
const pctOptions = [
  {value: 0, label: '0%'}, {value: 5, label: '5%'}, {value: 10, label: '-10%'},
  {value: 15, label: '-15%'}, {value: 20, label: '-20%'}, {value: 25, label: '-25%'},
  {value: 30, label: '-30%'}, {value: 35, label: '-35%'}, {value: 40, label: '-40%'},
  {value: 45, label: '-45%'}, {value: 50, label: '-50%'},
].map(v => ({ value: v.value, label: `${v.label}` }))

const mapToOption = (x, tipo) => ({
  tipo,
  value: x.value || 0,
  label: x.nombre || x.label || x.nombre_producto || x.nombre_servicio || '',
  subCategoria: x.subCategoria || (tipo === 'producto' ? 'PRODUCTO' : 'SERVICIO'),
  precio: x.precio ?? x.prec_venta ?? 0,
  prec_compra: x.prec_compra || x.precio_compra,
  duracion: x.duracion ?? 0,
  uid: `${x.uid}`
})

const rowTemplate = (i = 1) => ({
  id: crypto.randomUUID?.() || `${Date.now()}-${i}`,
  clase: null,               
  colaborador: null,         
  item: null,                
  porcentaje: pctOptions[0], 
  precioBase: 0,             
  prec_compra: 0,
  comisionPct: 30,
})

const customcomandas = { id_cli: 0, observacion: '', status_remove: 0 }

export const ModalCustomComanda2 = ({
  onHide, show, productos = [], servicios = [], colaboradores = []          
}) => {
  const { obtenerClientes, DataClientes, onPostComandas } = useComandasStore()
  const { id_cli, observacion, status_remove, onInputChange, onInputChangeReact, onResetForm } = useForm(customcomandas)
  const { igv, impRenta, openPay } = Formulas()
  
  const opcionesProductos = useMemo(() => (productos || []).map((p) => mapToOption({ ...p, nombre: p.nombre_producto,  label: p.label }, 'producto')), [productos])
  const opcionesServicios = useMemo(() => (servicios || []).map((s) => mapToOption({ ...s, nombre: s.nombre_servicio, label: s.label }, 'servicio')), [servicios])

  const [rows, setRows] = useState([rowTemplate()])

  useEffect(() => {
    if (show) obtenerClientes()
  }, [show])

  const computeMonto = (r) => round2((r.precioBase || 0) * ((r.porcentaje?.value || 0) / 100))

  const total = useMemo(() => rows.reduce((acc, r) => acc + r.precioBase - computeMonto(r), 0), [rows])
  const precioBaseTotal = useMemo(() => rows.reduce((acc, r) => acc + r.precioBase, 0), [rows])
  
  const onChangeClase = (idx, claseOpt) => {
    setRows((prev) => {
      const cp = [...prev]
      cp[idx] = { ...cp[idx], clase: claseOpt?.value ?? null, item: null, precioBase: 0, prec_compra: 0 }
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

  const onChangeComisionPct = (idx, value) => {
    const num = Number(value || 0);
    setRows((prev) => {
      const cp = [...prev];
      cp[idx] = { ...cp[idx], comisionPct: num };
      return cp;
    });
  };

  const addRow = () => setRows((prev) => [...prev, rowTemplate(prev.length + 1)])
  const removeRow = (idx) => setRows((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx))

  const onClickModalAgregarComanda = (e) => {
    if(e) e.preventDefault(); // 

    const detalle = rows.map((r) => ({
      clase: r.clase,
      colaborador: r.colaborador?.value || null,
      colaborador_label: r.colaborador?.label || "",
      item_id: r.item?.value || null,
      item_label: r.item?.label || "",
      porcentaje: r.porcentaje?.value || 0,
      comisionPct: r.comisionPct ?? 30,
      precio_base: r.precioBase,
      monto: computeMonto(r),
      id_producto: r.item?.value,
      id_servicio: r.item?.value,
      id_empl: r.colaborador?.value, 
      id_empresa: 599,
      cantidad: 1,
      tarifa_monto: computeMonto(r),
      prec_compra: r.item?.prec_compra || 0,
    }));

    const payload = {
      id_cli,
      observacion,
      status_remove,
      fecha_venta: new Date(),
      detalle,
    };

    
     onPostComandas(payload);

     onResetForm();
  setRows([rowTemplate()]);
  onHide?.();
  };

  const onClickModalCancelarComanda = () => {
    onResetForm()
    setRows([rowTemplate()])
    onHide?.()
  }
  
  const footerButtons = (<></>)
  
  // --- LÓGICA DE AGRUPACIÓN VISUAL (SOLO PARA EL DIV ROJO DE LA IZQUIERDA) ---
  const gruposPorColaborador = useMemo(() => {
    const map = new Map();
    for (const obj of rows) {
      const key = obj?.colaborador?.value ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(obj);
    }
    return Array.from(map, ([value, items]) => ({
      value,
      items: items.map((i) => {
        const neto = i.precioBase - computeMonto(i);
        const impuestos = igv(neto) + openPay(neto) + impRenta(neto);
        const sumaImpuestos = impuestos + (i.item?.prec_compra || 0);
        const margen = Number(neto) - Number(sumaImpuestos);
        const pctComision = Number(i.comisionPct ?? 30);
        const comision = margen * (pctComision / 100);
        return { ...i, comision };
      }),
    }));
  }, [rows]);

  // --- CÁLCULOS GLOBALES ---
  const totalComisiones = rows.reduce((acc, r) => {
    const neto = r.precioBase - computeMonto(r);
    const impuestosItem = igv(neto) + openPay(neto) + impRenta(neto);
    const costoItem = r.item?.prec_compra || 0;
    const margen = Number(neto) - Number(impuestosItem) - Number(costoItem);
    const pct = r.comisionPct ?? 30;
    return acc + (margen * (pct / 100));
  }, 0);

  const descuentoOpenPay = total * 0.05; 
  const descuentoIGV = total - (total / 1.18);
  const descuentoRenta = (total / 1.18) * 0.02; 

  const ventaNeta = total - descuentoOpenPay - descuentoIGV - descuentoRenta - totalComisiones;

  return (
    <Dialog footer={footerButtons} style={{ width: '100%', height: '100rem' }} onHide={onHide} visible={show} header={'AGREGAR COMANDA'} position='top'>
      <form>
        <Row>
          <Col xl={3} sm={12}>
            <div className='mb-3' style={{fontSize: '30px'}}>
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
            <div className='mb-3'  style={{fontSize: '30px'}}>
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
            <div className='mb-3' style={{fontSize: '50px'}}>
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
                  <th><div className='text-white text-center'>SERVICIO / PRODUCTO</div></th>
                  {/* TITULO COLUMNA COMISION */}
                  <th><div className="text-white text-center">% COMISIÓN</div></th>
                  <th><div className='text-white'><div>PRECIO COSTO</div></div></th>
                  <th><div className='text-white'><div>PRECIO VENTA</div></div></th>
                  <th  style={{width: '300px'}}><div className='text-change text-center'>PROMO.<br/>...<br/> % DESC.</div></th>
                  <th className='' style={{width: '100px', margin: '0'}}><div className='text-white'>TOTAL A PAGAR</div></th>
                  <th></th>
                </tr>
              </thead>
              <tbody className='fs-2'>
                {rows.map((r, idx) => {
                  const claseOptions = [{ value: 'producto', label: 'Producto' }, { value: 'servicio', label: 'Servicio' }]
                  const itemsOptions = r.clase === 'producto' ? opcionesProductos : r.clase === 'servicio' ? opcionesServicios : []
                  
                  // Calculo al vuelo solo visual para mostrar debajo del input
                  const netoRow = r.precioBase - computeMonto(r);
                  const impRow = igv(netoRow) + openPay(netoRow) + impRenta(netoRow) + (r.item?.prec_compra || 0);
                  const comisionRow = (netoRow - impRow) * ((r.comisionPct ?? 30)/100);

                  return (
                    <tr key={r.id}>
                      <td className='fs-3 align-middle'>{idx + 1}</td>
                      <td className='fs-3'>
                        <div style={{width: '200px'}}>
                            <Select placeholder='Clase' options={claseOptions} value={claseOptions.find(o => o.value === r.clase) || null} onChange={(v) => onChangeClase(idx, v)} />
                        </div>
                      </td>
                      <td className='fs-3'>
                        <Select placeholder='Colaborador' options={colaboradores} value={colaboradores.find(o => o.value === r.colaborador?.value) || null} onChange={(v) => onChangeColaborador(idx, v)} />
                      </td>
                      <td className='fs-3'>
                        <Select placeholder={r.clase ? `Seleccionar ${r.clase}` : 'Primero elige clase'} options={itemsOptions} value={itemsOptions.find(o => o.value === r.item?.value) || null} onChange={(v) => onChangeItem(idx, v)} isDisabled={!r.clase} />
                      </td>

                      {/* INPUT DE COMISIÓN Y MONTO CALCULADO DEBAJO */}
                      <td className="fs-3 text-center align-middle" style={{ width: "100px" }}>
                        <input type="number" min={0} max={100} className="form-control text-center fw-bold text-primary" 
                            style={{border: '2px solid #0d6efd', fontSize:49}}
                            value={r.comisionPct ?? 30} onChange={(e) => onChangeComisionPct(idx, e.target.value)} 
                        />
                        {/* AQUI SE MUESTRA EL MONTO CALCULADO DEBAJO DEL INPUT */}
                        <div className='mt-1 text-muted' style={{fontSize: '24px'}}>
                            S/ {comisionRow.toFixed(2)}
                        </div>
                      </td>

                      <td className='fs-3 text-end align-middle' style={{width: '60px'}}>
                        <NumberFormatMoney amount={r?.item?.prec_compra} />
                      </td>
                      <td className='fs-3 text-end align-middle' style={{width: '60px'}}>
                        <NumberFormatMoney amount={r.precioBase} />
                      </td>
                      <td className='fs-3 d-flex align-items-center'  style={{width: '300px'}}>
                        <div className='bg-danger'  style={{width: '300px'}}>
                            <Select placeholder='%' styles={{ control: (p) => ({ ...p, borderColor: "#CD1014", color: "#CD1014" }), singleValue: (p) => ({ ...p, color: "#CD1014", fontWeight: "bold" }) }} options={pctOptions} value={pctOptions.find(o => o.value === r.porcentaje?.value) || pctOptions[0]} onChange={(v) => onChangePct(idx, v)} />
                        </div>
                        <div className='ml-2 text-change text-end w-100'>
                            -<NumberFormatMoney amount={ computeMonto(r)} />
                        </div>
                      </td>
                      <td className='fs-3 text-end align-middle' style={{width: '30px'}}>
                        <div style={{width: '100%'}}><NumberFormatMoney amount={ r.precioBase - computeMonto(r)} /></div>
                      </td>
                      <td className='text-center fs-3 align-middle'>
                        <Button icon="pi pi-trash" rounded text severity="danger" onClick={() => removeRow(idx)} disabled={rows.length === 1} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
                
                {/* TOTALES DE LA TABLA */}
                <tr>
                  <td></td><td></td><td></td><td></td>
                  <td className='bg-primary'><div className='fs-2 text-black bg-primary m-0 p-0'>TOTAL</div></td>
                  <td className='fs-2 text-end'><NumberFormatMoney amount={rows.reduce((total, item)=>total + item?.item?.prec_compra,0)} /></td>
                  <td className='fs-2 text-end'><NumberFormatMoney amount={precioBaseTotal} /></td>
                  <td><div className='fs-2 text-end' style={{color: '#CD1014'}}>-<NumberFormatMoney amount={precioBaseTotal-total} /></div></td>
                  <td className='fs-1 text-end bg-primary text-black'><NumberFormatMoney amount={total} /></td>
                </tr>
                <tr>
                  <td colSpan={9} className='p-0 bg-primary'>
                    <div className='fs-3 cursor-pointer text-center text-white py-2' onClick={addRow}>AGREGAR ITEMS A LA COMANDA</div>
                  </td>
                </tr>

                {/* ----------------- SECCIÓN DE RESUMEN (FOOTER) ----------------- */}
                
                {/* FILA 1: AQUÍ EMPIEZA LA CAJA ROJA (ROWSPAN 3) Y A LA DERECHA "TOTAL COMISIONES" */}
                <tr className='text-change'>
                  <td colSpan={3} rowSpan={3} style={{width: '40px'}}>
                    <div className=' bg-danger' style={{fontSize: '50px'}}>
                      {gruposPorColaborador.map((col) => (
                        <React.Fragment key={col.value}>
                          {(col.items[0]?.colaborador?.label || "-").split(" ")[0]}:{" "}
                          {col.items.reduce((total, item) => total + (item.comision || 0), 0).toFixed(2)}
                          <br />
                        </React.Fragment>
                      ))}
                      <br />
                      TOTAL: {totalComisiones.toFixed(2)}
                    </div>
                    <div className='fs-2 bg-danger'>
                        <span className='text-change mr-1'>NOTA:</span> EN CASO LA VENTA SEA <br/>EN EFECTIVO, NO APLICA EL DESCUENTO OPENPAY
                    </div>
                  </td>
                  
                  <td colSpan={1}></td>
                  
                  {/* NUEVA FILA: TOTAL COMISIONES (Arriba de OpenPay) */}
                  <td colSpan={2} className='fs-1 text-change'>
                    <div className='fs-1 text-change' style={{color: '#CD1014'}}>TOTAL COMISIÓN</div>
                  </td>
                  <td className='fs-1 text-end text-change'>
                    -<NumberFormatMoney amount={totalComisiones} />
                  </td>
                  <td></td>
                </tr>

                {/* FILA 2: OPENPAY (Caja roja sigue ocupando izquierda) */}
                <tr className='text-change'>
                  <td colSpan={1}></td>
                  <td colSpan={2} className='fs-1 text-change'>
                    <div className='fs-1 text-change' style={{color: '#CD1014'}}>OPENPAY</div>
                  </td>
                  <td className='fs-1 text-end text-change'>
                    -<NumberFormatMoney amount={descuentoOpenPay} />
                  </td>
                  <td></td>
                </tr>

                {/* FILA 3: IGV (Caja roja sigue ocupando izquierda) */}
                <tr className='text-change'>
                  <td colSpan={1}></td>
                  <td colSpan={2} className='fs-1 text-change'>
                    <div className='fs-1 text-change' style={{color: '#CD1014'}}>IGV</div>
                  </td>
                  <td className='fs-1 text-end text-change'>
                    -<NumberFormatMoney amount={descuentoIGV} />
                  </td>
                  <td></td>
                </tr>

                {/* FILA 4: BOTÓN GRABAR + IMP RENTA */}
                <tr className='text-change'>
                    <td colSpan={4}>
                        <div className='fs-2 bg-danger'>
                            <Button type="button" className=' ' style={{width: '400px'}} onClick={onClickModalAgregarComanda}  label={<div className='fs-2'>GRABAR COMANDA</div>} />
                        </div>
                    </td>
                    <td colSpan={2} className='fs-1 text-change'>
                        <div className='fs-1 text-change' style={{color: '#CD1014'}}>IMP. RENT.</div>
                    </td>
                    <td className='fs-1 text-end text-change'>
                        -<NumberFormatMoney amount={descuentoRenta} />
                    </td>
                    <td></td>
                </tr>

                {/* FILA 5: BOTÓN CANCELAR + TOTAL IMPUESTOS */}
                <tr className='text-change'>
                    <td colSpan={4}>
                        <div className='fs-2 bg-danger'>
                            <Button type="button" className='bg-change ' style={{width: '400px'}} onClick={onClickModalCancelarComanda}  label={<div className='fs-2'>CANCELAR</div>}/>
                        </div>
                    </td>
                    <td colSpan={2} className='fs-1 text-change'>
                        <div className='fs-1 text-change' style={{color: '#CD1014'}}>TOTAL IMPUESTOS</div>
                    </td>
                    <td className='fs-1 text-end'>
                        {/* Suma visual de todos los descuentos mostrados */}
                        <NumberFormatMoney amount={ventaNeta} /> 
                        {/* Ojo: Aquí tenías Venta Neta visualmente, si quieres el Total Impuestos real es la suma de los descuentos */}
                    </td>
                    <td></td>
                </tr>

                {/* FILA 6: OBSERVACIONES + VENTA NETA REAL */}
                <tr>
                    <td colSpan={4}>
                        <div className='fs-2 bg-danger' style={{width: '400px'}}>
                            <div className='mb-3'>
                            <label  className='text-primary fw-bold fs-2 '>OBSERVACIONES:</label>
                            <textarea className='form-control border border-primary border-4 ' onChange={onInputChange} name='observacion' value={observacion} />
                            </div>
                        </div>
                    </td>   
                    <td colSpan={2} className='fs-1'>
                        <div className='bg-primary fs-1 text-black'>VENTA NETA</div>
                    </td>
                    <td className='fs-1 text-end'>
                        <NumberFormatMoney amount={ventaNeta} />
                    </td>
                    <td></td>
                </tr>
            </Table>
          </Col>
        </Row>
      </form>
    </Dialog>
  )
}
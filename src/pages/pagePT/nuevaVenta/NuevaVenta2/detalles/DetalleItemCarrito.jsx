import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles'
import { NumberFormatMoney } from '@/components/CurrencyMask'
import { Button } from 'primereact/button'
import React from 'react'

export const DetalleItemCarrito = ({c, onClickRemoveItemCarrito, onClickEditItemCarrito}) => {
  return (
    <div className="col-12">
                      <div className="flex flex-column xl:flex-row xl:align-items-start py-1 gap-1">
                          <div style={{width: '100%'}} className="flex flex-row lg:flex-row justify-content-between align-items-center xl:align-items-start lg:flex-1 gap-4">
                              <div className="flex flex-column lg:align-items-start">
                                  <div className="flex flex-column gap-1">
                                      <div className="text-4xl font-bold">{c.labelServ}</div>
                                  </div>
                                  <div className="flex flex-column">
                                      <span className="flex align-items-center gap-2">
                                          <i className="pi pi-user"></i>
                                          <h4 className="font-semibold">{c.labelSelectEmpl}</h4>
                                      </span>
                                  </div>
                                  <div className="flex flex-column">
                                      <span className="flex align-items-center gap-2">
                                        <h4>{c.cantidad} UNID. x S/. <NumberFormatMoney amount={c.monto_default}/> = S/. <NumberFormatMoney amount={c.cantidadxMontoDefault}/></h4>
                                      </span>
                                  </div>
                                  <div className="flex flex-column">
                                      <span className="flex align-items-center gap-2">
                                          <h4>DESCUENTOS: <NumberFormatMoney amount={c.monto_descuento}/></h4>
                                      </span>
                                  </div>
                              </div>
                              <div className="flex flex-row lg:flex-column align-items-center lg:align-items-end gap-1 lg:gap-2">
                                                        <span className="text-6xl font-semibold"><SymbolSoles isbottom={true} numero={<NumberFormatMoney amount={c.tarifa}/>}/></span>
                                                          {/* <Button icon="pi pi-pencil" label=""></Button> */}
                                                          <Button icon="pi pi-pencil" onClick={()=>onClickEditItemCarrito(c.uid)} label=""></Button>
                                                          <Button icon="pi pi-trash" onClick={()=>onClickRemoveItemCarrito(c.uid)} label=""></Button>
                              </div>
                          </div>
                      </div>
                  </div>
  )
}

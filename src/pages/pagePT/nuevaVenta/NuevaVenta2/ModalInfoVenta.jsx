import { useVentasStore } from '@/hooks/hookApi/useVentasStore'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import React from 'react'

export const ModalInfoVenta = ({onHide, show, data, dataPagos,
detalle_cli_modelo,
carritoItems}) => {
    const itemsCarritos = carritoItems.map(c=>c.labelServ)
    const itemsPagos = dataPagos.map(p=>p.label_forma_pago)
    const { startRegisterVenta } = useVentasStore()
      const columnas = [
    {
      titulo: 'CARRITO',
      items: itemsCarritos,
    },
    {
      titulo: 'PAGOS',
      items: itemsPagos
    },
  ];
const onSubmitVenta = ()=>{
  const productos = carritoItems.filter(item=>item.tipo==='producto').map(prod=>{
    const { id_servicio, ...valor } = prod;
    return {
      ...valor, 
      id_producto: prod.id_servicio}})
		startRegisterVenta({dataVenta: {detalle_venta_servicio: carritoItems.filter(item=>item.tipo==='servicio'), detalle_venta_productos: productos}, datos_pagos: dataPagos, detalle_cli_modelo})
}
  const footer = (
    <>
    <Button label='ACEPTAR' onClick={onSubmitVenta}/>
    </>
  )
  return (
    <Dialog footer={footer} visible={show} onHide={onHide} header={'¿ESTAS SEGUR(A) DE ESTA VENTA?'} style={{ margin: '0', width: '40rem'}}>
        <div className="container">
      <div className="row g-4">
        {columnas.map((col, index) => (
          <div className="col-12 col-md-6" key={index}>
            <div className="h-100">
              <div className=" d-flex flex-column">
                <h3 className="fw-bold text-primary text-center">{col.titulo}</h3>
                <ul className="list-unstyled mt-3">
                  {col.items.map((item, i) => (
                    <li key={i} className="mb-2">
                      <i className="bi bi-check-circle-fill text-primary me-2"></i>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    </Dialog>
  )
}

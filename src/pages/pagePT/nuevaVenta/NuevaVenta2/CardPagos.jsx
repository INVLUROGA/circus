import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles'
import { NumberFormatMoney } from '@/components/CurrencyMask'
import { onDeleteItemCarrito } from '@/store'
import { Button } from 'primereact/button'
import { ScrollPanel } from 'primereact/scrollpanel'
import React, { useState } from 'react'
import { Card } from 'react-bootstrap'
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'
import { SideBarFormPago } from './SideBarFormPago'
import { ItemsPagos } from './ItemsPagos'
import { useVentasStore } from '@/hooks/hookApi/useVentasStore'

export const CardPagos = ({venta, dataPagos, detalle_cli_modelo}) => {
  const [isOpenSideBarFormPago, setisOpenSideBarFormPago] = useState(false)
  const { startRegisterVenta } = useVentasStore()
  /*
  LABEL,
  CANTIDAD,
  MONTO,
  DESCUENTO,
  EMPLEADO
  */
 const dispatch = useDispatch()
 const onClickRemoveItemCarrito = (id)=>{
  dispatch(onDeleteItemCarrito(id))
 }
 const onOpenSideBarFormPago = ()=>{
  setisOpenSideBarFormPago(true)
 }
 const onCloseSideBarFormPago = ()=>{
  setisOpenSideBarFormPago(false)
 }
 
 const carritoItems = venta.map(c=>{
  const cantidadxMontoDefault = c.cantidad*c.monto_default
  const tarifa = cantidadxMontoDefault-c.monto_descuento
  return{
    ...c,
    cantidadxMontoDefault,
    tarifa_monto: tarifa
  }
 })
 const onClickAgregarVenta = ()=>{
    startRegisterVenta({dataVenta: {detalle_venta_servicio: carritoItems?.filter(f=>f.tipo==='servicio')}, detalle_cli_modelo})
    console.log({dataPagos, venta, carritoItems, detalle_cli_modelo});

 }
 const sumaMontoOficialCarrito = carritoItems.reduce((total, tarifa) => total + tarifa.tarifa_monto, 0)
 
  return (
    <>
      <div>
              <Button label='PAGAR' onClick={onOpenSideBarFormPago}/>
      </div>
          <ItemsPagos dataPagos={dataPagos}/>
        <SideBarFormPago show={isOpenSideBarFormPago} onHide={onCloseSideBarFormPago}/>
    </>
  )
}


/*
<Card style={{height: '100%'}}>
        <Card.Header>
          <div>
            <div>
              <h1>PAGOS</h1>
            </div>
            <div className='float-end'>
              <Button label='PAGAR' onClick={onOpenSideBarFormPago}/>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
                <ItemsPagos dataPagos={dataPagos}/>
        </Card.Body>
        <Card.Footer>
          
        <div className='align-items-center bg-danger'>
            <div className='float-start'>
            {/* <h1 className=''>SUBTOTAL: 3000</h1>
            <h1 className=''>TOTAL: <NumberFormatMoney amount={sumaMontoOficialCarrito}/></h1>
            </div>
          </div>
        </Card.Footer>
    </Card>
*/
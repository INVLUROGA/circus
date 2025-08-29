import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles'
import { NumberFormatMoney } from '@/components/CurrencyMask'
import { onDeleteItemCarrito } from '@/store'
import { Button } from 'primereact/button'
import { ScrollPanel } from 'primereact/scrollpanel'
import React, { useState } from 'react'
import { Card } from 'react-bootstrap'
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'
import { DetalleItemCarrito } from './detalles/DetalleItemCarrito'
import { ModalEditCarrito } from './ModalEditCarrito'
import { ModalInfoVenta } from './ModalInfoVenta'
import { ModalAgregarCarrito } from './ModalAgregarCarrito'

export const CardCarrito = ({carrito, setisOpenModalItemCarrito, dataPagos, detalle_cli_modelo}) => {
 const dispatch = useDispatch()
 const [isOpenModalInfoVenta, setisOpenModalInfoVenta] = useState(false)
 const [itemCarritoSelec, setitemCarritoSelec] = useState({})
 const [isOpenModalCarritoEdit, setisOpenModalCarritoEdit] = useState(false)
 const onClickRemoveItemCarrito = (id)=>{
  dispatch(onDeleteItemCarrito(id))
  setisOpenModalItemCarrito(true)
 }
 const onClickEditItemCarrito=(uid)=>{
  setitemCarritoSelec(carrito.find((item)=>item.uid === uid))
  console.log({carrr: carrito.find((item)=>item.uid === uid)});
  
  setisOpenModalCarritoEdit(true)
 }
 const onOpenModalInfoVenta = ()=>{
   setisOpenModalInfoVenta(true)
  }
 
 const onCloseModalInfoVenta = ()=>{
   setisOpenModalInfoVenta(false)
  }
  const onCloseModalCarrito = ()=>{
    setisOpenModalCarritoEdit(false)
  }
 const carritoItems = carrito.map(c=>{
  const cantidadxMontoDefault = c.cantidad*c.monto_default
  const tarifa = cantidadxMontoDefault-(c.monto_descuento || 0)
  return{
    ...c,
    cantidadxMontoDefault,
    tarifa
  }
 })
 
 const SUMA_montoCarrito = carritoItems.reduce((sum, obj) => sum + obj.tarifa, 0);
 const SUMA_montoPagos = dataPagos.reduce((sum, obj) => sum + obj.monto_pago, 0);
  return (
    <>
    <Card style={{height: '100%'}}>
        <Card.Header>
            <h1>Carrito <i className='pi pi-shopping-cart fs-1'></i></h1>
        </Card.Header>
        <Card.Body>
          <ScrollPanel style={{ width: '100%', height: '60vh' }} className="custombar2 m-0">
            {
              carritoItems.map(c=>{
                return(
                  <DetalleItemCarrito c={c}  onClickRemoveItemCarrito={onClickRemoveItemCarrito} onClickEditItemCarrito={onClickEditItemCarrito}/>
                )
              })
            }
          </ScrollPanel>
        </Card.Body>
        <Card.Footer className=''>
            <div className='float-end fs-1'>
              <div className='fs-1'>{SUMA_montoCarrito-SUMA_montoPagos<0?'VUELTO':'SALDO PENDIENTE'}: <SymbolSoles numero={<NumberFormatMoney amount={SUMA_montoCarrito-SUMA_montoPagos}/>}/></div>
            </div>
            {
              SUMA_montoCarrito===SUMA_montoPagos && (
                <Button onClick={onOpenModalInfoVenta} label={<span className='fs-3'>AGREGAR VENTA</span>} outlined />
              )
            }
        </Card.Footer>
    </Card>

        <ModalAgregarCarrito servSelect={itemCarritoSelec} onHide={onCloseModalCarrito} show={isOpenModalCarritoEdit}/>
        <ModalInfoVenta show={isOpenModalInfoVenta} onHide={onCloseModalInfoVenta} dataPagos={dataPagos} detalle_cli_modelo={detalle_cli_modelo} carritoItems={carritoItems}/>
    {/* <ModalEditCarrito/> */}
    </>
  )
}

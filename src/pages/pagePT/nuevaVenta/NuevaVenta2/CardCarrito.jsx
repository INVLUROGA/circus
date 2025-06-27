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

export const CardCarrito = ({carrito, setisOpenModalItemCarrito}) => {
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
  setisOpenModalItemCarrito(true)
 }
 const onClickEditItemCarrito=(id)=>{
  console.log({carrito, id});
  
 }
 
 const carritoItems = carrito.map(c=>{
  const cantidadxMontoDefault = c.cantidad*c.monto_default
  const montoOficial = cantidadxMontoDefault-c.monto_descuento
  return{
    ...c,
    cantidadxMontoDefault,
    montoOficial
  }
 })
  return (
    <>
    <Card style={{height: '100%'}}>
        <Card.Header>
            <h1>Carrito</h1>
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
        <Card.Footer>
        </Card.Footer>
    </Card>
    {/* <ModalEditCarrito/> */}
    </>
  )
}

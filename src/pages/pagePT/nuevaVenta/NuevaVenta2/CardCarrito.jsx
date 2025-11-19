import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles'
import { NumberFormatMoney } from '@/components/CurrencyMask'
import { onDeleteItemCarrito } from '@/store'
import { Button } from 'primereact/button'
import { ScrollPanel } from 'primereact/scrollpanel'
import React, { useState, useRef } from 'react' // 1. Importamos useRef
import { Card } from 'react-bootstrap'
import { useDispatch } from 'react-redux'
import { DetalleItemCarrito } from './detalles/DetalleItemCarrito'
import { ModalEditCarrito } from './ModalEditCarrito'
import { ModalInfoVenta } from './ModalInfoVenta'
import { ModalAgregarCarrito } from './ModalAgregarCarrito'
import { confirmDialog } from 'primereact/confirmdialog';
// 2. Importamos el Toast
import { Toast } from 'primereact/toast';

export const CardCarrito = ({carrito, setisOpenModalItemCarrito, dataPagos, detalle_cli_modelo}) => {
 const dispatch = useDispatch()
 const [isOpenModalInfoVenta, setisOpenModalInfoVenta] = useState(false)
 const [itemCarritoSelec, setitemCarritoSelec] = useState({})
 const [isOpenModalCarritoEdit, setisOpenModalCarritoEdit] = useState(false)
 
 // 3. Referencia para el Toast
 const toast = useRef(null);

 const onClickRemoveItemCarrito = (id)=>{
  dispatch(onDeleteItemCarrito(id))
  setisOpenModalItemCarrito(true)
 }

 const onClickEditItemCarrito=(uid)=>{
  setitemCarritoSelec(carrito.find((item)=>item.uid === uid))
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

 const confirmarAgregarVenta = () => {
    // === 4. VALIDACIÓN DE COLABORADOR ===
    // Si item.id_empl es 0, null o undefined, mostramos alerta.
    const haySinColaborador = carrito.some(item => !item.id_empl || item.id_empl === 0);

    if (haySinColaborador) {
        toast.current.show({
            severity: 'warn', 
            summary: 'Falta Colaborador', 
            detail: 'Uno o más servicios no tienen un colaborador seleccionado.', 
            life: 3000
        });
        return; 
    }

    confirmDialog({
      message: '¿Estás seguro de que deseas proceder a registrar la venta?',
      header: 'Confirmar Venta',
      icon: 'pi pi-shopping-cart',
      acceptLabel: 'Sí, continuar',
      rejectLabel: 'Cancelar',
      accept: onOpenModalInfoVenta, 
      reject: () => {} 
    });
 };

  return (
    <>
    {/* 5. Componente Toast */}
    <Toast ref={toast} />

    <Card style={{height: '100%'}}>
        <Card.Header>
            <h1>Carrito <i className='pi pi-shopping-cart fs-1'></i></h1>
        </Card.Header>
        <Card.Body>
          <ScrollPanel style={{ width: '100%', height: '60vh' }} className="custombar2 m-0">
            {
              carritoItems.map(c=>{
                return(
                  // === AQUÍ ESTABA EL ERROR DEL KEY ===
                  // Agregamos key={c.uid} para solucionar el warning rojo
                  <DetalleItemCarrito 
                    key={c.uid} 
                    c={c}  
                    onClickRemoveItemCarrito={onClickRemoveItemCarrito} 
                    onClickEditItemCarrito={onClickEditItemCarrito}
                  />
                )
              })
            }
          </ScrollPanel>
        </Card.Body>
        <Card.Footer className=''>
            <div className='float-end fs-1'>
              <div className='fs-1'>{SUMA_montoCarrito-SUMA_montoPagos<0?'VUELTO':'SALDO PENDIENTE'}: <SymbolSoles numero={<NumberFormatMoney amount={SUMA_montoCarrito-SUMA_montoPagos}/>}/></div>
            </div>
            <Button onClick={confirmarAgregarVenta} label={<span className='fs-3'>AGREGAR VENTA</span>} outlined />
        </Card.Footer>
    </Card>

        <ModalAgregarCarrito servSelect={itemCarritoSelec} onHide={onCloseModalCarrito} show={isOpenModalCarritoEdit}/>
        <ModalInfoVenta show={isOpenModalInfoVenta} onHide={onCloseModalInfoVenta} dataPagos={dataPagos} detalle_cli_modelo={detalle_cli_modelo} carritoItems={carritoItems}/>
    </>
  )
}
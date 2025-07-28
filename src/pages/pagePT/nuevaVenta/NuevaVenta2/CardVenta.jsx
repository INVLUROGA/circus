import React, { useEffect, useState } from 'react'
import { TabPanel, TabView } from 'primereact/tabview'
import { ModalAgregarCarrito } from './ModalAgregarCarrito'
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore'
import { useForm } from '@/hooks/useForm'
import { useNuevaVentaStore } from './useNuevaVentaStore'
import { DetalleItemProSer } from './detalles/DetalleItemProSer'
const regCliente = {
  id_cli: 0
}
export const CardVenta = ({dataVenta, datos_pagos, detalle_cli_modelo, funToast}) => {
  //wthis: 100: servicio, 101: producto
  const { obtenerServicios, dataView } = useNuevaVentaStore()
  const { obtenerProductos, dataProductos } = useNuevaVentaStore()
  useEffect(() => {
    obtenerServicios()
    obtenerProductos()
  }, [])
  
  const { DataClientes, obtenerParametrosClientes } = useTerminoStore()
const [isOpenModalAgregarCarrito, setisOpenModalAgregarCarrito] = useState(false)
const { formState, id_cli, onInputChange, onInputChangeReact } = useForm(regCliente)
const [servSelect, setservSelect] = useState(null)
const [labelServicio, setlabelServicio] = useState('')
const [DEFAULT_monto, setDEFAULT_monto] = useState(0)
const [id_item, setid_item] = useState(0)
const [cantidad, setcantidad] = useState(0)
const onOpenModalAgregarCarrito = (servSelect)=>{
  setservSelect(servSelect)
  setisOpenModalAgregarCarrito(true)
  setlabelServicio(servSelect.label)
  setDEFAULT_monto(servSelect.precio)
  setcantidad(servSelect.cantidad)
  setid_item(servSelect.id)
}
const onCloseModalAgregarCarrito = ()=>{
  setisOpenModalAgregarCarrito(false)
  setlabelServicio('')

}
useEffect(() => {
  obtenerParametrosClientes()
}, [])


  return (
    <>
          <TabView>
            <TabPanel header='SERVICIOS'>
                <DetalleItemProSer dataView={dataView} onOpenModalAgregarCarrito={onOpenModalAgregarCarrito}/>
            </TabPanel>
            <TabPanel header='PRODUCTOS'>
                <DetalleItemProSer dataView={dataProductos} onOpenModalAgregarCarrito={onOpenModalAgregarCarrito}/>
            </TabPanel>
            <TabPanel header='TODOS'>
                <DetalleItemProSer dataView={[...dataView, ...dataProductos]} onOpenModalAgregarCarrito={onOpenModalAgregarCarrito}/>
            </TabPanel>
          </TabView>
    <ModalAgregarCarrito servSelect={servSelect} id_item={id_item} cantidad_MAX={cantidad} monto_default={DEFAULT_monto} labelServ={labelServicio} onHide={onCloseModalAgregarCarrito} show={isOpenModalAgregarCarrito}/>
    </>
  )
}

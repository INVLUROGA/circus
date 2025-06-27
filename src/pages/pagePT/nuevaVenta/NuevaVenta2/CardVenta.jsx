import React, { useEffect, useState } from 'react'
import Shipping from '../Shipping'
import { Card, CardTitle, Col, Row } from 'react-bootstrap'
import { Button } from 'primereact/button'
import { Tag } from 'primereact/tag'
import { DataScroller } from 'primereact/datascroller'
import { TabPanel, TabView } from 'primereact/tabview'
import { ModalAgregarCarrito } from './ModalAgregarCarrito'
import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles'
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore'
import Select from 'react-select';
import { useForm } from '@/hooks/useForm'
import { useNuevaVentaStore } from './useNuevaVentaStore'
import { DetalleItemProSer } from './detalles/DetalleItemProSer'
import { useSelector } from 'react-redux'
const regCliente = {
  id_cli: 0
}
export const CardVenta = ({dataVenta, datos_pagos, detalle_cli_modelo, funToast}) => {
  //wthis: 100: servicio, 101: producto
  const { obtenerServicios, dataView } = useNuevaVentaStore()
  useEffect(() => {
    obtenerServicios()
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
    {/* <Card style={{height: '100%'}}>
      <Card.Header>
      </Card.Header>
        <Card.Body>
        </Card.Body>
    </Card> */}
          <TabView>
            <TabPanel header='SERVICIOS'>

            </TabPanel>
            <TabPanel header='PRODUCTOS'>

            </TabPanel>
            <TabPanel header='TODOS'>
              <div className="card-body d-flex flex-column" style={{ height: '60vh' /* o '100%' si ya está definido */ }}>
                <DetalleItemProSer dataView={dataView} onOpenModalAgregarCarrito={onOpenModalAgregarCarrito}/>
              </div>
            </TabPanel>
          </TabView>
    <ModalAgregarCarrito servSelect={servSelect} id_item={id_item} cantidad_MAX={cantidad} monto_default={DEFAULT_monto} labelServ={labelServicio} onHide={onCloseModalAgregarCarrito} show={isOpenModalAgregarCarrito}/>
    </>
  )
}

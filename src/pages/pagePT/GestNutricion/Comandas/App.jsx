import React, { useState } from 'react'
import { ItemComanda } from './ItemComanda'
import { Col, Row } from 'react-bootstrap'
import { Button } from 'primereact/button'
import { ModalCustomComanda } from './ModalCustomComanda'
import { ModalCustomClase } from './ModalCustomClase'
import { ModalCustomProd } from './ModalCustomProd'

export const App = () => {
    const [isOpenModalCustomComanda, setisOpenModalCustomComanda] = useState(false)
    const [isOpenModalCustomClaseComanda, setisOpenModalCustomClaseComanda] = useState({prod: false, serv: false})
    const onOpenModalCustomComanda = ()=>{
        setisOpenModalCustomComanda(true)
    }
    const onCloseModalCustomComanda = ()=>{
        setisOpenModalCustomComanda(false)
    }
    const onCloseModalCustomProdComanda = ()=>{
        setisOpenModalCustomClaseComanda({prod: false, serv: false})
    }
    const onOpenModalCustomProdComanda = ()=>{
        setisOpenModalCustomClaseComanda({prod: true, serv: false})
    }
    const onCloseModalCustomServComanda = ()=>{
        setisOpenModalCustomClaseComanda({prod: false, serv: false})
    }
    const onOpenModalCustomServComanda = ()=>{
        setisOpenModalCustomClaseComanda({prod: false, serv: true})
    }
  return (
    <>
    <Button label='AGREGAR COMANDA' onClick={onOpenModalCustomComanda}/>
    <Row>
        <Col lg={4}>
            <ItemComanda onOpenModalCustomProdComanda={onOpenModalCustomProdComanda} onOpenModalCustomServComanda={onOpenModalCustomServComanda}/>
        </Col>
    </Row>
    {/* PRODUCTO */}
    <ModalCustomClase onHide={onCloseModalCustomProdComanda} show={isOpenModalCustomClaseComanda.serv}/>
    {/* SERVICIO */}
    <ModalCustomProd onHide={onCloseModalCustomServComanda} show={isOpenModalCustomClaseComanda.prod}/>
    <ModalCustomComanda show={isOpenModalCustomComanda} onHide={onCloseModalCustomComanda}/>
    </>
  )
}

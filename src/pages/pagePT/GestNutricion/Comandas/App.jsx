import React, { useState } from 'react'
import { ItemComanda } from './ItemComanda'
import { Col, Row } from 'react-bootstrap'
import { Button } from 'primereact/button'
import { ModalCustomComanda } from './ModalCustomComanda'

export const App = () => {
    const [isOpenModalCustomComanda, setisOpenModalCustomComanda] = useState(false)
    const onOpenModalCustomComanda = ()=>{
        setisOpenModalCustomComanda(true)
    }
    const onCloseModalCustomComanda = ()=>{
        setisOpenModalCustomComanda(false)
    }
  return (
    <>
    <Button label='AGREGAR COMANDA' onClick={onOpenModalCustomComanda}/>
    <Row>
        <Col lg={4}>
            <ItemComanda/>
        </Col>
    </Row>
    <ModalCustomComanda show={isOpenModalCustomComanda} onHide={onCloseModalCustomComanda}/>
    </>
  )
}

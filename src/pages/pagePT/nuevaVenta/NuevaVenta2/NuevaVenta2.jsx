import { PageBreadcrumb } from '@/components'
import React, { useEffect, useRef, useState } from 'react'
import { Card, Col, Container, Row } from 'react-bootstrap'
import { CardCliente } from './CardCliente'
import { CardVenta } from './CardVenta'
import { CardPago } from './CardPago'
import { useSelector } from 'react-redux'
import { Toast } from 'primereact/toast';
import { CardCarrito } from './CardCarrito'
import { CardPagos } from './CardPagos'
import { useNuevaVentaStore } from './useNuevaVentaStore'
import { AperturaCaja } from '../AperturaCaja'
import { TabPanel, TabView } from 'primereact/tabview'

export const NuevaVenta2 = () => {

	const refToast= useRef(null)
  const { carrito } = useSelector(e=>e.ui)
	const { venta, detalle_cli_modelo, datos_pagos } = useSelector(e=>e.uiNuevaVenta)
  const { obtenerCajaActual } = useNuevaVentaStore()
  const {dataView} = useSelector(e=>e.DATA)
  const showToastVenta = (severity, summary, detail, label, life)=>{
    refToast.current.show({
      severity: severity,
      summary: summary,
      detail: detail,
      label: label,
      life: life
    });
  }
  useEffect(() => {
    obtenerCajaActual()
  }, [])
  
  return (
    <>
      <PageBreadcrumb title="Nueva venta" subName="ventas" />
    {dataView.length===0?(
      <AperturaCaja/>
    ):(
    <Container fluid>
          <Row>
            {/* Tercera columna con dos secciones */}
            <Col md={3}>
              <CardCliente dataCliente={detalle_cli_modelo}/>
            </Col>
            {/* Primera columna */}
            <Col md={4}>
            
                  <TabView>
                    <TabPanel header={'PRODUCTOS Y SERVICIOS'}>
                      <CardVenta dataVenta={venta} detalle_cli_modelo={detalle_cli_modelo} datos_pagos={datos_pagos} funToast={showToastVenta}/>
                    </TabPanel>
                    <TabPanel header={'PAGOS'}>
                      <CardPagos dataPagos={datos_pagos} venta={carrito} detalle_cli_modelo={detalle_cli_modelo}/>
                    </TabPanel>
                  </TabView>
            {/* <Card style={{height: '100%'}}>
              <Card.Header>
              </Card.Header>
                <Card.Body>
                </Card.Body>
            </Card> */}
            </Col>
            {/* Segunda columna */}
            <Col md={5}>
              <CardCarrito carrito={carrito} dataPagos={datos_pagos} detalle_cli_modelo={detalle_cli_modelo}/>
            </Col>
            {/* <Col md={12} className="d-flex flex-column">
            </Col> */}
          </Row>
        </Container>
    )}
		<Toast ref={refToast}/>
    </>
  )
}

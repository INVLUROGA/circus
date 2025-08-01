import { PageBreadcrumb } from '@/components'
import React from 'react'
import { Card, Tab, Tabs } from 'react-bootstrap'
import TodoVentas from './VentasTotal'
import { TabPanel, TabView } from 'primereact/tabview'
import {App as ReporteVenta } from './ReporteVentaTotal/App'
export const GestionVentas = () => {
  return (
    <>
    <PageBreadcrumb title="COMPROBANTES DE VENTAS POR DIA" subName="Ventas" />
    <TabView>
      <TabPanel header={'COMPROBANTES DE VENTAS'}>
        <Card>
            <Card.Body>
                              <TodoVentas id_empresa={599}/>
            </Card.Body>
        </Card>
      </TabPanel>
      <TabPanel header={'REPORTE'}>
        <Card>
            <Card.Body>
                              <ReporteVenta id_empresa={599}/>
            </Card.Body>
        </Card>
      </TabPanel>
    </TabView>
    </>
  )
}

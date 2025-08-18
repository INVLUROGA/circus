import { PageBreadcrumb } from '@/components'
import React, { useEffect } from 'react'
import { Card, Tab, Tabs } from 'react-bootstrap'
import TodoVentas from './VentasTotal'
import { TabPanel, TabView } from 'primereact/tabview'
import {App as ReporteVenta } from './ReporteVentaTotal/App'
import {App as ReporteVenta1 } from './ReporteVentas/App'
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore'
export const GestionVentas = () => {
    const {obtenerParametrosClientes, DataClientes, obtenerParametrosVendedores, DataVendedores} = useTerminoStore()
    useEffect(() => {
      obtenerParametrosClientes()
    }, [])
    
  return (
    <>
    <PageBreadcrumb title="COMPROBANTES DE VENTAS POR DIA Y HORA" subName="Ventas" />
    <TabView>
      <TabPanel header={'COMPROBANTES DE VENTAS POR DIA Y HORA'}>
        <Card>
            <Card.Body>
                              <TodoVentas DataClientes={DataClientes} id_empresa={599}/>
            </Card.Body>
        </Card>
      </TabPanel>
      <TabPanel header={'DETALLE DE COMPROBANTES'}>
        <Card>
            <Card.Body>
                              <ReporteVenta id_empresa={599}/>
            </Card.Body>
        </Card>
      </TabPanel>
      <TabPanel header={'COMPROBANTES DE VENTAS POR RANGO DE FECHA'}>
        <Card>
            <Card.Body>
                              <ReporteVenta1 id_empresa={599}/>
            </Card.Body>
        </Card>
      </TabPanel>
    </TabView>
    </>
  )
}

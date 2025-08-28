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
                              <TodoVentas DataClientes={DataClientes} id_empresa={599}/>
    </>
  )
}

import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore'
import { useVentasStore } from '@/hooks/hookApi/useVentasStore'
import React, { useEffect } from 'react'

export const App = ({id_empresa}) => {
      const { obtenerTablaVentas, dataVentas } = useVentasStore()
      const  { obtenerParametroPorEntidadyGrupo:obtenerDataComprobantes, DataGeneral:dataComprobantes } = useTerminoStore()
      useEffect(() => {
          obtenerTablaVentas(id_empresa)
          obtenerDataComprobantes('nueva-venta', 'comprobante')
      }, [])
  return (
    <div>
        <pre>
            {JSON.stringify(dataVentas, null, 2)}
        </pre>
    </div>
  )
}

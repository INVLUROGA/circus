import React, { useEffect, useState } from 'react'
import { useNuevaVentaStore } from './useNuevaVentaStore'
import { useDispatch } from 'react-redux'
import { onAddItemsCarrito, RESET_ItemsCarrito } from '@/store'
import { arrayEstados, arrayEstadosCitas } from '@/types/type'

export const CardPedidos = ({detalle_cli_modelo}) => {
    const { obtenerReservas, dataPedidos } = useNuevaVentaStore()
    const [dataServiciosPedido, setdataServiciosPedido] = useState([])
    const dispatch = useDispatch()
    useEffect(() => {
        console.log({dt: detalle_cli_modelo.id_cli});
        
        obtenerReservas(detalle_cli_modelo.id_cli)
    }, [detalle_cli_modelo])
    const onClickPedidos = (sp)=>{
        setdataServiciosPedido(sp)
        dispatch(RESET_ItemsCarrito())
        for (let index = 0; index < sp.length; index++) {
            const elem = sp[index];
                dispatch(onAddItemsCarrito({
               id_empl: elem.id_empl, cantidad: Number(elem.cantidad), monto_default: Number(elem.precio), labelSelectEmpl: elem.empleado, labelServ: elem.nombre_servicio, uid: elem.uid, id_servicio: elem.id, tipo: elem.tipo}))
        }
    }
  return (
    <div className='p-1'>
        {
            dataPedidos.filter(pedido=>pedido.id_estado === 500).map(pedido=>{
                return (
                    <div className='m-3 card p-3 hover-border-card-primary' onClick={()=>onClickPedidos(pedido?.servicios)}>
                        <div>
                            FECHA CREADA: {pedido.fecha_registro}
                        </div>
                        <div>
                            EMPIEZA: {pedido.fecha_registro}
                        </div>
                        <div>
                            ESTADO: {arrayEstadosCitas.find(est=>est.value === Number(pedido?.id_estado))?.label}
                        </div>
                        <div>
                            ESTILISTA: {pedido.empleado}
                        </div>
                        <div>
                            SERVICIO: {pedido.servicios.map((s, i)=>`${s.nombre_servicio}, `)}
                        </div>
                    </div>
                )
            })
        }
        


    </div>
  )
}

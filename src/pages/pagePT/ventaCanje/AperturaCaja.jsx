import { Button } from 'primereact/button'
import { confirmDialog } from 'primereact/confirmdialog'
import React from 'react'
import { Card } from 'react-bootstrap'
import { useNuevaVentaStore } from './NuevaVenta2/useNuevaVentaStore'

export const AperturaCaja = () => {
    const { onAperturarCaja } = useNuevaVentaStore()
    const onOpenModalAperturarCaja = ()=>{
        confirmDialog({
            header: 'Confirmar apertura de caja',
            message: '¿Está seguro que deseas abrir caja?',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                onAperturarCaja()
            },
            reject: () => {
                // nothing to do
            }
        })
    }
  return (
    <div className='' style={{height: '100vh'}}>
        <div className='d-flex justify-content-center align-items-center'>
            <Card className='p-1 w-75'>
                <Card.Body className='p-1 text-center'>
                    <Button label={<span className='fs-3'>¿DESEAS APERTURAR CAJA?</span>} onClick={onOpenModalAperturarCaja}/>
                </Card.Body>
            </Card>
        </div>
    </div>
  )
}


/*
<div className='' style={{height: '100vh'}}>
        <div className='d-flex justify-content-center align-items-center'>
            <Card className='p-1 w-75'>
                <Card.Header className=''>
                    <Card.Title className='fs-1'>CAJA RECEPCION</Card.Title>
                </Card.Header>
                <Card.Body>
                    <div className="card" style={{width: '100%'}}>
                        <ul className="list-group list-group-light">
                            <li class="list-group-item px-3">INGRESOS ADICIONALES</li>
                            <li class="list-group-item px-3">VENTAS</li>
                            <li class="list-group-item px-3">EGRESOS</li>
                        </ul>
                    </div>
                </Card.Body>
            </Card>
        </div>
    </div>
*/
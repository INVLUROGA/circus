import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles'
import { NumberFormatMoney } from '@/components/CurrencyMask'
import { Button } from 'primereact/button'
import React from 'react'
import { Card } from 'react-bootstrap'
import { makePropGetter } from 'react-table'

export const ItemComanda = ({onOpenModalCustomProdComanda, onOpenModalCustomServComanda, 
    item = {nombre_cliente: '', observacion: '', colaboradores: [{nombre_empl:'', cargo: ''}], estado: '', id: 0, prodServ: [{clase: 'prod', nombre: '', monto: ''}]}
}) => {
  return (
    <Card>
        <Card.Header>
            <div className='p-1 w-100 bg-success text-white text-center fs-1'>{item.estado}</div>
        </Card.Header>
        <Card.Body>
            <div className='d-flex flex-column'>
                <span className='mb-4 text-primary fs-3'>
                    CLIENTE: 
                    <div className='float-end text-black fs-1 text-break'>
                    {item.nombre_cliente}
                    </div>
                </span>
                <span className='mb-4 text-primary fs-3'>
                    COLABORADORES: 
                    {
                        item.colaboradores?.map(colaborador=>{
                            <span className='float-end text-black'>
                                {colaborador.cargo} - {colaborador.nombre_empl}
                            </span>
                        })
                    }
                </span>
                <span className='d-flex flex-column mb-4 fs-3'>
                    <span className=' text-primary'>
                        SERVICIOS/PRODUCTOS: 
                    </span>
                        {
                            item.prodServ.map(proser=>{
                                <span className='  text-black'>
                                    {proser.nombre} 
                                    <span className='float-end'>
                                        <SymbolSoles fontSizeS={'fs-4'} numero={<NumberFormatMoney amount={proser.monto}/>}/>
                                    </span>
                                </span>
                            })
                        }
                        <span className='float-end text-black fs-1'>
                            TOTAL
                            <span className='float-end'>
                                <SymbolSoles fontSizeS={'fs-3'} numero={<NumberFormatMoney amount={60}/>}/>
                            </span> 
                        </span>
                </span>
                <span className='text-primary fs-3'>
                    OBSERVACION: 
                </span>
                <span className='text-end float-end text-black fs-3'>
                    {item.observacion}
                </span>
                <span className='mb-4 text-primary fs-3'>
                    ID: 
                    <span className='float-end text-black'>
                    {item.id}
                    </span>
                </span>
            </div>
        </Card.Body>
        <Card.Footer className='d-flex flex-column'>
            <div className=''>
                <Button label={'AGREGAR PRODUCTO'} onClick={onOpenModalCustomProdComanda} className='m-1'/>
                <Button label={'AGREGAR SERVICIO'} onClick={onOpenModalCustomServComanda} className='float-end'/>
            </div>
            <div>
                <Button label={'AGREGAR VENTA'} className='m-1 w-100'/>
            </div>
        </Card.Footer>
    </Card>
  )
}

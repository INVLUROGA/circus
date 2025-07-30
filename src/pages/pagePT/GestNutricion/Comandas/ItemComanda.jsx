import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles'
import { NumberFormatMoney } from '@/components/CurrencyMask'
import { Button } from 'primereact/button'
import React from 'react'
import { Card } from 'react-bootstrap'

export const ItemComanda = () => {
  return (
    <Card>
        <Card.Header>
            <div className='p-1 w-100 bg-success text-white text-center fs-1'> PAGADA</div>
        </Card.Header>
        <Card.Body>
            <div className='d-flex flex-column'>
                <span className='mb-4 text-primary fs-3'>
                    CLIENTE: 
                    <div className='float-end text-black fs-1 text-break'>
                    CARLOS ROSALES MORALES
                    </div>
                </span>
                <span className='mb-4 text-primary fs-3'>
                    COLABORADORES: 
                    <span className='float-end text-black'>
                    ESTILISTA - YOHANDRI
                    </span> 
                    <span className='float-end text-black'>
                    ASISTENTE DE ESTILISTA - ANDREA
                    </span>
                </span>
                <span className='d-flex flex-column mb-4 fs-3'>
                    <span className=' text-primary'>
                        SERVICIOS/PRODUCTOS: 
                    </span>
                        <span className='  text-black'>
                            MORENA ILUMINADA 
                            <span className='float-end'>
                                <SymbolSoles fontSizeS={'fs-4'} numero={<NumberFormatMoney amount={30}/>}/>
                            </span>
                        </span>
                        <span className='float-end text-black'>
                            SHAMPOO
                            <span className='float-end'>
                                <SymbolSoles fontSizeS={'fs-4'} numero={<NumberFormatMoney amount={30}/>}/>
                            </span> 
                        </span>
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
                    AQUI DEBE IR ALGUN OTRA OBSERVACION
                </span>
                <span className='mb-4 text-primary fs-3'>
                    ID: 
                    <span className='float-end text-black'>
                    1450
                    </span>
                </span>
            </div>
        </Card.Body>
        <Card.Footer className='d-flex flex-column'>
            <div className=''>
                <Button label={'AGREGAR PRODUCTO'} className='m-1'/>
                <Button label={'AGREGAR SERVICIO'} className='float-end'/>
            </div>
            <div>
                <Button label={'AGREGAR VENTA'} className='m-1 w-100'/>
            </div>
        </Card.Footer>
    </Card>
  )
}

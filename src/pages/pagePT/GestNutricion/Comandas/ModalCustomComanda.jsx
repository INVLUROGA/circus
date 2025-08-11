import { Dialog } from 'primereact/dialog'
import React, { useState } from 'react'
import { Col, Row } from 'react-bootstrap'
import Select from 'react-select'
import { useComandasStore } from './useComandasStore'
import { useEffect } from 'react'
import { useForm } from '@/hooks/useForm'
import { arrayEstados, arrayEstadosVenta } from '@/types/type'
import { Button } from 'primereact/button'

const customcomandas = {
    id_cli: 0,
    observacion: '',
    status_remove: 0
}
export const ModalCustomComanda = ({onHide, show}) => {
    const { obtenerClientes, DataClientes, onPostComandas } = useComandasStore()
    const [isOpenModalCustomClase, setisOpenModalCustomClase] = useState({prod: false, serv: false})
    const { id_cli, observacion, status_remove, onInputChange, onInputChangeReact, onResetForm } = useForm(customcomandas)
    useEffect(() => {
        if(show){
            obtenerClientes()
        }
    }, [show])
    const onClickModalAgregarComanda = ()=>{
        onPostComandas({id_cli, observacion, status_remove, fecha_venta: new Date()})
    }
    const onClickModalCancelarComanda = ()=>{
        onResetForm()
        onHide?.()
    }
    const footerButtons = (
        <>
            <Button
                onClick={onClickModalCancelarComanda}
                label='CANCELAR'
                text
            />
              <Button
                onClick={onClickModalAgregarComanda}
                label="AGREGAR"
              />
        </>
    )
  return (
    <>
        <Dialog footer={footerButtons} style={{width: '40rem', height: '40rem'}} onHide={onHide} visible={show} header={'AGREGAR COMANDA'} position='top'>
            <form>
                <Row>
                    <Col xl={12} sm={12}>
                        <div className='mb-3'>
                            <label>CLIENTE:</label>
                            <Select
                                onChange={(e) => onInputChangeReact(e, 'id_cli')}
                                name="id_cli"
                                placeholder={'Seleccionar el cliente'}
                                className="react-select"
                                classNamePrefix="react-select"
                                options={DataClientes}
                                value={DataClientes.find(
                                    (option) => option.value === id_cli
                                )|| 0}
                                required
                            />
                        </div>
                    </Col>
                    <Col xl={12} sm={12}>
                        <div className='mb-3'>
                            <label>ESTADO:</label>
                            <Select
                                onChange={(e) => onInputChangeReact(e, 'status_remove')}
                                name="status_remove"
                                placeholder={'Seleccionar el estado'}
                                className="react-select"
                                classNamePrefix="react-select"
                                options={arrayEstadosVenta}
                                value={arrayEstadosVenta.find(
                                    (option) => option.value === status_remove
                                )|| 0}
                                required
                            />
                        </div>
                    </Col>
                    <Col xl={12} sm={12}>
                        <div className='mb-3'>
                            <label>OBSERVACION:</label>
                            <textarea
                                className='form-control'
                                onChange={onInputChange}
                                name='observacion'
                                value={observacion}
                            />
                        </div>
                    </Col>
                </Row>
            </form>
        </Dialog>
        
    </>
  )
}

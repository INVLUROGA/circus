import { Dialog } from 'primereact/dialog'
import React, { useEffect, useState } from 'react'
import { Form, SelectInput, TextInput } from '@/components';
import { useCalendarStore } from './useCalendarStore';
import Select from 'react-select'
import { useForm } from '@/hooks/useForm';
import { Col, Row } from 'react-bootstrap';
import { arrayEstadosCitas } from '@/types/type';
import { MultiOpcionSelect } from '../../GestInventario/components/ComponentSelect';
import { Button } from 'primereact/button';
import dayjs from 'dayjs';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore';
import { Loading } from '@/components/Loading';
import { ModalCliente } from '../../GestClientes/ModalCliente';
const customEvent = {
    id: 0,
    id_cli: 0,
    id_empl: 0,
    id_origen: 0,
    id_estado: 0,
    fecha_inicio: null,
    fecha_fin: null,
    etiquetas_busquedas: []
}
export const ModalCustomEvento = ({show, onHide, resor, onShowCustomEvento}) => {
    const { obtenerClientes, dataClientes, obtenerEmpleadosxDepartamento, dataEmpleados, dataParametrosServicios, obtenerServiciosxEmpresa, postEventoServicioxEmpresa, isLoading } = useCalendarStore()
    const { DataGeneral:dataOrigen, obtenerParametroPorEntidadyGrupo:obtenerDataOrigen } = useTerminoStore()
    const [isOpenModalCustomCliente, setisOpenModalCustomCliente] = useState(false)
    const { formState, 
            id_cli, 
            id_estado, 
            etiquetas_busquedas, 
            id_empl, 
            id_origen, 
            comentario,
            fecha_inicio, fecha_fin, onInputChange, onInputChangeReact, onResetForm } = useForm(resor)
    const [source, setSource] = useState([]);
    const [target, setTarget] = useState([]);
    // console.log({resor}, 'asdfasdf');
    // ———> Este es el useEffect para recalcular fecha_fin:
    
    useEffect(() => {
        if (!fecha_inicio) return;

        const totalDuracionMin = (etiquetas_busquedas || []).reduce((acum, serv) => {
        const dur = Number(serv.duracion) || 0;
        return acum + dur;
        }, 0);

        const nuevaFechaFin = dayjs(fecha_inicio)
        .add(totalDuracionMin, 'minute')
        .format('YYYY-MM-DDTHH:mm');

        onInputChange({
        target: { name: 'fecha_fin', value: nuevaFechaFin }
        });
    }, [fecha_inicio, etiquetas_busquedas]);
    
    useEffect(() => {
        if(show){
            obtenerClientes()
            obtenerEmpleadosxDepartamento()
            obtenerServiciosxEmpresa()
            setSource(dataParametrosServicios)
            obtenerDataOrigen('citas', 'origen-citas')
        }
    }, [show, isOpenModalCustomCliente])
    const onSubmitCustomEvento=()=>{
        onCancelModal()
        const {  id, ...valores} = formState
        postEventoServicioxEmpresa({...valores}, etiquetas_busquedas, new Date(dayjs(fecha_inicio).toISOString()))
    }
    const onCancelModal = (e)=>{
        onHide()
        onResetForm()
    }
    const onOpenModalRegisterCliente = ()=>{
        setisOpenModalCustomCliente(true)
        // onCancelModal()
    }
    const onCloseModalRegisterCliente = ()=>{
        setisOpenModalCustomCliente(false)
        onShowCustomEvento(resor)
    }
  return (
    <>
    <ModalCliente show={isOpenModalCustomCliente} onHide={onCloseModalRegisterCliente}/>
    {
        isLoading ? (
            <Loading show={isLoading}/>
        ) : (
            <Dialog visible={show} footer={<>
                                                <Button onClick={onSubmitCustomEvento} label='AGREGAR EVENTO'/>
                                                <Button label='cancelar' text/></>} onHide={onHide} header={'Agregar Evento'} style={{width: '50rem', height: '50rem'}}>
                <Row>
                    <Col lg={12}>
                                    <Form>
                                                <Row>
                                                <Col sm={12}>
                                                    <div className='m-2 d-flex align-items-end'>
                                                        <div className='w-75'>
                                                            <label>Cliente:</label> 
                                                            <Select
                                                                onChange={(e) => onInputChangeReact(e, 'id_cli')}
                                                                name="id_cli"
                                                                placeholder={'Seleccionar...'}
                                                                className="react-select"
                                                                classNamePrefix="react-select"
                                                                options={dataClientes}
                                                                value={(dataClientes||[]).find((op)=>op.value===id_cli)}
                                                                required
                                                            />
                                                        </div>
                                                        <div className='mx-2'>
                                                            <Button label='CLIENTE' icon={'pi pi-plus'} onClick={onOpenModalRegisterCliente}/>
                                                        </div>
                                                    </div>
                                                </Col>
                                                <Col sm={6}>
                                                    <div className='m-2'>
                                                        <label>{'Estado de cita'}:</label>
                                                        <Select
                                                            onChange={(e) => onInputChangeReact(e, 'id_estado')}
                                                            name="id_estado"
                                                            placeholder={'Seleccionar...'}
                                                            className="react-select"
                                                            classNamePrefix="react-select"
                                                            options={arrayEstadosCitas}
                                                            value={arrayEstadosCitas.find((op)=>op.value===id_estado)}
                                                            required
                                                        />
                                                    </div>
                                                </Col>
                                                <Col sm={6}>
                                                    <div className='m-2'>
                                                        <label>{'Origen'}:</label>
                                                        <Select
                                                            onChange={(e) => onInputChangeReact(e, 'id_origen')}
                                                            name="id_origen"
                                                            placeholder={'Seleccionar...'}
                                                            className="react-select"
                                                            classNamePrefix="react-select"
                                                            options={dataOrigen}
                                                            value={(dataOrigen||[]).find((op)=>op.value===id_origen)}
                                                            required
                                                        />
                                                    </div>
                                                </Col>
                                                <Col sm={6}>
                                                    <div className="m-2">
                                                        <label htmlFor="fecha_inicio" className="form-label">
                                                            FECHA DE ENTRADA ({fecha_inicio?.split('T')[0] || ''})
                                                        </label>
                                                            {/* 2) Hora editable */}
                                                        <input
                                                            type="time"
                                                            className="form-control"
                                                            value={fecha_inicio?.split('T')[1]?.substring(0, 5) || ''}
                                                            onChange={(e) => {
                                                            // Obtener la parte “YYYY-MM-DD” actual (la que está fija)
                                                            const datePart = fecha_inicio.split('T')[0]
                                                            // Armar el nuevo string “YYYY-MM-DDTHH:mm”
                                                            const nuevaFecha = `${datePart}T${e.target.value}`
                                                            onInputChange({
                                                                target: { name: 'fecha_inicio', value: nuevaFecha }
                                                            })
                                                            }}
                                                            required
                                                        />
                                                    </div>
                                                </Col>
                                                <Col sm={6}>
                                                    <div className="m-2">
                                                        <label htmlFor="fecha_fin" className="form-label">
                                                            FECHA FIN
                                                        </label>
                                                        <input
                                                                className="form-control"
                                                                name="fecha_fin"
                                                                id="fecha_fin"
                                                                disabled
                                                                value={fecha_fin}
                                                                type='datetime-local'
                                                                onChange={onInputChange}
                                                                placeholder=""
                                                                required
                                                            />
                                                    </div>
                                                </Col>
                                                <Col sm={12}>
                                                    <div className='m-2'>
                                                        <label>ESTILISTA:</label>
                                                        <Select
                                                            onChange={(e) => onInputChangeReact(e, 'id_empl')}
                                                            name="id_empl"
                                                            placeholder={'Seleccionar...'}
                                                            className="react-select"
                                                            classNamePrefix="react-select"
                                                            options={dataEmpleados}
                                                            value={dataEmpleados.find((op)=>op.value===id_empl)}
                                                            required
                                                        />
                                                    </div>
                                                </Col>
                                                <Col>
                                                    <div className='m-2'>
                                                        <label>SERVICIOS:</label>
                                                        <MultiOpcionSelect
                                                            options={dataParametrosServicios}
                                                            onChange={(e)=>onInputChangeReact(e, 'etiquetas_busquedas')}
                                                            postOptions={null}
                                                            value={etiquetas_busquedas}
                                                            name="etiquetas_busquedas"
                                                        />
                                                    </div>
                                                </Col>
                                                <Col sm={12}>
                                                    <div className="m-2">
                                                        <label htmlFor="fecha_inicio" className="form-label">
                                                            COMENTARIO
                                                        </label>
                                                        <textarea
                                                                className="form-control"
                                                                name="comentario"
                                                                id="comentario"
                                                                value={comentario}
                                                                onChange={onInputChange}
                                                                placeholder="...."
                                                                required
                                                            />
                                                    </div>
                                                </Col>
                                                {/*
                                                <Col sm={6}>
                                                    <div className="m-2">
                                                        <label htmlFor="fecha_fin" className="form-label">
                                                            FECHA DE FIN
                                                        </label>
                                                        <input
                                                                className="form-control"
                                                                name="fecha_fin"
                                                                id="fecha_fin"
                                                                value={fecha_fin}
                                                                type='datetime-local'
                                                                onChange={onInputChange}
                                                                placeholder=""
                                                                required
                                                            />
                                                    </div>
                                                </Col> */}
                                                </Row> 
                                    </Form>
                    </Col>
                </Row>
            </Dialog>
        )
    }
    </>
  )
}

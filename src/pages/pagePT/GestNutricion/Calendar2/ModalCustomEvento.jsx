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
import { ProfileCard } from './ProfileCard';
import SimpleBar from 'simplebar-react';
import { ModalInfoCliente } from '../ModalInfoCliente';
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
    const [isOpenModalEventoDelCliente, setisOpenModalEventoDelCliente] = useState({isOpen: false, id_cli: 0})
    const onOpenModalEventosDelCliente = ()=>{
        setisOpenModalEventoDelCliente({isOpen: true, id_cli: id_cli})
    }
    const onCloseModalEventosDelCliente = ()=>{
        setisOpenModalEventoDelCliente({isOpen: false, id_cli: 0})
    }
    const onChangeCliente = (e, id)=>{
        onInputChangeReact(e, id)
    }
  return (
		<>
			<ModalCliente show={isOpenModalCustomCliente} onHide={onCloseModalRegisterCliente} />
			{isLoading ? (
				<Loading show={isLoading} />
			) : (
				<Dialog
					visible={show}
					onHide={onHide}
					header="Agregar Evento"
					footer={
						    <div className="d-flex justify-content-between">
                                <div>
                                <Button onClick={onSubmitCustomEvento} label="AGREGAR EVENTO" />
                                <Button label="cancelar" text />
                                </div>
                                    {
                                        isOpenModalEventoDelCliente.id_cli==0 && (
                                            <div>
                                            <Button onClick={onOpenModalEventosDelCliente} label="VER PERFIL" className='bg-change' />
                                            </div>
                                        )
                                    }
                            </div>
					}
					style={{ width: '60rem', maxHeight: '90vh' }} // no height fijo
					breakpoints={{ '960px': '90vw', '640px': '100vw' }}
				>
					<div style={{ height: '70vh', overflow: 'hidden' }}>
						<Row style={{ height: '100%' }}>
							<Col lg={12}>
								<SimpleBar style={{ maxHeight: '100%' }}>
									<Form>
										<Row>
											<Col sm={12}>
												<div className="m-2 d-flex align-items-end">
													<div className="w-75">
														<label>Cliente:</label>
														<Select
															onChange={(e) =>
																onChangeCliente(e, 'id_cli')
															}
															name="id_cli"
															placeholder={'Seleccionar...'}
															className="react-select"
															classNamePrefix="react-select"
															options={dataClientes}
															value={(dataClientes || []).find(
																(op) => op.value === id_cli
															)}
															required
														/>
													</div>
													<div className="mx-2">
														<Button
															label="CLIENTE"
															icon={'pi pi-plus'}
															onClick={onOpenModalRegisterCliente}
														/>
													</div>
												</div>
											</Col>

											<Col sm={6}>
												<div className="m-2">
													<label>{'Estado de cita'}:</label>
													<Select
														onChange={(e) =>
															onInputChangeReact(e, 'id_estado')
														}
														name="id_estado"
														placeholder={'Seleccionar...'}
														className="react-select"
														classNamePrefix="react-select"
														options={arrayEstadosCitas}
														value={arrayEstadosCitas.find(
															(op) => op.value === id_estado
														)}
														required
													/>
												</div>
											</Col>

											<Col sm={6}>
												<div className="m-2">
													<label>{'Origen'}:</label>
													<Select
														onChange={(e) =>
															onInputChangeReact(e, 'id_origen')
														}
														name="id_origen"
														placeholder={'Seleccionar...'}
														className="react-select"
														classNamePrefix="react-select"
														options={dataOrigen}
														value={(dataOrigen || []).find(
															(op) => op.value === id_origen
														)}
														required
													/>
												</div>
											</Col>

											<Col sm={6}>
												<div className="m-2">
													<label
														htmlFor="fecha_inicio"
														className="form-label"
													>
														FECHA DE ENTRADA 
                                                        <br/>
                                                        ({fecha_inicio?.split('T')[0] || ''})
													</label>
													<input
														type="time"
														className="form-control"
														value={
															fecha_inicio
																?.split('T')[1]
																?.substring(0, 5) || ''
														}
														onChange={(e) => {
															const datePart =
																fecha_inicio.split('T')[0];
															const nuevaFecha = `${datePart}T${e.target.value}`;
															onInputChange({
																target: {
																	name: 'fecha_inicio',
																	value: nuevaFecha,
																},
															});
														}}
														required
													/>
												</div>
											</Col>

											<Col sm={6}>
												<div className="m-2">
													<label
														htmlFor="fecha_fin"
														className="form-label"
													>
                                                        <br/>
														FECHA FIN
													</label>
													<input
														className="form-control"
														name="fecha_fin"
														id="fecha_fin"
														disabled
														value={fecha_fin}
														type="datetime-local"
														onChange={onInputChange}
														required
													/>
												</div>
											</Col>

											<Col sm={12}>
												<div className="m-2">
													<label>ESTILISTA:</label>
													<Select
														onChange={(e) =>
															onInputChangeReact(e, 'id_empl')
														}
														name="id_empl"
														placeholder={'Seleccionar...'}
														className="react-select"
														classNamePrefix="react-select"
														options={dataEmpleados}
														value={dataEmpleados.find(
															(op) => op.value === id_empl
														)}
														required
													/>
												</div>
											</Col>

											<Col>
												<div className="m-2">
													<label>SERVICIOS:</label>
													<MultiOpcionSelect
														options={dataParametrosServicios}
														onChange={(e) =>
															onInputChangeReact(
																e,
																'etiquetas_busquedas'
															)
														}
														postOptions={null}
														value={etiquetas_busquedas}
														name="etiquetas_busquedas"
													/>
												</div>
											</Col>

											<Col sm={12}>
												<div className="m-2">
													<label
														htmlFor="comentario"
														className="form-label"
													>
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
										</Row>
									</Form>
								</SimpleBar>
							</Col>
							{/* <Col lg={5} style={{ height: '100%' }}>
								<SimpleBar style={{ maxHeight: '100%' }}>
									<div style={{ padding: '0.5rem' }}>
										<InfoEventosClientes
											onHide={onCloseModalEventosDelCliente}
											show={isOpenModalEventoDelCliente}
										/>
									</div>
								</SimpleBar>
							</Col> */}
						</Row>
					</div>
				</Dialog>
			)}
            <ModalInfoCliente id_cli={isOpenModalEventoDelCliente.id_cli} onHide={onCloseModalEventosDelCliente} show={isOpenModalEventoDelCliente.isOpen}/>
		</>
  );
}

const InfoEventosClientes = ({show, onHide})=>{
    return (
        <>
        
                            <ProfileCard/>
                            <ProfileCard/>
                            <ProfileCard/>
                            <ProfileCard/>
                            <ProfileCard/>
        </>
    )
}

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
import { DateMask } from '@/components/CurrencyMask';

export const ModalInfoEvento = ({show, onHide, resor={}}) => {
const { obtenerClientes, dataClientes, obtenerEmpleadosxDepartamento, dataEmpleados, dataParametrosServicios, obtenerServiciosxEmpresa, postEventoServicioxEmpresa, isLoading, putEventoServicioxEmpresa } = useCalendarStore()
    const { DataGeneral:dataOrigen, obtenerParametroPorEntidadyGrupo:obtenerDataOrigen } = useTerminoStore()
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
    const cancelInfoEvento = ()=>{
        onHide()
        onResetForm()
    }
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
        }, [show])
        const onSubmitCustomEvento=()=>{
            cancelInfoEvento()
            const {  id, ...valores} = formState
            console.log({eninfo: formState.start});
            
            putEventoServicioxEmpresa({...valores}, etiquetas_busquedas, new Date(dayjs(formState.start).toISOString()), formState.id)
        }
        const onDeleteEvento=()=>{
            cancelInfoEvento()
            const {  id, ...valores} = formState
            console.log({eninfo: formState.start});
            putEventoServicioxEmpresa({flag: false}, etiquetas_busquedas, new Date(dayjs(formState.start).toISOString()), formState.id)
        }
    const footerModal = ()=>{
        return (
            <>
            <Button className='' style={{margin: '5px'}} label='CANCELAR' onClick={cancelInfoEvento} text/>
            <Button className='' style={{margin: '5px'}} label='GUARDAR' onClick={onSubmitCustomEvento}/>
            <Button className='bg-change' style={{margin: '5px'}} label='ELIMINAR' onClick={onDeleteEvento}/>
            {/* <Button className='bg-leyenda-asistio' style={{margin: '5px'}} label='ASISTIO'/>
            <Button className='bg-leyenda-no-asistio' style={{margin: '5px'}} label='NO ASISTIO'/>
            <Button className='bg-leyenda-cancelada' style={{margin: '5px'}} label='CANCELADA'/> */}
            </>
        )
    }
    
      const labelStyle = {
    // fontWeight: "light",

    width: "250px",
    textTransform: "uppercase",
  };

  const valueStyle = {
    color: "#374151",
  };
  const serviciosCitas = formState?.eventos?.map(citas=>{
    return {
        label: citas.nombre_servicio
    }
  })
  return (
    <Dialog onHide={cancelInfoEvento} visible={show} footer={footerModal} style={{width: '50rem'}}>
        {/* {JSON.stringify(resor)} */}
        <div className='d-flex justify-content-center'>
            <div style={{ fontFamily: "Arial, sans-serif", display: "flex", flexDirection: "column", gap: "10px", maxWidth: "800px" }}>
                <div style={{ display: "flex" }}>
                    <span style={labelStyle} className='fw-light'>NOMBRE DEL CLIENTE:</span>
                    <span style={valueStyle}>{formState.title}</span>
                </div>
                <div style={{ display: "flex" }}>
                    <span style={labelStyle} className='fw-light'>TELEFONO DEL CLIENTE:</span>
                    <span style={valueStyle}>{formState.tel_cli}</span>
                </div>
                <div style={{ display: "flex" }}>
                    <span style={labelStyle} className='fw-light'>DNI DEL CLIENTE:</span>
                    <span style={valueStyle}>{formState.num_Doc_cli}</span>
                </div>
                <div style={{ display: "flex" }}>
                    <span style={labelStyle} className='fw-light'>COMIENZA:</span>
                    <span style={valueStyle}><DateMask date={formState.start} format={'hh:mm A'}/></span>
                </div>
                <div style={{ display: "flex" }}>
                    <span style={labelStyle} className='fw-light'>FINALIZA:</span>
                    <span style={valueStyle}><DateMask date={formState.end} format={'hh:mm A'}/></span>
                </div>
                <div style={{ display: "flex" }}>
                    <span style={labelStyle} className='fw-light'>ORIGEN:</span>
                    <span style={valueStyle}>{(dataOrigen||[]).find((op)=>op.value===id_origen)?.label}</span>
                </div>
                <div style={{ display: "flex" }}>
                    <span style={labelStyle} className='fw-light'>ESTADO:</span>
                    <span style={valueStyle}>
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
                    </span>
                </div>
                <div style={{ display: "flex" }}>
                    <span style={labelStyle} className='fw-light'>SERVICIOS:</span>
                    <div className='d-flex flex-column'>
                        {
                            serviciosCitas?.map(serv=>{
                                return(
                                    <span style={valueStyle}>{serv.label}</span>
                                )
                            })
                        }
                    </div>
                </div>
                <div style={{ display: "flex" }}>
                    <span style={labelStyle} className='fw-light'>COMENTARIOS:</span>
                    <span style={valueStyle}>
                        <textarea
                        value={comentario}
                        onChange={onInputChange}
                        name='comentario'
                        />
                    </span>
                </div>
            {/* {JSON.stringify(resor)} */}
            {/* {JSON.stringify(dataOrigen)} */}
            {/* {JSON.stringify(serviciosCitas)} */}
            </div>
        </div>
    </Dialog>
  )
}

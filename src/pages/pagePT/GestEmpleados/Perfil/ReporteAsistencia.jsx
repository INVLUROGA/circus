import { Button } from 'primereact/button'
import React, { useEffect, useState } from 'react'
import { ModalReportAsistencia } from './ModalReportAsistencia'
import {  ModalHorasEspeciales } from './ModalHorasEspeciales'
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore'
import { Table } from 'react-bootstrap'
import pdfMake from 'pdfmake/build/pdfmake'
import { fontsRoboto } from '@/assets/fonts/fontsRoboto'
import { ModalAgregarNomina } from './ModalAgregarNomina'
import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles'
import { usePlanillaStore } from './usePlanillaStore'
import dayjs from 'dayjs'
pdfMake.vfs = fontsRoboto

export const ReporteAsistencia = ({uid_empl, avatarImage}) => {

    const [isOpenModalAgregarNomina, setisOpenModalAgregarNomina] = useState(false)
	const [isOpenModalReportNominas, setisOpenModalReportNominas] = useState(false)
	const [isOpenModalReportAsistencia, setisOpenModalReportAsistencia] = useState(false)
    const [dataPeriodoParamSelect, setdataPeriodoParamSelect] = useState({id_param: '', fecha_hasta: '', fecha_desde:''})
	const [uidEmpleado, setuidEmpleado] = useState('')
	const [idPlanilla, setidPlanilla] = useState(0)
    const { DataPeriodoParam, obtenerParametroPorEntidadyGrupo_PERIODO } = useTerminoStore()
	const { dataPlanillaxEmpl, obtenerPlanillaxEmpl } = usePlanillaStore()
    const onOpenModalReportAsistencia = (id_param, fecha_hasta, fecha_desde)=>{
        setisOpenModalAgregarNomina(true)
        setdataPeriodoParamSelect({id_param, fecha_desde, fecha_hasta})
    }
    const onCloseModalNomina = ()=>{
        setisOpenModalAgregarNomina(false)
    }
    useEffect(() => {
      obtenerParametroPorEntidadyGrupo_PERIODO('EMPLEADO', 'PERIODO_ASISTENCIA')
	  obtenerPlanillaxEmpl(uid_empl)
    }, [])
	const onClickModalReporteAsistencia = (id_p, uid_emp)=>{
		setidPlanilla(id_p)
		setuidEmpleado(uid_emp)
		setisOpenModalReportAsistencia(true)
	}	
	const onClickCloseModalReporteAsistencia = ()=>{
		setisOpenModalReportAsistencia(false)
	}
  return (
    <>
                        <Button onClick={onOpenModalReportAsistencia} className='m-2'>AGREGAR PLANILLA</Button>
                        
                    <Table
                        // style={{tableLayout: 'fixed'}}
                        className="table-centered mb-0"
                        hover
                        responsive
                    >
                        <thead className="bg-primary">
                            <tr>
                                <th className='text-white p-1'>ID</th>
                                <th className='text-white p-1'>FECHA</th>
                                <th className='text-white p-1'>REMUNERACIONES <SymbolSoles/></th>
                                <th className='text-white p-1'>DESCUENTOS <SymbolSoles/></th>
                                <th className='text-white p-1'>APORTES <SymbolSoles/></th>
                                <th className='text-white p-1'>VER ASISTENCIAS</th>
                                <th className='text-white p-1'>VER NOMINA</th>
                            </tr>
                        </thead>
                        <tbody>
							{dataPlanillaxEmpl.map(p=>(
									<tr>
									<td>{p.id}</td>
									<td>{dayjs.utc(p.fecha_desde).format('dddd DD [de] MMMM [del] YYYY')}</td>
									<td></td>
									<td></td>
									<td></td>
									<td><a onClick={()=>onClickModalReporteAsistencia(p.id, p.uid_empleado)} className='text-primary border-bottom-2 cursor-pointer'>VER</a></td>
									<td><a className='text-primary border-bottom-2 cursor-pointer'>VER</a></td>
								</tr>
							))}
                        </tbody>
                    </Table>
                        <ModalAgregarNomina uid_empl={uid_empl} dataPeriodoParamSelect={dataPeriodoParamSelect} show={isOpenModalAgregarNomina} onHide={onCloseModalNomina}/>
                        <ModalReportAsistencia avatarImage={avatarImage} id_planilla={idPlanilla} uid_empl={uid_empl} dataPeriodoParamSelect={dataPeriodoParamSelect} show={isOpenModalReportAsistencia} onHide={onClickCloseModalReporteAsistencia}/>
    </>
  )
}

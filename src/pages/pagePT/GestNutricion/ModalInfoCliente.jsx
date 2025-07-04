import { useUsuarioStore } from '@/hooks/hookApi/useUsuarioStore'
import { Dialog } from 'primereact/dialog'
import React, { useEffect } from 'react'
import { Col, Row } from 'react-bootstrap'
import { ProfileCard } from './Calendar2/ProfileCard'
import { useCalendarStore } from './Calendar2/useCalendarStore'

export const ModalInfoCliente = ({id_cli, show, onHide}) => {
    const { obtenerClientexID, dataClixID } = useUsuarioStore()
        const { dataCitasxIdcli, obtenerEventoServicioxIdCli } = useCalendarStore()
    useEffect(() => {
        if(id_cli!==0){
            obtenerClientexID(id_cli)
            obtenerEventoServicioxIdCli(id_cli)
            
        }
    }, [id_cli])
    const arrayInfoDataCli = [
        {
            label: 'NOMBRES Y APELLIDOS',
            value: dataClixID?.nombres_apellidos_cli
        },
        {
            label: 'fecha de nacimiento',
            value: dataClixID?.fecNac_cli
        },
        {
            label: 'GENERO',
            value: dataClixID?.sexo_cli,
        },
        {
            label: 'TIPO DE DOCUMENTO',
            value: dataClixID?.tipoDoc_cli,
        },
        {
            label: 'N° DOCUMENTO',
            value: dataClixID?.numDoc_cli,
        },
        {
            label: 'DIRECCION',
            value: dataClixID?.direccion_cli,
        },
        {
            label: 'EMAIL',
            value: dataClixID?.email_cli,
        },
        {
            label: 'TELEFONO',
            value: dataClixID?.tel_cli,
        }
    ]
  return (
    <Dialog visible={show} onHide={onHide} header={'INFORMACION DEL CLIENTE'} style={{width: '60rem'}}>
        {id_cli}
        {
            id_cli==0 ?(
                <>
                CARGANDO
                </>
            ):(
                
        <Row>
            <Col lg={6}>
                {
                    arrayInfoDataCli.map(cliente=>{
                        return (
                            <div>
                                <p className='text-change'>{cliente.label}</p>
                                <p>{cliente.value !== null && cliente.value !== '' ? cliente.value : 'No registrado'}</p>
                            </div>
                        )
                    })
                }
            </Col>
            <Col lg={6}>
            {
                dataCitasxIdcli.map(cli=>{
                    return (
                        <ProfileCard dataxIdcli={cli}/>
                    )
                })
            }
            </Col>
        </Row>
            ) 
        }
    </Dialog>
  )
}

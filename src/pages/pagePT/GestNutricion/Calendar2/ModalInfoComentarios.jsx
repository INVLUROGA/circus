import { Dialog } from 'primereact/dialog'
import React, { useEffect } from 'react'
import { useCalendarStore } from './useCalendarStore';
import { SectionComentario } from '@/components/Comentario/SectionComentario';

export const ModalInfoComentarios = ({show, onHide, id_cli}) => {
    console.log({id_cli});
    const { obtenerCliente, datacliente } = useCalendarStore()
    useEffect(() => {
        if(show && id_cli>0){
            obtenerCliente(id_cli)
        }
    }, [show, id_cli>0])
    
  return (
    <Dialog header={'COMENTARIOS'} style={{width: '50rem', height: '80rem'}} visible={show} onHide={onHide}>
                <SectionComentario uid_comentario={datacliente.uid_comentario}/>
    </Dialog>
  )
}

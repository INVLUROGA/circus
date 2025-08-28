import { Dialog } from 'primereact/dialog'
import React from 'react'

export const ModalAgregarNotaCredito = ({show, onHide}) => {
  return (
    <Dialog header={'AGREGAR NOTA CREDITO'} style={{width: '40rem'}} visible={show} onHide={onHide}>
        <form>
            {/* COMPROBANTE DE NOTA DE CREDITO, OBSERVACION, MOTIVO*/}
            FECHA: 27 DE AGOSTO DEL 2025
            <div className='mt-3'>
                <label>COMPROBANTE DE NOTA DE CREDITO</label>
                <input
                    type='text'
                    className='form-control'
                    placeholder='COMPROBANTE DE NOTA DE CREDITO'
                />
            </div>
            <div className='mt-3'>
                <label>COMPROBANTE DE NOTA DE CREDITO</label>
                <input
                    type='text'
                    className='form-control'
                    placeholder='COMPROBANTE DE NOTA DE CREDITO'
                />
            </div>
            <div className='mt-3'>
                <label>OBSERVACION</label>
                <textarea
                    className='form-control'
                    placeholder='OBSERVACION'
                />
            </div>

        </form>
    </Dialog>
  )
}

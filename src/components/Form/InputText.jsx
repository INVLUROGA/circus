import React from 'react'

export const InputText = ({ width='200px', ...props}) => {
  return (
    <div className="border-3 border-primary rounded bg-white d-flex" style={{ width: width, height: '60px' }}>
        <input
            {...props}
            className="border-0 outline-none fs-2"
            style={{
            padding: '5px',
            width: '100%',
            boxSizing: 'border-box',
            }}
        />
    </div>

  )
}

export const InputSelect = ({...props}) => {
  return (
    <div className="border-3 border-primary rounded" style={{ width: '200px', height: '60px' }}>
        <select className="form-select" {...props}>
                <option value="comprobante">COMPROBANTES</option>
                <option value="dia">Por día</option>
                <option value="semana">Por semana</option>
                <option value="mes">Por mes</option>
                <option value="anio">Por año</option>
              </select>
    </div>

  )
}

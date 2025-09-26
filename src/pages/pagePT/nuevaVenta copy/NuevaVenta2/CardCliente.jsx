import React, { useState } from 'react'
import { Card } from 'react-bootstrap'
import Select from 'react-select'
import DatosCliente from '../DatosCliente'

export const CardCliente = ({dataCliente}) => {
  // console.log(dataCliente);
  const [NombreCliente, setNombreCliente] = useState('CLIENTE')
  return (
    <Card>
        <Card.Header>
            <h1>{NombreCliente}</h1>
        </Card.Header>
        <Card.Body>
            <DatosCliente setNombreCliente={setNombreCliente} dataCliente={dataCliente}/>
        </Card.Body>
    </Card>
  )
}

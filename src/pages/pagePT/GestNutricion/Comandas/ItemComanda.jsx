import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles'
import { DateMask, NumberFormatMoney } from '@/components/CurrencyMask'
import { Button } from 'primereact/button'
import React from 'react'
import { Card, Table } from 'react-bootstrap'
import { makePropGetter } from 'react-table'

export const ItemComanda = ({
  onOpenModalCustomProdComanda,
  onOpenModalCustomServComanda,
  item = {
    id: 0,
    fecha_venta: new Date(),
    nombre_cliente: '',
    status_color: '',
    observacion: '',
    estado: '',
    productos: [{ clase: 'producto', nombre: '', monto: '', colaborador: '' }],
    servicios: [{ clase: 'servicios', nombre: '', monto: '', colaborador: '' }]
  }
}) => {
  const prodSer = [...(item?.servicios ?? []), ...(item?.productos ?? [])];
  const total = prodSer.reduce((sum, it) => sum + (Number(it?.monto) || 0), 0);

  return (
    <Card>
      <Card.Header>
        <div className={`p-1 w-100 ${item?.status_color} text-white text-center fs-1`}>
          {item?.estado}
        </div>
      </Card.Header>

      <Card.Body>
        <div className='d-flex flex-column'>
          <div className='mb-4 text-primary fs-3'>
            CLIENTE: <span className='text-black'>{item.nombre_cliente}</span> / <DateMask date={item?.fecha_venta} format={'dddd DD [de] MMMM [DEL] YYYY [a las] hh:mm A'} />
            {/* <div className='float-end text-primary fs-1 text-break'>
              FECHA:{' '}
              <span className='text-black'>
              </span>
            </div> */}
          </div>
              {JSON.stringify(prodSer)}
          <div>
            <Table striped bordered>
              <thead className='bg-primary fs-3'>
                <tr>
                  <th><div className='text-white'>#</div></th>
                  <th><div className='text-white'>clase</div></th>
                  <th><div className='text-white'>COLABORADOR</div></th>
                  <th><div className='text-white'>SERVICIO/PRODUCTO</div></th>
                  <th><div className='text-white'>MONTO <br/> S/.</div></th>
                </tr>
              </thead>
              <tbody>
                {prodSer.map((proSe, i) => (
                  <tr key={proSe.id ?? `${proSe.clase}-${i}`}>
                    <td>{i + 1}</td>
                    <td>{proSe.clase}</td>
                    <td>{proSe.colaborador}</td>
                    <td>{proSe.nombre}</td>
                    <td><NumberFormatMoney amount={Number(proSe.monto) || 0} /></td>
                  </tr>
                ))}
                <tr>
                  <td></td><td></td><td></td>
                  <td><div className='bg-primary fs-2 text-center'>TOTAL</div></td>
                  <td><NumberFormatMoney amount={total} /></td>
                </tr>
              </tbody>
            </Table>
          </div>

          <div className='text-primary fs-3'>OBSERVACION:</div>
          <div className='text-end float-end text-black fs-3'>{item.observacion}</div>
        </div>
      </Card.Body>

      <Card.Footer className='d-flex flex-column'>
        <div>
          <Button label='AGREGAR PRODUCTO' onClick={() => onOpenModalCustomProdComanda(item.id)} className='m-1' />
          <Button label='AGREGAR SERVICIO' onClick={() => onOpenModalCustomServComanda(item.id)} className='float-end' />
        </div>
      </Card.Footer>
    </Card>
  );
};
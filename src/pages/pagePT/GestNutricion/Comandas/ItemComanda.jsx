import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles'
import { DateMask, NumberFormatMoney } from '@/components/CurrencyMask'
import { Button } from 'primereact/button'
import React from 'react'
import { Card, Col, Row, Table } from 'react-bootstrap'
import { makePropGetter } from 'react-table'
import Select from 'react-select'
export const ItemComanda = ({
  onOpenModalCustomProdComanda,
  onOpenModalCustomServComanda,
  dataServicios,
  dataProductos,
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
    <Card className='p-3'>
      <Card.Header>
        <div className={`p-1 w-100 ${item?.status_color} text-white text-center fs-1`}>
          {item?.estado}
        </div>
      </Card.Header>

      <Card.Body>
        <div className='d-flex flex-column'>
          <div className='mb-4 text-primary fs-3'>
            <span className='fs-1'>
              CLIENTE: 
              <span className='text-black fs-1 ml-2'> {item.nombre_cliente}</span> 
            </span>
            <br/>
            <span className='fs-2'>
              FECHA: 
            <span className='text-black  ml-2'><DateMask date={item?.fecha_venta} format={'dddd DD [de] MMMM [DEL] YYYY [a las] hh:mm A'} /></span>
            </span>
            {/* <div className='float-end text-primary fs-1 text-break'>
              FECHA:{' '}
              <span className='text-black'>
              </span>
            </div> */}
          </div>
          <div>
            <Table striped bordered>
              <thead className='bg-primary fs-3'>
                <tr>
                  <th><div className='text-white'>#</div></th>
                  <th><div className='text-white'>clase</div></th>
                  <th><div className='text-white'>COLABORADOR</div></th>
                  <th><div className='text-white'>SERVICIO/PRODUCTO</div></th>
                  <th><div className='text-white'>MONTO <br/> S/.</div></th>
                  <th><div className='text-white'>PROMOCION / <br/> % DESCUENTO</div></th>
                </tr>
              </thead>
              <tbody>
                {prodSer.map((proSe, i) => (
                  <tr key={proSe.id ?? `${proSe.clase}-${i}`}>
                    <td><div className='fs-3'>{i + 1}</div></td>
                    <td><div className='fs-3'>{proSe.clase}</div></td>
                    <td><div className='fs-3'><span className={'fs-2 text-primary'}>{proSe.nombre_colaborador}</span> { proSe.apellido_paterno_colaborador }</div></td>
                    <td><div className='fs-3'>{proSe.nombre}</div></td>
                    <td><div className='fs-3 text-end'><NumberFormatMoney amount={Number(proSe.precio) || 0} /></div></td>
                    <td><div className='fs-3 text-end'>
                      <Select
                        options={[{value: 30, label: '30%'}, {value: 20, label: '20%'}, {value: 10, label: '10%'}]}
                        placeholder={'%'}
                      />
                       </div></td>
                  </tr>
                ))}
              </tbody>
                <tr>
                  <td></td><td></td><td></td>
                  <td className='m-0 p-0 bg-primary'><div className='text-white fs-1 text-center m-0 p-0'>TOTAL</div></td>
                  <td className=''><div className='fs-2 text-end'><NumberFormatMoney amount={total} /></div></td>
                </tr>
            </Table>
          </div>
          <div>
            <Row>
              <Col lg={4}>
                <div className='d-flex flex-column'>
                  <Button className='m-2' label='AGREGAR PRODUCTO' onClick={() => onOpenModalCustomProdComanda(item.id)} />
                  <Button className='m-2' label='AGREGAR SERVICIO' onClick={() => onOpenModalCustomServComanda(item.id)} />
                </div>
              </Col>
              <Col lg={8}>
                <div className='border border-4 rounded-4 border-primary w-100 h-100'>
                <div className='text-primary fs-3 px-2'>OBSERVACION:</div>
                  {item.observacion}
                  </div>
              </Col>
            </Row>
        </div>
        </div>
      </Card.Body>

    </Card>
  );
};
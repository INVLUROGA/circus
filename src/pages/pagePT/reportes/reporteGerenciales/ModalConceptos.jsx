import { NumberFormatMoney } from '@/components/CurrencyMask';
import { Dialog } from 'primereact/dialog'
import React, { useState } from 'react'
import { Table } from 'react-bootstrap';
import { ModalDetallexCelda } from '../../FlujoCaja/ModalDetallexCelda';

export const ModalConceptos = ({dataProp, show, onHide, textEmpresa, background}) => {
  console.log({dataProp});
  const [data, setdata] = useState([])
  const [isOpenModalDetallexCelda, setisOpenModalDetallexCelda] = useState(false)
  const onClickModalDetalle = (data)=>{
    setdata(data)
    setisOpenModalDetallexCelda(true)
  }
  const onCloseModalDetalle = ()=>{
    setisOpenModalDetallexCelda(false)
  }
  return (
    <>
    <Dialog visible={show} onHide={onHide}>
                <Table striped style={{fontSize: '39px'}}>
                  <thead className={`${background}`}>
                    <tr>
                      <th className="text-white p-1"><div> <span className='mx-4'>COMPARATIVO</span></div></th>
                      <th className="text-white text-center p-1"><div  style={{fontSize: '50px'}}>S/.</div></th>
                      <th className="text-white text-center p-1"><div  style={{fontSize: '50px'}}>$</div></th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                        dataProp.map(p=>{
                            return (
                                
                    <tr className={``}>
                            <td className={`text-center fw-bolder fs-1`}>
                              <div className={`bg-porsiaca text-left ${textEmpresa}`} onClick={()=>onClickModalDetalle(p.items)}>
                                {p.concepto}
                              </div>
                            </td>
                            <td className={`text-center ${0===0?'fw-light':'fw-bold'} fs-1`}>
                              <div className={`bg-porsiaca text-right  ${0!==0&&'text-ISESAC'}`}>
                                <NumberFormatMoney amount={p.montopen}/>
                              </div>
                            </td>
                            <td className={`text-center ${0===0?'fw-light':'fw-bold'} fs-1`}>
                              <div className={`bg-porsiaca text-right  ${0!==0&&'text-ISESAC'}`}>
                                <NumberFormatMoney amount={p.montousd}/>
                              </div>
                            </td>
                          </tr>
                            )
                        })
                    }
                  </tbody>
                </Table>
    </Dialog>
    <ModalDetallexCelda onHide={onCloseModalDetalle} show={isOpenModalDetallexCelda} data={{items: data, grupo: '', concepto: ''}}/>
    </>
  )
}

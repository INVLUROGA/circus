import { NumberFormatMoney } from '@/components/CurrencyMask';
import { Dialog } from 'primereact/dialog'
import React from 'react'
import { Table } from 'react-bootstrap'
    function agruparPorCategoria(datam) {
        return datam?.reduce((acc, { proser, ...item }) => {
          let empleadoGroup = acc.find(group => group.proser === proser);
          
          if (!empleadoGroup) {
            empleadoGroup = { propiedad: proser, proser, items: [] };
            acc.push(empleadoGroup);
          }
        
          empleadoGroup.items.push(item);
          return acc;
        }, []);
    }
export const ModalProSer = ({show, onHide, items}) => {
  return (
    <Dialog visible={show} header={`${items.categoria}`} onHide={onHide}>
        <Table>
            <thead className='bg-primary'>
                <tr>
                    <th className="text-white p-1 fs-1"><div> <span className='mx-4'>SERVICIO</span></div></th>
                    <th className="text-white text-center p-1 fs-1"><div>CANTIDAD</div></th>
                    <th className="text-white text-center p-1 fs-1"><div>S/.</div></th>
                </tr>
            </thead>
            <tbody>
                {
                    agruparPorCategoria(items?.items)?.map(item=>{
                        return (
                            <tr>
                                <td className={`text-center fw-bolder fs-2`}>
                                    <div className={`bg-porsiaca text-left text-primary`}>
                                        {item.propiedad}
                                    </div>
                                </td>
                                <td className={`text-center fw-bolder fs-1`}>
                                    <div className={`bg-porsiaca text-end `}>
                                        {item.items.reduce((total, i)=>total + i.cantidad,0)}
                                    </div>
                                </td>
                                <td className={`text-center fw-bolder fs-1`}>
                                    <div className={`bg-porsiaca text-end `}>
                                        <NumberFormatMoney amount={item.items.reduce((total, i)=>total + i.pago_monto,0)}/>
                                        {/* {item.items.reduce((total, i)=>total + i.pago_monto,0)} */}
                                    </div>
                                </td>
                            </tr>
                        )
                    })
                }
            </tbody>
        </Table>
        <pre>
            {/* {JSON.stringify(agruparPorCategoria(items.items), null, 2)} */}

        </pre>
    </Dialog>
  )
}

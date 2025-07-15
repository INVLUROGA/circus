import React, { useEffect, useMemo, useState } from 'react'
import { useReportePuntoEquilibrioStore } from './useReportePuntoEquilibrioStore'
import { Col, Row, Table } from 'react-bootstrap'
import { NumberFormatMoney, NumberFormatter } from '@/components/CurrencyMask'
import { ModalConceptos } from './ModalConceptos'
import dayjs from 'dayjs'
import { FechaRangeMES } from '@/components/RangeCalendars/FechaRange'
import { useSelector } from 'react-redux'
import { useVentasStore } from '@/hooks/hookApi/useVentasStore'
function agruparPorCategoria(data) {
  const map = new Map();

  data?.forEach(item => {
    const id_param = item.serv.circus_servicio.tb_parametro.label_param;

    if (!map.has(id_param)) {
      map.set(id_param, []);
    }

    map.get(id_param).push(item);
  });

  return Array.from(map, ([id_categoria, items]) => ({ id_categoria, items }));
}
function agruparPorProducto(data) {
  const map = new Map();

  data?.forEach(item => {
    const id_param = item.producto.producto.nombre_producto || '';

    if (!map.has(id_param)) {
      map.set(id_param, []);
    }

    map.get(id_param).push(item);
  });

  return Array.from(map, ([id_categoria, items]) => ({ id_categoria, items }));
}
export const EmpresaPuntoEquilibrio = ({id_empresa,  background, textEmpresa, bgHEX, needVentas}) => {
  const { obtenerGastosxFecha, dataGastos, dataPrestamos, dataPorPagar } = useReportePuntoEquilibrioStore()
  const { obtenerVentasPorFecha, dataVentaxFecha } = useVentasStore()
      const { RANGE_DATE, dataView } = useSelector(e=>e.DATA)
  useEffect(() => {
    obtenerGastosxFecha(RANGE_DATE, id_empresa)
    if(needVentas){
      obtenerVentasPorFecha(RANGE_DATE, 599)
    }
  }, [id_empresa, RANGE_DATE, needVentas])
  const planillas = dataGastos.find(gr=>gr.grupo==="RECURSOS HUMANOS")?.conceptos.find(con=>con.concepto==='PLANILLA')?.items
    // 1) Calcula totales con useMemo
  const totalMontopen = useMemo(
    () => dataGastos.reduce((sum, g) => sum + (g.montopen+(g.montousd*3.70) || 0), 0),
    [dataGastos]
  );
  const totalMontousd = useMemo(
    () => dataGastos.reduce((sum, g) => sum + (g.montousd || 0), 0),
    [dataGastos]
  );
  const [dataProp, setdataProp] = useState({isView: false, data: []})
  const onOpenModalConceptos=(data)=>{
    setdataProp({isView: true, data: data.conceptos})
  }
  const onCloseModalConceptos=()=>{
    setdataProp({isView: false, data: []})
  }
  // console.log({dataVentaxFecha});
                      const sumaServicios = dataVentaxFecha.servicios?.reduce((total, item) => total + (item.tarifa_monto || 0), 0);
                      const sumaItemsServicios = dataVentaxFecha.servicios?.length
                      const sumaProductos = dataVentaxFecha.productos?.reduce((total, item) => total + (item.tarifa_monto || 0), 0);
                      const sumaItemsProductos = dataVentaxFecha.productos?.length
                      const ventasServicios = agruparPorCategoria(dataVentaxFecha.servicios).map((v) => ({
                        ...v,
                        sumaItem: v.items?.reduce((total, item) => total + (item.tarifa_monto || 0), 0)
                      }))
                      const ventasProductos = agruparPorProducto(dataVentaxFecha.productos).map((v) => ({
                        ...v,
                        sumaItem: v.items?.reduce((total, item) => total + (item.tarifa_monto || 0), 0)
                      }))
  console.log({dataGastos, dataPorPagar});
  
const totalPorPagar = dataPorPagar.reduce(
  (acc, g) => acc + (g.montopen + g.montousd * 3.7),
  0
);
  // console.log({dataServXCAT: agruparPorCategoria(dataVentaxFecha.servicios), datcat: dataVentaxFecha.servicios});
  return (
		<div className="w-100">
              <FechaRangeMES rangoFechas={RANGE_DATE} textColor={`${bgHEX}`}/>
              {/* <div className='text-center' style={{fontSize: '55px'}}>
                <p>FEBRERO 2025</p>
              </div> */}
              <br/>
			<Row>
				<Col lg={6}>
					<Row>
						<Col lg={12}>
							<Table striped  style={{fontSize: '35px'}} >
								<thead className={`${background}`}>
									<tr>
										<th className="text-white p-1" colSpan={2}>
											<div>
												<span className="mx-4">EGRESOS</span>
											</div>
										</th>
										<th className="text-white text-center p-1">
											<div>S/.</div>
										</th>
										<th className="text-white text-center p-1">
											<div>CUENTAS PAGAR</div>
										</th>
									</tr>
								</thead>
								<tbody>
									{dataGastos.map((g, index) => {
                    	const porPagar = dataPorPagar[index]; // Suponiendo orden igual
                      console.log({porPagar, g});
                      
										return (
											<tr className={``}>
												<td
													className={`text-center fw-bolder `}
													colSpan={2}
												>
													<div
														className={`bg-porsiaca text-left ${textEmpresa}`}
													>
														<span className="mr-4">{index + 1}</span>
														{g.grupo}
													</div>
												</td>
												<td
													className={`text-center ${g.montopen === 0 ? 'fw-light' : 'fw-bold'}`}
												>
													<div className="bg-porsiaca text-right mr-4" 
														onClick={() => onOpenModalConceptos(g)}
                          
                          >
														<NumberFormatMoney amount={(g.montopen+(g.montousd*3.70))} />
													</div>
												</td>
												<td
													className={`text-center ${g.montopen === 0 ? 'fw-light' : 'fw-bold'}`}
												>
													<div 
														onClick={() => onOpenModalConceptos(porPagar)}
                            className={`bg-porsiaca text-right mr-4 ${(porPagar?.montopen + porPagar?.montousd * 3.7 || 0)<=0?'':'text-change'}`}>
														<NumberFormatMoney amount={porPagar?.montopen + porPagar?.montousd * 3.7 || 0} />
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
								<tfoot className={`${background}`} style={{fontSize: '40px'}}>
									<tr>
										<td
											colSpan={2}
											className="fw-bold text-start text-white"
										>
											Total
										</td>
										<td
											className="fw-bold text-right"
											// style={{ fontSize: '40px' }}
										>
                      <span className='text-change mr-4'>
											  <NumberFormatMoney amount={-totalMontopen-(-totalPorPagar)} />
                      </span>
										</td>
										<td
											className="fw-bold text-right"
											// style={{ fontSize: '40px' }}
										>
                      <span className='text-change mr-4'>
											  <NumberFormatMoney amount={-totalPorPagar} />
                      </span>
										</td>
									</tr>
								</tfoot>
							</Table>
						</Col>
            {
              needVentas && (
                <Col lg={12}>
                  <TableRH
                    background={background}
                    RANGE_DATE={RANGE_DATE}
                    data={dataPrestamos}
                    textEmpresa={textEmpresa}
                  />
                </Col>
              )
            }
					</Row>
				</Col>
        {
          needVentas && (
            <Col className='ml-8'>
              <Row>
                <Col lg={12} className="mb-5">
                  <TableVentas 
                    RANGE_DATE={RANGE_DATE}
                    sumaTotal={sumaServicios}
                    sumaItems={sumaItemsServicios}
                    ventasPartidas={ventasServicios}
                    dataVentaxFecha={dataVentaxFecha}
                  background={background} textEmpresa={textEmpresa} 
                  nombre_tabla={'VENTAS'}
                  />
                  <TableVentas 
                    RANGE_DATE={RANGE_DATE}
                    sumaTotal={sumaProductos}
                    sumaItems={sumaItemsProductos}
                    ventasPartidas={ventasProductos}
                    dataVentaxFecha={dataVentaxFecha}
                  nombre_tabla={'PRODUCTOS'}
                  background={background} textEmpresa={textEmpresa} 
                  />
                </Col>
                <Col lg={12}>
                  <TableDetalle
                    dataVentaxFecha={dataVentaxFecha}
                    background={background}
                    RANGE_DATE={RANGE_DATE}
                    totalIngresos={0}
                    totalEgresosPEN={totalMontopen}
                    totalEgresosUSD={totalMontousd}
                    textEmpresa={textEmpresa}
                  />
                </Col>
              </Row>
            </Col>
          )
        }
			</Row>
			<ModalConceptos
				background={background}
				textEmpresa={textEmpresa}
				onHide={onCloseModalConceptos}
				show={dataProp.isView}
				dataProp={dataProp.data}
			/>
		</div>
  );
}

const TableRH=({data, background, textEmpresa, RANGE_DATE})=>{
  return (
    <div>
        <Table striped style={{fontSize: '35px'}}>
          <thead className={`bg-azulfuerte`}>
            <tr>
              <th className="text-black"></th>
              <th className="text-white text-center p-1"><div style={{fontSize: '50px'}}><span className='mx-4'>PRESTAMOS</span> </div></th>
              <th className="text-white text-center p-1"><div  style={{fontSize: '50px'}}>S/.</div></th>
            </tr>
          </thead>
          <tbody>
            {
              data.map((g, index)=>{
                return (
                  <tr className={``}>
                    <td className="fw-bold">
                      <div className={`bg-porsiaca text-left text-azulfuerte`}>
                        {index+1}
                      </div>
                    
                      </td>
                    <td className={`text-center fw-bolder`}>
                      <div className={`bg-porsiaca text-left text-azulfuerte`}>
                        {/* {g.grupo} */}
                        PRESTAMOS RAL
                      </div>
                    </td>
                    <td className={`text-center ${g.montopen===0?'fw-light':'fw-bold'}`}>
                      <div className='bg-porsiaca text-right'>
                        <NumberFormatMoney amount={g.montopen}/>
                      </div>
                    </td>
                  </tr>
                )
              })
            }
          </tbody>
        </Table>
    </div>
  )
}


const TableVentas=({background, textEmpresa, ventasPartidas, sumaTotal, nombre_tabla, sumaItems})=>{
                      // const sumaTotal = dataVentaxFecha.servicios?.reduce((total, item) => total + (item.tarifa_monto || 0), 0);
  return (
    <div>
        <Table striped  style={{fontSize: '35px'}}>
          <thead className={`${background}`}>
            
            <tr>
              <th className="text-white p-1" colSpan={2}><div> <span >{nombre_tabla}</span></div></th>
              <th className="text-white text-center p-1"><div style={{width: '250px'}}>CANT.</div></th>
              <th className="text-white text-center p-1"><div>S/.</div></th>
            </tr>
          </thead>
          <tbody>
                  {
                    ventasPartidas.sort((a, b) => b.sumaItem - a.sumaItem).map((v, index, array)=>{
                      return (
                  <tr key={index}>
                    <td className={` fw-bolder`} colSpan={2}>
                      <div className={`bg-porsiaca text-left ${textEmpresa}`}>
                        <span className="mr-4">{index + 1}</span>
                        {v.id_categoria}
                      </div>
                    </td>
                    <td className={`text-center ${0 === 0 ? 'fw-light' : 'fw-bold'}`}>
                      <div className={`bg-porsiaca  ${0 !== 0 && 'text-ISESAC'}`}>
                        <NumberFormatter amount={v.items.length} />
                        
                      </div>
                    </td>
                    <td className={`text-center ${0 === 0 ? 'fw-light' : 'fw-bold'}`}>
                      <div className={`bg-porsiaca text-right ${0 !== 0 && 'text-ISESAC'}`}>
                        <NumberFormatMoney amount={v.sumaItem} />
                      </div>
                    </td>
                  </tr>
                      )
                    })
                  }
          </tbody>
          <tfoot className={`${background}`} style={{fontSize: '40px'}}>
            <tr>
              <td colSpan={2} className="fw-bold text-start text-black">
                Total
              </td>
              <td className="fw-bold text-center text-black">
                <div>
                  <NumberFormatter amount={sumaItems} />
                </div>
              </td>
              <td className="fw-bold text-right  text-black">
                <NumberFormatMoney amount={sumaTotal} />
              </td>
            </tr>
          </tfoot>
        </Table>
    </div>
  )
}


const TableDetalle=({data, background, textEmpresa, totalEgresosUSD, totalEgresosPEN, RANGE_DATE, totalIngresos, dataVentaxFecha})=>{
                        const sumaProductos = dataVentaxFecha?.productos?.reduce((total, item) => total + (item.tarifa_monto || 0), 0);
                      const sumaServicios = dataVentaxFecha?.servicios?.reduce((total, item) => total + (item.tarifa_monto || 0), 0);
                      const totalVentas=sumaProductos+sumaServicios
  return (
    <div>
        <Table striped style={{fontSize: '35px'}}>
          <thead className={`${background}`}>
            <tr>
              <th className="text-white p-1" colSpan={1}><div><span className='mx-3'>UTILIDAD</span></div></th>
              <th className="text-white text-right p-1"><div style={{width: '550px'}}>S/.</div></th>
              {/* <th className="text-white text-center p-1"><div  style={{fontSize: '37px'}}>$</div></th> */}
            </tr>
          </thead>
          <tbody>
            <tr className={``}>
                    <td className={`text-center fw-bolder`}>
                      <div className={`bg-porsiaca text-left ${textEmpresa} mr-4`}>
                        INGRESOS
                      </div>
                    </td>
                    <td className={`text-center ${0===0?'fw-light':'fw-bold'}`}>
                      <div className={`bg-porsiaca text-right  ${0!==0&&'text-ISESAC'}`}>
                        <NumberFormatMoney amount={totalVentas}/>
                      </div>
                    </td>
                  </tr>
            <tr className={``}>
                    <td className={`text-center fw-bolder `}>
                      <div className={`bg-porsiaca text-left text-change ${textEmpresa}`}>
                        EGRESOS
                      </div>
                    </td>
                    <td className={`text-center ${0===0?'fw-light':'fw-bold'}`}>
                      <div className={`bg-porsiaca text-right text-change  ${0!==0&&'text-ISESAC'} `}>
                        <NumberFormatMoney amount={-totalEgresosPEN}/>
                      </div>
                    </td>
                  </tr>
          </tbody>
          <tfoot className={`${background}`} style={{fontSize: '40px'}}>
            <tr>
              <td colSpan={1} className="fw-bold text-start text-black">
                UTILIDAD
              </td>
              <td className="fw-bold text-right text-black">
                <div className='' >
                  <NumberFormatMoney amount={totalVentas-totalEgresosPEN} />
                </div>
              </td>
            </tr>
          </tfoot>
        </Table>
    </div>
  )
}
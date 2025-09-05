import { PageBreadcrumb } from '@/components'
import React, { useEffect, useState } from 'react'
import { Card, Col, Row, Table } from 'react-bootstrap'
import { useReporteResumenComparativoStore } from './useReporteResumenComparativoStore'
import config from '@/config'
import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles'
import { FUNMoneyFormatter, NumberFormatMoney, NumberFormatter } from '@/components/CurrencyMask'
import { FechaRange } from '@/components/RangeCalendars/FechaRange'
import { useSelector } from 'react-redux'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc';
import { ModalSocios } from './ModalSocios'
import { VentasPorComprobante } from './VentasPorComprobante'
import { arrayDistritoTest, arrayEstadoCivil, arrayOrigenDeCliente, arrayOrigenEnCeroDeCliente, arraySexo } from '@/types/type'
import { VentasxMesGrafico } from './VentasxMesGrafico'
import { VentasMesGrafico } from './HistoricoVentasMembresias/VentasMesGrafico'
import { CardGraficoTotalDeEstadoCliente } from './HistoricoVentasMembresias/CardGraficoTotalDeEstadoCliente'
import SimpleBar from 'simplebar-react'
import { ModalTableSocios } from './ModalTableSocios'
import { ItemTableTotal } from './ItemTableTotal'
import { TableTotal } from './TableTotal'
import { Loading } from '@/components/Loading'
import { useInView } from 'react-intersection-observer'
import { useDispatch } from 'react-redux'
import { onSetViewSubTitle } from '@/store'
import { ItemTablePgm } from './ItemTablePgm'
import { ItemCardPgm } from './ItemCardPgm'
import { FormatTable } from './Component/FormatTable'
import { onSetDataView } from '@/store/data/dataSlice'
import { FormatDataTable } from './Component/FormatDataTable'
import { ModalTableSociosCanje } from './ModalTableSociosCanje'
import { TableTotalS } from './TableTotalS'
import { Button } from 'primereact/button'
import { SpeedDial } from 'primereact/speeddial'
import { GrafPie } from './GrafPie'
import { ModalProSer } from './ModalProSer'

dayjs.extend(utc);

export const ResumenComparativo = () => {
    const { obtenerComparativoResumen, loading, dataGroup, dataGroupCanjes, obtenerComparativoCanjes } = useReporteResumenComparativoStore()

    const dispatch = useDispatch()
    const { RANGE_DATE, dataView } = useSelector(e=>e.DATA)
    const [isOpenModalSocio, setisOpenModalSocio] = useState(false)
    const [avatarProgramaSelect, setavatarProgramaSelect] = useState({})
    const [clickDataSocios, setclickDataSocios] = useState([])
    const [clickDataLabel, setclickDataLabel] = useState('')
    const [isDataNeedGruped, setisDataNeedGruped] = useState(false)
    // COuseSelector(e=>e.DATA)
    useEffect(() => {
        if(RANGE_DATE[0]===null) return;
        if(RANGE_DATE[1]===null) return;
        obtenerComparativoResumen(RANGE_DATE)
        obtenerComparativoCanjes(RANGE_DATE)
        // obtenerEstadosOrigenResumen(RANGE_DATE)
    }, [RANGE_DATE])
    
const generarResumen = (array, grupo, labelCaracter, index, objDeleting, objDeletingxID, objAumenta=[], table_color) => {
    const arrayGeneral = array.map(f=>f.items).flat()
    const sumaTotal = array.reduce((total, item) => total + (item?.items.reduce((total, item)=>total + (item?.cantidad||0),0) || 0), 0);
    const cantidadxProps = grupo.items.reduce((total, item)=>total + (item?.cantidad||0),0)
    const porcentajexProps = ((cantidadxProps/sumaTotal)*100).toFixed(2);
    const montoxProps = grupo.items.reduce((total, item)=>total + (item?.pago_monto||0),0)
    const sumaMontoTotal =  arrayGeneral.reduce((acc, item)=>acc+item?.pago_monto, 0)
    const porcentajexMontoProps = ((montoxProps/sumaMontoTotal)*100).toFixed(2)
    const ticketMedio = (montoxProps/cantidadxProps)||0
    const sumaTicketMedio = sumaTotal ? (sumaMontoTotal / sumaTotal) : 0;
    // const sumaTicketMedioProp = estadisticas.reduce((acc, item)=>acc+item.monto_total,0)/arrayEstadistico?.reduce((acc, curr) => acc + curr.items?.length, 0)
    // const porcentajexMontoProps = (array).toFixed(2) d.sumaDeVentasEnSoles/d.sumaDeSesiones
    //d.sumaDeVentasEnSoles/d.sumaDeSesiones
    
    const isSortable = true;
    let resumen = [
        { id: 0, header: labelCaracter, headerHTML: <div className='fs-1'>{labelCaracter}</div>,  isIndexado: true, items: grupo.items, value: grupo.propiedad, HTML: <div>{grupo.propiedad}</div>, isPropiedad: true, tFood: 'TOTAL', order: 1 },
        { id: 1, header: 'S/.venta total', headerHTML: <>S/.<br/>VENTA TOTAL</>, isSortable, HTML: <div><div className='fw-light'>S/. VENTA TOTAL</div><br/><NumberFormatMoney amount={montoxProps}/></div>, value: montoxProps, tFood: <NumberFormatMoney amount={sumaMontoTotal}/>, order: 10 },
        { id: 2, header: 'CANT.SERV.', headerHTML: <>   <br/>cant.<br/>serv.</>, isSortable, HTML: <div><div className='fw-light'>cant. serv.</div><br/>{cantidadxProps}</div>, value: cantidadxProps, tFood: sumaTotal, order: 30 },
        { id: 3, header: '%VENTA TOTAL', headerHTML: <>%  <br/> VENTA TOTAL</>, isSortable, value: porcentajexMontoProps, HTML: <><div className='fw-light'>% VENTA TOTAL</div><br/>{porcentajexMontoProps}</>, tFood: '100.00 %', order: 40 },
        { id: 4, header: '%CANT.SERV.', headerHTML: <>%  <br/>cant.<br/>serv.</>, isSortable, value: porcentajexProps, HTML: <><div className='fw-light'>% cant. serv.</div><br/>{porcentajexProps} %</>, tFood: '100.00 %', order: 50 },
        { id: 5, header: 'S/ TICKET MEDIO', headerHTML: <>S/.<br/>TICKET MEDIO</>, isSortable, value: ticketMedio, HTML: <><div className='fw-light'>S/. TICKET MEDIO</div><br/><NumberFormatMoney amount={ticketMedio}/></>, tFood: <NumberFormatMoney amount={sumaTicketMedio}/>, order: 60 },
    ]
        // 1️⃣ Filtrar los elementos de resumen que estén en objDeleting
        if (Array.isArray(objDeletingxID)) {
            const headersAEliminar = objDeletingxID.map(obj => obj.id);
            resumen = resumen.filter(item => !headersAEliminar.includes(item.id));
        }
        // 1️⃣ Filtrar los elementos de resumen que estén en objDeleting
        if (Array.isArray(objDeleting)) {
            const headersAEliminar = objDeleting.map(obj => obj.header);
            resumen = resumen.filter(item => !headersAEliminar.includes(item.header));
        }

        // 2️⃣ Crear un mapa de objAumenta para sobrescribir elementos de resumen
        const objAumentaMap = new Map(objAumenta.map(item => [item.header, item]));

        // 3️⃣ Fusionar los datos, dando prioridad a objAumenta
        resumen = resumen.filter(item => !objAumentaMap.has(item.header)); // Eliminar duplicados
        resumen = [...resumen, ...objAumentaMap.values()]; // Agregar objAumenta

        // 4️⃣ Ordenar por la propiedad order
        return resumen.sort((a, b) => a.order - b.order);
};
    const onOpenModalSOCIOS = (d, avatarPrograma=[], label, isdatagruped)=>{
        // console.log(d, "d???????????");
        if(isdatagruped){
            setclickDataSocios(d)
            setisDataNeedGruped(isdatagruped)
            setisOpenModalSocio(true)
        }else{
            setisOpenModalSocio(true)
            setavatarProgramaSelect(avatarPrograma)
            dispatch(onSetDataView(d))
            setclickDataSocios(d)
            setclickDataLabel(label)

        }
    }
    
    const onCloseModalSOCIOSCANJE = (d, avatarPrograma=[], label, isdatagruped)=>{
        // console.log(d, "d???????????");
        if(isdatagruped){
            setclickDataSocios(d)
            setisDataNeedGruped(isdatagruped)
            setisOpenModalSocio(true)
        }else{
            setisOpenModalSocio(true)
            setavatarProgramaSelect(avatarPrograma)
            dispatch(onSetDataView(d))
            setclickDataSocios(d)
            setclickDataLabel(label)

        }
    }
    console.log(dataGroupCanjes, "dcan");
    
    function agruparPorEmpleados(datam) {
        return datam?.reduce((acc, { empleado, ...item }) => {
          let empleadoGroup = acc.find(group => group.empleado === empleado);
          
          if (!empleadoGroup) {
            empleadoGroup = { empleado, propiedad: empleado, items: [] };
            acc.push(empleadoGroup);
          }
        
          empleadoGroup.items.push(item);
          return acc;
        }, []);
    }
    function agruparPorCategoria(datam) {
        return datam?.reduce((acc, { categoria, ...item }) => {
          let empleadoGroup = acc.find(group => group.categoria === categoria);
          
          if (!empleadoGroup) {
            empleadoGroup = { categoria, propiedad: categoria, items: [] };
            acc.push(empleadoGroup);
          }
        
          empleadoGroup.items.push(item);
          return acc;
        }, []);
    }
    function agruparPorClase(datam) {
        return datam?.reduce((acc, { clase, ...item }) => {
          let empleadoGroup = acc.find(group => group.clase === clase);
          
          if (!empleadoGroup) {
            empleadoGroup = { clase, propiedad: clase, items: [] };
            acc.push(empleadoGroup);
          }
        
          empleadoGroup.items.push(item);
          return acc;
        }, []);
    }
    function agruparPorServicios(datam) {
        return datam?.reduce((acc, { servicios, ...item }) => {
          let empleadoGroup = acc.find(group => group.servicios === servicios);
          
          if (!empleadoGroup) {
            empleadoGroup = { servicios, propiedad: servicios, items: [] };
            acc.push(empleadoGroup);
          }
        
          empleadoGroup.items.push(item);
          return acc;
        }, []);
    }
    function agruparPorProfesion(datam) {
        
        return datam?.reduce((acc, { profesion, ...item }) => {
            let empleadoGroup = acc.find(group => group.profesion === profesion);
          if (!empleadoGroup) {
            empleadoGroup = { profesion, propiedad: profesion, items: [] };
            acc.push(empleadoGroup);
          }
        
          empleadoGroup.items.push(item);
          return acc;
        }, []);
    }
    function FagruparxServicios(datam, label_param) {
        
        const agrupadoPorServiciosProf = agruparPorServicios(datam)?.map((grupo, index, array) => {
            console.log(grupo, "ggg");
            
            const arrayGeneral = array.map(f=>f.items).flat()
            const sumaTotal = array.reduce((total, item) => total + (item?.items.reduce((total, item)=>total + (item?.cantidad||0),0) || 0), 0);
            const cantidadxProps = grupo.items.reduce((total, item)=>total + (item?.cantidad||0),0)
            const porcentajexProps = ((cantidadxProps/sumaTotal)*100).toFixed(2);
            const montoxProps = grupo.items.reduce((total, item)=>total + (item?.pago_monto||0),0)
            const sumaMontoTotal =  arrayGeneral.reduce((acc, item)=>acc+item?.pago_monto, 0)
            const porcentajexMontoProps = ((montoxProps/sumaMontoTotal)*100).toFixed(2)
            const ticketMedio = (montoxProps/cantidadxProps)||0
            const sumaTicketMedio = sumaTotal ? (sumaMontoTotal / sumaTotal) : 0;
            const isSortable = true;
            return [
                ...generarResumen(array, grupo, `${label_param}`, index, 
                    [{header: 'S/.venta total', headerHTML: <>S/.<br/>VENTA TOTAL</>}, {header: '%VENTA TOTAL', headerHTML: <>% <br/> VENTA TOTAL</>}], 
                    [{id: 1}, {id: 3}],
                    [
                        {header: 'S/.canje total',headerHTML:<>S/. <br/>CANJE TOTAL</>, isSortable: true, HTML: <div><div className='fw-light'>S/. CANJE TOTAL</div><br/><span className='mt-4'><NumberFormatMoney amount={montoxProps}/></span></div>, value: montoxProps, tFood: <NumberFormatMoney amount={sumaMontoTotal}/>, order: 10 }, 
                        {header: '% CANJE TOTAL', headerHTML: <>% <br/> CANJE TOTAL</>, HTML: <><div className='fw-light'>% CANJE TOTAL</div><br/>{porcentajexMontoProps} %</>, isSortable: true, value: porcentajexMontoProps, tFood: <>100.00 %</>, order: 40},
                        {header: 'CANT. CLIENTES', headerHTML: <>% <br/> CANT. CLIENTES</>, HTML: <><div className='fw-light'>CANT. CLIENTES</div><br/>{porcentajexMontoProps}</>, isSortable: true, value: porcentajexMontoProps, tFood: <>100.00 %</>, order: 40},
                    ])
                ]
        }
        )
        return agrupadoPorServiciosProf;
    }
    const onCloseModalSOCIOS = ()=>{
        setisOpenModalSocio(false)
    }
    const agrupadoPorCategoria = agruparPorCategoria(agruparPorClase(dataGroup)[0]?.items)?.map((grupo, index, array) => {
            return [
                ...generarResumen(array, grupo, 'SERVICIOS', index)
                ]
        }
        )
        const agrupadoPorEstilista = agruparPorEmpleados(dataGroup)?.map((grupo, index, array) => {
            
            const agrupadoxClase = agruparPorClase(grupo.items)
            const sumarVentaServicios = agrupadoxClase.find(f => f?.clase === 'Servicio')
            ?.items.reduce((total, item) => {
                return total + (Number(item?.pago_monto) || 0); // Convierte a número y suma
              }, 0); // Inicia la suma desde 0 en lugar de undefined
            const sumarVentaProductos = agrupadoxClase.find(f => f?.clase === 'Producto')
            ?.items.reduce((total, item) => {
                return total + (Number(item?.pago_monto) || 0); // Convierte a número y suma
              }, 0); // Inicia la suma desde 0 en lugar de undefined
              const sumarCantidadProductos = agrupadoxClase.find(f => f?.clase === 'Producto')
              ?.items.reduce((total, item) => {
                  return total + (Number(item?.cantidad) || 0); // Convierte a número y suma
                }, 0); // Inicia la suma desde 0 en lugar de undefined
                const sumarCantidadServicios = agrupadoxClase.find(f => f?.clase === 'Servicio')
                ?.items.reduce((total, item) => {
                    return total + (Number(item?.cantidad) || 0); // Convierte a número y suma
                  }, 0); // Inicia la suma desde 0 en lugar de undefined
              
            return [
                ...generarResumen(array, grupo, 'SERVICIOS', index,[], 
                    // [
                    //     {header: <div style={{color: ''}}> S/. VENTA DE SERVICIOS </div>, isSortable: true, value: sumarVentaServicios, HTML: <span style={{color: ''}}> <NumberFormatMoney amount={sumarVentaServicios}/></span>, order: 2}, 
                    //     {header: <div style={{color: '#008ffb'}}> S/. VENTA DE PRODUCTOS </div>, isSortable: true, value: sumarVentaProductos, HTML: <span style={{color: '#008ffb'}}> <NumberFormatMoney amount={sumarVentaProductos}/></span>, order: 3}]
                    )
                ]
        }
        )
        const agrupadoPorEstilistaXServicios = agruparPorEmpleados(agruparPorClase(dataGroup)[0]?.items)?.map((grupo, index, array) => {
            
            const agrupadoxClase = agruparPorClase(grupo.items)
            const sumarVentaServicios = agrupadoxClase.find(f => f?.clase === 'Servicio')
            ?.items.reduce((total, item) => {
                return total + (Number(item?.pago_monto) || 0); // Convierte a número y suma
              }, 0); // Inicia la suma desde 0 en lugar de undefined
            const sumarVentaProductos = agrupadoxClase.find(f => f?.clase === 'Producto')
            ?.items.reduce((total, item) => {
                return total + (Number(item?.pago_monto) || 0); // Convierte a número y suma
              }, 0); // Inicia la suma desde 0 en lugar de undefined
              const sumarCantidadProductos = agrupadoxClase.find(f => f?.clase === 'Producto')
              ?.items.reduce((total, item) => {
                  return total + (Number(item?.cantidad) || 0); // Convierte a número y suma
                }, 0); // Inicia la suma desde 0 en lugar de undefined
                const sumarCantidadServicios = agrupadoxClase.find(f => f?.clase === 'Servicio')
                ?.items.reduce((total, item) => {
                    return total + (Number(item?.cantidad) || 0); // Convierte a número y suma
                  }, 0); // Inicia la suma desde 0 en lugar de undefined
              
            return [
                ...generarResumen(array, grupo, 'ESTILISTAS', index, 
                    // [
                    //     {header: <div style={{color: ''}}> S/. VENTA DE SERVICIOS </div>, isSortable: true, value: sumarVentaServicios, HTML: <span style={{color: ''}}> <NumberFormatMoney amount={sumarVentaServicios}/></span>, order: 2}, 
                    //     {header: <div style={{color: '#008ffb'}}> S/. VENTA DE PRODUCTOS </div>, isSortable: true, value: sumarVentaProductos, HTML: <span style={{color: '#008ffb'}}> <NumberFormatMoney amount={sumarVentaProductos}/></span>, order: 3}]
                    )
                ]
        }
        )
        const agrupadoPorEstilistaXProducto = agruparPorEmpleados(agruparPorClase(dataGroup)[1]?.items)?.map((grupo, index, array) => {
            
            const agrupadoxClase = agruparPorClase(grupo.items)
            
            const cantidadxProps = grupo.items.reduce((total, item)=>total + (item?.cantidad||0),0)
            
            const sumaTotal = array.reduce((total, item) => total + (item?.items.reduce((total, item)=>total + (item?.cantidad||0),0) || 0), 0);
            const porcentajexProps = ((cantidadxProps/sumaTotal)*100).toFixed(2);
            const sumarVentaServicios = agrupadoxClase.find(f => f?.clase === 'Servicio')
            ?.items.reduce((total, item) => {
                return total + (Number(item?.pago_monto) || 0); // Convierte a número y suma
              }, 0); // Inicia la suma desde 0 en lugar de undefined
            const sumarVentaProductos = agrupadoxClase.find(f => f?.clase === 'Producto')
            ?.items.reduce((total, item) => {
                return total + (Number(item?.pago_monto) || 0); // Convierte a número y suma
              }, 0); // Inicia la suma desde 0 en lugar de undefined
              const sumarCantidadProductos = agrupadoxClase.find(f => f?.clase === 'Producto')
              ?.items.reduce((total, item) => {
                  return total + (Number(item?.cantidad) || 0); // Convierte a número y suma
                }, 0); // Inicia la suma desde 0 en lugar de undefined
                const sumarCantidadServicios = agrupadoxClase.find(f => f?.clase === 'Servicio')
                ?.items.reduce((total, item) => {
                    return total + (Number(item?.cantidad) || 0); // Convierte a número y suma
                  }, 0); // Inicia la suma desde 0 en lugar de undefined
              
            return [
                ...generarResumen(array, grupo, 'ESTILISTAS', index, [{header: 'servicios'}, {header: '% servicios'}],[{ header: <><br/>productos</>, isSortable: true, value: cantidadxProps, tFood: sumaTotal, order: 30 }, {header: '% PRODUCTOS', headerHTML: <>% <br/> PRODUCTOS</>, isSortable: true, value: porcentajexProps, tFood: 100, order: 50}], 
                    // [
                    //     {header: <div style={{color: ''}}> S/. VENTA DE SERVICIOS </div>, isSortable: true, value: sumarVentaServicios, HTML: <span style={{color: ''}}> <NumberFormatMoney amount={sumarVentaServicios}/></span>, order: 2}, 
                    //     {header: <div style={{color: '#008ffb'}}> S/. VENTA DE PRODUCTOS </div>, isSortable: true, value: sumarVentaProductos, HTML: <span style={{color: '#008ffb'}}> <NumberFormatMoney amount={sumarVentaProductos}/></span>, order: 3}]
                    )
                ]
        }
        )
        // console.log(agruparxServiciosxProfesion(dataGroupCanjes), "aaaaag");
        const [isServiciosDeCat, setisServiciosDeCat] = useState({isOpen: false, items: []})
        const onOpenModalServiciosDeCat = (arr)=>{
            setisServiciosDeCat({isOpen: true, items: arr})
        }
        const onCloseModalServiciosDeCat = ()=>{
            setisServiciosDeCat({isOpen: false, items: []})
        }
    const data = [
        {
            title: 'VENTAS POR SERVICIO',
            id: 'comparativoventasenprograma',
            HTML: agruparPorCategoria(agruparPorClase(dataGroup)[0]?.items)?.map((d, array)=>{
                const sumarVentas = d.items.reduce((total, item) => {
                    return total + (Number(item?.pago_monto) || 0); // Convierte a número y suma
                  }, 0); // Inicia la suma desde 0 en lugar de undefined
                const sumarCantidadServicios = d.items.reduce((total, item) => {
                    return total + (Number(item?.cantidad) || 0); // Convierte a número y suma
                    }, 0); // Inicia la suma desde 0 en lugar de undefined
                return (
                <Col style={{paddingBottom: '1px !important'}} xxl={4}>
                    <Card>
                        <Card.Header className=' align-self-center fs-1 fw-bold' onClick={()=>onOpenModalServiciosDeCat(d)}>
                            {d.categoria||'SIN DATA'}
                        </Card.Header>
                        <Card.Body style={{paddingBottom: '1px !important'}}>
                            <br/>
                            <Table
                                                // style={{tableLayout: 'fixed'}}
                                                className="table-centered mb-0"
                                                // hover
                                                striped
                                                responsive
                                            >
                                                <tbody>
                                                            <tr>
                                                                <td onClick={()=>onOpenModalSOCIOS(d.items, [], d.categoria, true)}>
                                                                    <li className='d-flex flex-row justify-content-between p-2'><span className='fw-bold text-primary fs-2'>VENTAS</span></li>
                                                                </td>
                                                                <td> <span className='fs-1 fw-bold d-flex justify-content-end align-content-end align-items-end'><SymbolSoles bottomClasss={20} numero={ <NumberFormatMoney amount={sumarVentas}/>}/></span></td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <li className='d-flex flex-row justify-content-between p-2'><span className='fw-bold text-primary fs-2'>CANTIDAD</span></li>
                                                                </td>
                                                                <td> <span className='fs-1 fw-bold d-flex justify-content-end align-content-end align-items-end'>{sumarCantidadServicios}</span></td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <li className='d-flex flex-row justify-content-between p-2'><span className='fw-bold text-primary fs-2'>TICKET MEDIO</span></li>
                                                                </td>                                                                <td> <span className='fs-1 fw-bold d-flex justify-content-end align-content-end align-items-end'><SymbolSoles bottomClasss={20} numero={ <NumberFormatMoney amount={(sumarVentas/sumarCantidadServicios)}/>}/></span></td>
                                                            </tr>
                                                </tbody>
                                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
            )
            }
            )
        },
        {
            title: 'VENTAS POR SERVICIO - TOTAL',
            id: 'comparativoventasenprograma',
            HTML:   <Col style={{paddingBottom: '1px !important'}} xxl={12}>
                        <TableTotal data={agrupadoPorCategoria} titleH1={''} labelTotal={'SESIONES'} onOpenModalSOCIOS={onOpenModalSOCIOS} arrayEstadistico={agrupadoPorCategoria}/>
                    </Col>
        },
        {
            title: 'VENTAS POR ESTILISTA',
            id: 'comparativoventasenprograma',
            HTML: agruparPorEmpleados(dataGroup)?.map((d, array)=>{
                const agrupadoxClase = agruparPorClase(d.items)
                const sumarVentaServicios = agrupadoxClase.find(f => f?.clase === 'Servicio')
                ?.items.reduce((total, item) => {
                    return total + (Number(item?.pago_monto) || 0); // Convierte a número y suma
                  }, 0); // Inicia la suma desde 0 en lugar de undefined
                const sumarVentaProductos = agrupadoxClase.find(f => f?.clase === 'Producto')
                ?.items.reduce((total, item) => {
                    return total + (Number(item?.pago_monto) || 0); // Convierte a número y suma
                  }, 0); // Inicia la suma desde 0 en lugar de undefined
                  const sumarCantidadProductos = agrupadoxClase.find(f => f?.clase === 'Producto')
                  ?.items.reduce((total, item) => {
                      return total + (Number(item?.cantidad) || 0); // Convierte a número y suma
                    }, 0); // Inicia la suma desde 0 en lugar de undefined
                    const sumarCantidadServicios = agrupadoxClase.find(f => f?.clase === 'Servicio')
                    ?.items.reduce((total, item) => {
                        return total + (Number(item?.cantidad) || 0); // Convierte a número y suma
                      }, 0); // Inicia la suma desde 0 en lugar de undefined
                  
                return (
                <Col style={{paddingBottom: '1px !important'}} xxl={4}>
                    <Card>
                        <Card.Header className=' align-self-center fs-1 fw-bold'>
                            {d.empleado}
                        </Card.Header>
                        <Card.Body style={{paddingBottom: '1px !important'}}>
                            <br/>
                            <Table
                                                // style={{tableLayout: 'fixed'}}
                                                className="table-centered mb-0"
                                                // hover
                                                striped
                                                responsive
                                            >
                                                <tbody>
                                                            <tr>
                                                                <td>
                                                                    <li className='d-flex flex-row justify-content-between p-2'><span className='fw-bold text-primary fs-2'>VENTAS <br/> SERVICIO</span></li>
                                                                </td>
                                                                <td> <span className='fs-1 fw-bold d-flex justify-content-end align-content-end align-items-end'><SymbolSoles bottomClasss={20} numero={ <NumberFormatMoney amount={sumarVentaServicios}/>}/></span></td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <li className='d-flex flex-row justify-content-between p-2'><span className='fw-bold text-primary fs-2'>CANTIDAD <br/> SERVICIO</span></li>
                                                                </td>
                                                                <td> <span className='fs-1 fw-bold d-flex justify-content-end align-content-end align-items-end'>{sumarCantidadServicios}</span></td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <li className='d-flex flex-row justify-content-between p-2'><span className='fw-bold text-primary fs-2'>TICKET <br/> MEDIO <br/> SERVICIO</span></li>
                                                                </td>                                                                <td> <span className='fs-1 fw-bold d-flex justify-content-end align-content-end align-items-end'><SymbolSoles bottomClasss={20} numero={ <NumberFormatMoney amount={(sumarVentaServicios)/(sumarCantidadServicios)}/>}/></span></td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <li className='d-flex flex-row justify-content-between p-2'><span className='fw-bold fs-2' style={{color: '#008FFB'}}>VENTAS <br/> PRODUCTOS</span></li>
                                                                </td>
                                                                <td> <span className='fs-1 fw-bold d-flex justify-content-end align-content-end align-items-end'><SymbolSoles bottomClasss={20} numero={ <NumberFormatMoney amount={sumarVentaProductos}/>}/></span></td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <li className='d-flex flex-row justify-content-between p-2'><span className='fw-bold fs-2' style={{color: '#008FFB'}}>CANTIDAD <br/> PRODUCTOS</span></li>
                                                                </td>
                                                                <td> <span className='fs-1 fw-bold d-flex justify-content-end align-content-end align-items-end'>{sumarCantidadProductos}</span></td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <li className='d-flex flex-row justify-content-between p-2'><span className='fw-bold fs-2' style={{color: '#008FFB'}}>TICKET <br/> MEDIO <br/> PRODUCTOS</span></li>
                                                                </td>
                                                                <td> <span className='fs-1 fw-bold d-flex justify-content-end align-content-end align-items-end'><SymbolSoles bottomClasss={20} numero={ <NumberFormatMoney amount={sumarVentaProductos/sumarCantidadProductos}/>}/></span></td>
                                                            </tr>
                                                </tbody>
                                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
            )
            }
            )
        },
        {
            title: 'VENTAS POR ESTILISTA - TOTAL',
            id: 'comparativoventasenprograma',
            HTML:   <Col style={{paddingBottom: '1px !important'}} xxl={12}>
                        <TableTotal data={agrupadoPorEstilista} titleH1={''} labelTotal={'SESIONES'} onOpenModalSOCIOS={onOpenModalSOCIOS} arrayEstadistico={agrupadoPorEstilista}/>
                    </Col>
        },
        {
            title: 'VENTAS POR ESTILISTA DE SERVICIOS - TOTAL',
            id: 'comparativoventasenprograma',
            HTML:   <Col style={{paddingBottom: '1px !important'}} xxl={12}>
                        <TableTotal data={agrupadoPorEstilistaXServicios} titleH1={''} labelTotal={'SESIONES'} onOpenModalSOCIOS={onOpenModalSOCIOS} arrayEstadistico={agrupadoPorEstilistaXServicios}/>
                    </Col>
        },
        {
            title: 'VENTAS POR ESTILISTA DE PRODUCTOS - TOTAL',
            id: 'comparativoventasenprograma',
            HTML:   <Col style={{paddingBottom: '1px !important'}} xxl={12}>
                        <TableTotal tableColor={'bg-circusBlue'} propColor={'text-circusBlue'} data={agrupadoPorEstilistaXProducto} titleH1={''} labelTotal={'SESIONES'} onOpenModalSOCIOS={onOpenModalSOCIOS} arrayEstadistico={agrupadoPorEstilistaXProducto}/>
                    </Col>
        },
        {
            title: 'CANJES SERVICIOS POR PROFESION',
            id: 'comparativoventasenprograma',
            HTML: agruparPorProfesion(dataGroupCanjes)?.map((d, array)=>{
                const servicios = FagruparxServicios(d.items, d.propiedad)
                return (
                <Col style={{paddingBottom: '1px !important'}} xxl={12}>
                    <Card>
                        <Card.Header className=' align-self-center fs-1 fw-bold'>
                            {d.propiedad}
                        </Card.Header>
                        <Card.Body style={{paddingBottom: '1px !important'}}>
                            <br/>
                            <Row>
                            <Col style={{paddingBottom: '1px !important'}} xxl={12}>
                                <TableTotal tableColor={'bg-circusBlue'} propColor={'text-circusBlue'} data={servicios} titleH1={''} labelTotal={`${d.propiedad}`} onOpenModalSOCIOS={onOpenModalSOCIOS} arrayEstadistico={servicios}/>
                            </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            )
            }
            )
        },
        // {
        //     title: 'CANJES POR PROFESION POR SERVICIO ',
        //     id: 'comparativoventasenprograma',
        //     HTML: agruparPorServicios(dataGroupCanjes)?.map((d, array)=>{
        //         return (
        //         <Col style={{paddingBottom: '1px !important'}} xxl={4}>
        //             <Card>
        //                 <Card.Header className=' align-self-center fs-1 fw-bold'>
        //                     {d.propiedad}
        //                 </Card.Header>
        //                 <Card.Body style={{paddingBottom: '1px !important'}}>
        //                     <br/>
        //                     <Table
        //                                         className="table-centered mb-0"
        //                                         striped
        //                                         responsive
        //                                         >
        //                                         <tbody>
        //                                                     {
        //                                                         agruparPorProfesion(d.items).map(s=>{
        //                                                             return (
        //                                                                     <tr>
        //                                                                         <td onClick={()=>onOpenModalSOCIOS(d.items, [], {}, true)}>
        //                                                                             <li className='d-flex flex-row justify-content-between p-2'><span className='fw-bold text-primary fs-2'>{s.propiedad}:</span></li>
        //                                                                         </td>
        //                                                                         <td> <span className='fs-1 fw-bold d-flex justify-content-end align-content-end align-items-end'>{s.items.length}</span></td>
        //                                                                     </tr>
        //                                                             )
        //                                                         })
        //                                                     }
        //                                                     <tr>
        //                                                                         <td>
        //                                                                             <li className='d-flex flex-row justify-content-between p-2'><span className='fw-bold text-primary fs-2'>TOTAL:</span></li>
        //                                                                         </td>
        //                                                                         <td> <span className='fs-1 fw-bold d-flex justify-content-end align-content-end align-items-end'>{d.items.length}</span></td>
        //                                                                     </tr> 
        //                                         </tbody>
                                                
        //                                     </Table>
        //                 </Card.Body>
        //             </Card>
        //         </Col>
        //     )
        //     }
        //     )
        // },
    ]
    const [extractTitle, setextractTitle] = useState('')
    const sectionRefs = data.map(() =>
        useInView({
          threshold: 0.01, // Activa cuando el 50% de la sección esté visible
          triggerOnce: false, // Detectar entrada y salida constantemente
        })
      );
      useEffect(() => {
        sectionRefs.forEach(({ inView }, index) => {
          if (inView) {
            setextractTitle(data[index].title)
          }
        });
      }, [sectionRefs]);
      useEffect(() => {
        dispatch(onSetViewSubTitle(extractTitle))
      }, [sectionRefs])
  return (
    <>
    <FechaRange rangoFechas={RANGE_DATE}/>
    {
        loading ?
        (
            <>LOADINg</>
        )
        : 

    <Row>
        {data.map((section, index) => (
            <Col xxl={12} ref={sectionRefs[index].ref}>
            <Row className='d-flex justify-content-center'>
                <br/>
                <br/>
                <br/>
                <br/>
                <br/>
                <br/>
                <br/>
        {/* <h1 className='pt-5' style={{fontSize: '60px'}}>{section.title}</h1> */}
                    {section.HTML}
            </Row>
        </Col>
        ))}
        
    </Row>
    }
    <ModalProSer show={isServiciosDeCat.isOpen} items={isServiciosDeCat.items} onHide={onCloseModalServiciosDeCat}/>
    {/* <SpeedDial model={items} direction="up" className="speeddial-bottom-right right-0 bottom-0" buttonClassName="p-button-danger" /> */}
                                    <ModalTableSocios
                                    clickDataSocios={clickDataSocios}
                                    isDataNeedGruped={isDataNeedGruped}
                                    avatarProgramaSelect={avatarProgramaSelect}
                                    clickDataLabel={clickDataLabel} show={isOpenModalSocio} onHide={onCloseModalSOCIOS}/>
    </>
  )
}

// Ejemplo de uso con los arrays proporcionados
// const ventasUnidas = 

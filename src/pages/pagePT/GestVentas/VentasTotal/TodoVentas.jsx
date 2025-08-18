import { Table } from '@/components'
import { useVentasStore } from '@/hooks/hookApi/useVentasStore'
import React, { useState, useEffect } from 'react';
import { classNames } from 'primereact/utils';
import { FilterMatchMode, FilterOperator, locale } from 'primereact/api';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Tag } from 'primereact/tag';
import { TriStateCheckbox } from 'primereact/tristatecheckbox';
import { ModalViewObservacion } from '../ModalViewObservacion';
import { arrayFacturas, arrayOrigenDeCliente } from '@/types/type';
import { DateMaskString, FormatoDateMask, MoneyFormatter, NumberFormatMoney } from '@/components/CurrencyMask';
import dayjs from 'dayjs';
import { Col, Row } from 'react-bootstrap';
import { PdfComprobanteVenta } from './PdfComprobanteVenta';
import config from '@/config';
import sinAvatar from '@/assets/images/sinPhoto.jpg';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore';


export const TodoVentas=({id_empresa, DataClientes})=> {
  
  locale('es')
  const { obtenerTablaVentas, dataVentas } = useVentasStore()
  const  { obtenerParametroPorEntidadyGrupo:obtenerDataComprobantes, DataGeneral:dataComprobantes } = useTerminoStore()
  const  { obtenerParametroPorEntidadyGrupo:obtenerDataOrigen, DataGeneral:dataOrigenes } = useTerminoStore()
  useEffect(() => {
      obtenerTablaVentas(id_empresa)
      obtenerDataComprobantes('nueva-venta', 'comprobante')
      obtenerDataOrigen('nueva-venta-circus', 'origen')
  }, [])
  const [customers, setCustomers] = useState(null);
  const [valueFilter, setvalueFilter] = useState([])
  const [filters, setFilters] = useState({
    
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
      fecha_venta: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.DATE_IS }] },
      tipo_comprobante: {operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }]},
      "tb_empleado.nombres_apellidos_empl": {operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }]}
  });
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState('');

    useEffect(() => {
        const fetchData = () => {
          setCustomers(getCustomers(dataVentas));
          setLoading(false);
        };
        fetchData()
        // initFilters();
    }, [dataVentas]);
    
    const getCustomers = (data) => {
        return [...(data || [])].map((d) => {
            // d.date = new Date(d.date);
            let newItem = {...d}
            let date = dayjs.utc(d.fecha_venta);
            console.log({newItem});
            
            newItem.fecha_venta_v = new Date(date.format());
            newItem.tipo_comprobante = dataComprobantes.find(e=>e.value===d.id_tipoFactura)?.label
            newItem.origenDetalle = dataOrigenes.find(e=>e.value===d.id_origen)?.label
            return newItem;
        });
    };

    const onGlobalFilterChange = (e) => {
        const value = e.target.value;
        let _filters = { ...filters };

        _filters['global'].value = value;

        setFilters(_filters);
        setGlobalFilterValue(value);
    };

    const renderHeader = () => {
        return (
          <>
                  {/* <span className='font-24 text-black'>
                    CANTIDAD DE ATENCIONES TOTAL: {valueFilter?.length==0?customers?.filter(f=>f.detalleVenta_pagoVenta !== 0.0)?.length:valueFilter?.filter(f=>f.detalleVenta_pagoVenta !== 0.0)?.length}
                  </span> 
                  <br/>
                  <span className='font-24 text-black'>
                    CANTIDAD DE ATENCIONES DE JUNIO: {valueFilter?.length==0?customers?.filter(f=>f.detalleVenta_pagoVenta !== 0.0)?.length:valueFilter?.filter(f=>f.detalleVenta_pagoVenta !== 0.0)?.length}
                  </span> 
                  <br/>
                  <span className='font-24 text-black'>
                    CANTIDAD DE CLIENTES NUEVOS DE JUNIO: {valueFilter?.length==0?customers?.filter(f=>f.detalleVenta_pagoVenta !== 0.0)?.length:valueFilter?.filter(f=>f.detalleVenta_pagoVenta !== 0.0)?.length}
                  </span>
                  <br/>
                  <span className='font-24 text-black'>
                    CANTIDAD DE CLIENTES RECURRENTES DE JUNIO: {valueFilter?.length==0?customers?.filter(f=>f.detalleVenta_pagoVenta !== 0.0)?.length:valueFilter?.filter(f=>f.detalleVenta_pagoVenta !== 0.0)?.length}
                  </span> */}
            <div className="flex justify-content-start">
                <IconField iconPosition="left">
                    <InputIcon className="pi pi-search" />
                    <InputText className='border-4 border-primary' value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Buscador" />
                </IconField>
            </div>
          </>
        );
    };

    const totalVentasBodyTemplate = (rowData)=>{
        // Combinar los arrays en un solo array
        const combinedArray = [
          ...rowData.detalle_ventaProductos,
          ...rowData.detalle_ventaservicios
        ];

        // Calcular la suma total de tarifa_monto
        const sumaTotal = combinedArray.reduce((total, item) => total + item.tarifa_monto, 0);

      return(
          <div style={{fontSize: '25px'}} className={`flex align-items-center ${rowExtensionColor(rowData, 'text-black fw-bold')} gap-2`}>
            
              <span>{<NumberFormatMoney amount={sumaTotal}/> }</span>
          </div>
      )
    }
    const formatCurrency = (value, currency) => {
      return value.toLocaleString('en-ES', { style: 'currency', currency });
  };
  const [viewVentas, setviewVentas] = useState(false)
  const [idVentas, setidVentas] = useState(0)
  const [isPdfOpen, setisPdfOpen] = useState(false)
  
  const onModalviewVENTAS = (id)=>{
    setidVentas(id)
    setviewVentas(true)
    setisPdfOpen(true)
  }
  const onModalCancelVENTAS = ()=>{
    setviewVentas(false)
  }
  const fechaDeComprobanteBodyTemplate = (rowData)=>{
    return (
      <div className={`${rowExtensionColor(rowData, 'text-primary')}`}>
          <span className={`text-primary ${rowExtensionColor(rowData, 'text-primary')} fw-bold`}>
            {/* {FormatoDateMask(rowData.fecha_venta_v, 'dddd D [/]  ')} */}
          {/* <span className='text-black'></span> */}
          </span>
          <span>
            {FormatoDateMask(rowData.fecha_venta_v, 'dddd DD [de] MMMM ')}
            <br/>
            {FormatoDateMask(rowData.fecha_venta_v, 'hh:mm A')}
          </span>
      </div>
    )
  }
  const onClickPdfComprobante = (id_venta)=>{
    setidVentas(id_venta)
    
  }
  const actionBodyTemplate = (rowData) => {
    return (
          <Row>
              <Col xxl={12}>
                <Button 
                  rounded 
                  className=" p-1 border-0 text-decoration-underline" 
                  onClick={() => onModalviewVENTAS(rowData.id)} 
                  >DETALLE <br/> VENTA</Button>
              </Col>
          </Row>
    );
};
const comprobanteBodyTemplate = (rowData)=>{
  return (
    <div className={`${rowExtensionColor(rowData, 'text-primary')} fw-bold`}>
    { rowData.tipo_comprobante}
    </div>
  )
}
const logoPdfBodyTemplate = (rowData)=>{
  return(
    <Row className='m-0'>
      <Col xxl={12}>
        <Button className='m-0' onClick={()=>onClickPdfComprobante(rowData.id)} icon={'pi pi-file-pdf fs-3'}> </Button>
      </Col>
    </Row>
  )
}
const removeVentaBodyTemplate = (rowData)=>{
  return(
    <Row className='m-0'>
      {
              rowData.status_remove==1 ? (
              <Col xxl={12}>
              <Button className='m-0 bg-change' onClick={()=>onClickPdfComprobante(rowData.id)} icon={'pi pi-trash fs-3'}> </Button>
            </Col>): (
              <div className='text-white fs-3'>
              ELIMINADO
              </div>
            )
            }
    </Row>
  )
}
const infoClienteBodyTemplate = (rowData)=>{
  return(
    <Row className='m-0'>
      <Col xxl={12}>
      <div className=''>
        {/* {JSON.stringify(rowData.tb_cliente, 2, null)} */}
        <div className={`${rowExtensionColor(rowData, 'text-black')} fw-bold`}>{rowData.tb_cliente?.nombre_cli}</div>
        <div className={`${rowExtensionColor(rowData, 'text-black')} fw-bold bg-danger`}>{rowData.tb_cliente?.apPaterno_cli} {rowData.tb_cliente?.apMaterno_cli}</div>
      </div>
      </Col>
    </Row>
  )
}
const ncomprobanteBodyTemplate = (rowData)=>{
  return (
    <div className={`${rowExtensionColor(rowData, 'text-primary')} fw-bold`}>
    { rowData.numero_transac}
    </div>
  )
}
const idBodyTemplate = (rowData)=>{
  return(
    <div className={`${rowExtensionColor(rowData, 'text-primary')} fw-bold`}>
    { rowData.id}
    </div>
  )
}
const valueFiltered = (f)=>{
  setvalueFilter(f)
}
const rowClassName = (rowData) => {
  return rowExtension(rowData);
};
const rowExtension = (rowData)=>{
  switch (rowData.status_remove) {
    case 0:
      return 'row-trash'
      break;
    case 2:
    return 'row-congelamiento'
    break;
    default:
      return ''
      break;
}
}
const rowExtensionColor = (rowData, color_pr)=>{
  switch (rowData.status_remove) {
    case 0:
      return 'text-white'
      break;
    default:
    return color_pr
    break;
}
}
const origenBodyTemplate = (rowData)=>{
  return (
    <>
    {rowData?.origenDetalle=='OTROS'?'WHATSAPP':rowData?.origenDetalle}
    </>
  )
}
const header = renderHeader();

    return (
        <>
          <DataTable value={customers} 
                  onValueChange={valueFiltered}
                  rowClassName={rowClassName}
                        stripedRows paginator rows={10} dataKey="id" filters={filters} loading={loading}
                  globalFilterFields={["tb_cliente.nombres_apellidos_cli", "tb_empleado.nombres_apellidos_empl", "tipo_comprobante", "numero_transac", "origenDetalle"]} header={header} emptyMessage="No customers found.">
              <Column field="id" header={<span className='text-black fs-2'>ID</span>} filterPlaceholder="Search by name" style={{ minWidth: '5rem' }} body={idBodyTemplate}/>
              {/* <Column field="id" header="Foto de" filter filterPlaceholder="Search by name" style={{ minWidth: '5rem' }} /> */}
              <Column field="fecha_venta" header={<span className='text-black  fs-2'>FECHA <br/> HORA</span>} filterPlaceholder="BUSCAR FECHA" style={{ minWidth: '8rem' }} body={fechaDeComprobanteBodyTemplate}/>
              <Column field="tb_cliente.nombres_apellidos_cli" body={infoClienteBodyTemplate} header={<span className='text-black fs-2'>NOMBRES <br/> APELLIDOS</span>} filterPlaceholder="Search by name" style={{ minWidth: '12rem' }} />
              {/* <Column field="tb_empleado.nombres_apellidos_empl" header="ASESOR COMERCIAL" body={asesorBodyTemplate} filter filterPlaceholder="Search by name" style={{ minWidth: '12rem' }} /> */}
              <Column header={<span className='text-black fs-2'>TOTAL <br/>S/.</span>} body={totalVentasBodyTemplate} style={{ minWidth: '12rem' }} />
              <Column field="tipo_comprobante" header={<span className='fs-2'>COMPR.</span>} body={comprobanteBodyTemplate} filterPlaceholder="Buscar tipo de comprobante" style={{ minWidth: '10rem' }} />
              <Column field="numero_transac" header={<span className='fs-2'>Nº DE COMPR.</span>} body={ncomprobanteBodyTemplate} filterPlaceholder="Search by name" style={{ maxWidth: '10rem' }} />
              <Column header={<span className='fs-2'>ORIGEN</span>} body={origenBodyTemplate} filterPlaceholder="Search by name" style={{ maxWidth: '10rem' }} />
              <Column header="" frozen style={{ minWidth: '12rem' }} body={actionBodyTemplate} />
              {/* <Column header="" frozen style={{ minWidth: '2rem' }} body={logoPdfBodyTemplate} /> */}
              {/* <Column header="" frozen style={{ minWidth: '2rem' }} body={removeVentaBodyTemplate} /> */}
          </DataTable>
          <PdfComprobanteVenta id_venta={idVentas} isPdfOpen={isPdfOpen}/>
          <ModalViewObservacion clientesOptions={DataClientes} show={viewVentas} onHide={onModalCancelVENTAS} id={idVentas}/>
        </>
    );
}
        

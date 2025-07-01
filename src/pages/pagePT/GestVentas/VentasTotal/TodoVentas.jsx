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
import { arrayFacturas } from '@/types/type';
import { DateMaskString, FormatoDateMask, MoneyFormatter } from '@/components/CurrencyMask';
import dayjs from 'dayjs';
import { Col, Row } from 'react-bootstrap';
import { PdfComprobanteVenta } from './PdfComprobanteVenta';
import config from '@/config';
import sinAvatar from '@/assets/images/sinPhoto.jpg';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore';


export const TodoVentas=({id_empresa})=> {
  
  locale('es')
  const { obtenerTablaVentas, dataVentas } = useVentasStore()
  const  { obtenerParametroPorEntidadyGrupo:obtenerDataComprobantes, DataGeneral:dataComprobantes } = useTerminoStore()
  useEffect(() => {
      obtenerTablaVentas(id_empresa)
      obtenerDataComprobantes('nueva-venta', 'comprobante')
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
            newItem.fecha_venta_v = new Date(date.format());
            newItem.tipo_comprobante = dataComprobantes.find(e=>e.value===d.id_tipoFactura)?.label
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
                  <span className='font-24 text-black'>
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
                  </span>
            <div className="flex justify-content-end">
                <IconField iconPosition="left">
                    <InputIcon className="pi pi-search" />
                    <InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Buscador general" />
                </IconField>
            </div>
          </>
        );
    };

    const totalVentasBodyTemplate = (rowData)=>{
      // const obj = {...rowData.detalle_ventaCitasrowData.detalle_ventaCitas, ...rowData.detalle_ventaMembresia, detalle_ventaProductos}
        // Combinar los arrays en un solo array
        const combinedArray = [
          ...rowData.detalle_ventaCitas,
          ...rowData.detalle_ventaMembresia,
          ...rowData.detalle_ventaProductos,
          ...rowData.detalle_ventaservicios
        ];

        // Calcular la suma total de tarifa_monto
        const sumaTotal = combinedArray.reduce((total, item) => total + item.tarifa_monto, 0);

      return(
          <div style={{fontSize: '25px'}} className={`flex align-items-center ${rowExtensionColor(rowData, 'text-black fw-bold')} gap-2`}>
            
              <span>{<MoneyFormatter  amount={sumaTotal}/> }</span>
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
          <span className={`text-primary ${rowExtensionColor(rowData, 'text-primary')} fw-bold`}>{FormatoDateMask(rowData.fecha_venta_v, 'dddd D [/]  ')}
          {/* <span className='text-black'></span> */}
          </span>
          <span>
            {FormatoDateMask(rowData.fecha_venta_v, ' h:mm A')}
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
            {
              rowData.status_remove==1 && (
              <Col xxl={12}>
                <Button 
                  rounded 
                  className=" p-1 border-0 text-decoration-underline" 
                  onClick={() => onModalviewVENTAS(rowData.id)} 
                  >DETALLE DE LA VENTA</Button>
              </Col>
              )
            }
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
  const avatarCli = rowData.tb_cliente?.tb_images[rowData.tb_cliente.tb_images.length-1]?.name_image
  return(
    <Row className='m-0'>
      <Col xxl={12}>
      <div className='d-flex justify-content-between align-items-center'>
        {/* <span className='text-primary fw-bold'>{rowData.tb_cliente.nombres_apellidos_cli}</span> */}
        {/* <img width={90} height={80} className='border-circle' src={rowData.tb_cliente?.tb_images?.length>0?`${config.API_IMG.AVATAR_CLI}${avatarCli}`:sinAvatar}/> */}
        <span className={`${rowExtensionColor(rowData, 'text-black')} fw-bold ml-2`} style={{width: '190px'}}>{rowData.tb_cliente?.nombres_apellidos_cli}</span>
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
    const header = renderHeader();

    return (
        <>
          <DataTable value={customers} 
                  onValueChange={valueFiltered}
                  rowClassName={rowClassName}
                        stripedRows paginator rows={10} dataKey="id" filters={filters} loading={loading}
                  globalFilterFields={["tb_cliente.nombres_apellidos_cli", "tb_empleado.nombres_apellidos_empl", "tipo_comprobante", "numero_transac"]} header={header} emptyMessage="No customers found.">
              <Column field="id" header="Id" filter filterPlaceholder="Search by name" style={{ minWidth: '5rem' }} body={idBodyTemplate}/>
              {/* <Column field="id" header="Foto de" filter filterPlaceholder="Search by name" style={{ minWidth: '5rem' }} /> */}
              <Column field="fecha_venta" header={<span style={{bottom: '20px', position: 'relative'}}><span className='fs-2 text-black cursor-pointer'>JUNIO</span> <br/><span>FECHA Y HORA</span></span>} filterPlaceholder="BUSCAR FECHA" style={{ minWidth: '8rem' }} body={fechaDeComprobanteBodyTemplate}/>
              <Column field="tb_cliente.nombres_apellidos_cli" body={infoClienteBodyTemplate} header={<span className='text-black'>CLIENTES</span>} filter filterPlaceholder="Search by name" style={{ minWidth: '12rem' }} />
              {/* <Column field="tb_empleado.nombres_apellidos_empl" header="ASESOR COMERCIAL" body={asesorBodyTemplate} filter filterPlaceholder="Search by name" style={{ minWidth: '12rem' }} /> */}
              <Column header={<span className='text-black'>TOTAL</span>} body={totalVentasBodyTemplate} style={{ minWidth: '12rem' }} />
              <Column field="tipo_comprobante" header="COMPROBANTE" body={comprobanteBodyTemplate} filter filterPlaceholder="Buscar tipo de comprobante" style={{ minWidth: '12rem' }} />
              <Column field="numero_transac" header="Nº DE COMPR." body={ncomprobanteBodyTemplate} filter filterPlaceholder="Search by name" style={{ maxWidth: '7rem' }} />
              <Column header="" frozen style={{ minWidth: '12rem' }} body={actionBodyTemplate} />
              {/* <Column header="" frozen style={{ minWidth: '2rem' }} body={logoPdfBodyTemplate} /> */}
              <Column header="" frozen style={{ minWidth: '2rem' }} body={removeVentaBodyTemplate} />
          </DataTable>
          <PdfComprobanteVenta id_venta={idVentas} isPdfOpen={isPdfOpen}/>
          <ModalViewObservacion show={viewVentas} onHide={onModalCancelVENTAS} id={idVentas}/>
        </>
    );
}
        

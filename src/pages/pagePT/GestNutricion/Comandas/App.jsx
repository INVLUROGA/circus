import React, { useEffect, useState } from 'react'
import { ItemComanda } from './ItemComanda'
import { Col, Row } from 'react-bootstrap'
import { Button } from 'primereact/button'
import { ModalCustomComanda } from './ModalCustomComanda'
import { ModalCustomClase } from './ModalCustomClase'
import { ModalCustomProd } from './ModalCustomProd'
import { useComandasStore } from './useComandasStore'
import { useSelector } from 'react-redux'
import { Loading } from '@/components/Loading'
import { arrayEstadosVenta } from '@/types/type'
import Select from 'react-select'
export const App = () => {
    const [isOpenModalCustomComanda, setisOpenModalCustomComanda] = useState(false)
    const [isOpenModalCustomClaseComanda, setisOpenModalCustomClaseComanda] = useState({prod: false, serv: false, id_venta: 0})
    const { obtenerComandas, isLoading } = useComandasStore()
    const { dataView } = useSelector(e=>e.DATA)
    const onOpenModalCustomComanda = ()=>{
        setisOpenModalCustomComanda(true)
    }
    const onCloseModalCustomComanda = ()=>{
        setisOpenModalCustomComanda(false)
    }
    const onCloseModalCustomProdComanda = ()=>{
        setisOpenModalCustomClaseComanda({prod: false, serv: false, id_venta: 0})
    }
    const onOpenModalCustomProdComanda = (id_venta)=>{
        setisOpenModalCustomClaseComanda({prod: true, serv: false, id_venta})
    }
    const onCloseModalCustomServComanda = ()=>{
        setisOpenModalCustomClaseComanda({prod: false, serv: false, id_venta: 0})
    }
    const onOpenModalCustomServComanda = (id_venta)=>{
        setisOpenModalCustomClaseComanda({prod: false, serv: true, id_venta})
    }
    const onChangeEstadoComanda = (v)=>{
        console.log(v);
        
    }
    useEffect(() => {
        obtenerComandas()
    }, [])
  return (
    <>
    <Button label='AGREGAR COMANDA' onClick={onOpenModalCustomComanda}/>
    <Select
      name="id_estado"
      placeholder="ESTADO"
      className="react-select"
      classNamePrefix="react-select"
      options={arrayEstadosVenta}
      onChange={onChangeEstadoComanda}
      isClearable
    />
    <Row>
        {
            isLoading?(
                <Loading show={isLoading}></Loading>
            ):(
                <>
                    {
                    dataView.map((item)=>{
                        return (
                            <>
                            <ItemComanda item={item} onOpenModalCustomProdComanda={onOpenModalCustomProdComanda} onOpenModalCustomServComanda={onOpenModalCustomServComanda}/>
                            </>
                        )
                    })
                } 
                </> 
            )
        }
        <Col lg={12}>
        </Col>
    </Row>
    {/* PRODUCTO */}
    <ModalCustomClase id_venta={isOpenModalCustomClaseComanda.id_venta} onHide={onCloseModalCustomProdComanda} show={isOpenModalCustomClaseComanda.serv}/>
    {/* SERVICIO */}
    <ModalCustomProd id_venta={isOpenModalCustomClaseComanda.id_venta} onHide={onCloseModalCustomServComanda} show={isOpenModalCustomClaseComanda.prod}/>
    <ModalCustomComanda show={isOpenModalCustomComanda} onHide={onCloseModalCustomComanda}/>
    </>
  )
}

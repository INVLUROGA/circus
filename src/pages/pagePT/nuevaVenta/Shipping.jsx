import { Row, Col, Card, Button, Table} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { helperFunctions } from '@/common/helpers/helperFunctions';
import { useDispatch } from 'react-redux';
import { RESET_STATE_VENTA } from '@/store/uiNuevaVenta/uiNuevaVenta';
import { useVentasStore } from '@/hooks/hookApi/useVentasStore';
import icon_CARRITO from '@/assets/images/carrito.png'
import { Loading } from '@/components/Loading';
import Swal from 'sweetalert2';
import icoMem from '@/assets/images/PT-images/iconos/mem.png'
import icoAcc from '@/assets/images/PT-images/iconos/acc.png'
import icoEst from '@/assets/images/PT-images/iconos/estetica.png'
import icoSupl from '@/assets/images/PT-images/iconos/supl.png'
import icoNut from '@/assets/images/PT-images/iconos/nutri.png'
import icoTransf from '@/assets/images/PT-images/iconos/transf.png'
import { ItemProdServ } from '../reportes/totalVentas/ItemProdServ';

export const sumarTarifas = (venta) =>{
	const sumaTarifas = Object.values(venta)
	.flatMap(array => array) // Aplanamos los arrays en uno solo
	.map(objeto => objeto.tarifa) // Obtenemos un array con todas las tarifas
	.filter(tarifa => typeof tarifa === 'number') // Filtramos solo los valores que son números
	.reduce((total, tarifa) => total + tarifa, 0); // Sumamos todas las tarifas
	return sumaTarifas
}

export const sumarPagos = (dataPagos)=>{
	const sumaPagos = Object.values(dataPagos).flatMap(array=>array).map(obj=>obj.monto_pago)
	.reduce((total, tarifa) => total + tarifa, 0); // Sumamos todas las tarifas
	return sumaPagos;
}
const Shipping = ({ dataVenta, datos_pagos, detalle_cli_modelo, funToast }) => {
	const [modalAcc, setModalAcc] = useState(false)
	const [modalSupl, setModalSupl] = useState(false)
	const [modalPgm, setModalPgm] = useState(false)
	const [modalVentaFitology, setmodalVentaFitology] = useState(false)
	const [modalNutricion, setmodalNutricion] = useState(false)
	const [modalTransMem, setmodalTransMem] = useState(false)
	const [modalTraspaso, setmodalTraspaso] = useState(false)
	const { startRegisterVenta, msgBox, loadingVenta } = useVentasStore()
	const dispatch = useDispatch()
	const onOpenModalTraspaso = ()=>{
		setmodalTraspaso(true)
	}
	const onCloseModalTraspaso = ()=>{
        setmodalTraspaso(false)
    }
	const ClickOpenModalAcc = ()=>{
		setModalAcc(true)
	}
	const ClickOpenModalProgramas = ()=>{
		setModalPgm(true)
	}
	const ClickOpenModalFitology = ()=>{
		setmodalVentaFitology(true)
	}
	const ClickCloseModalFitology = ()=>{
		setmodalVentaFitology(false)
	}
	const ClickOpenModalTransfMemb = ()=>{
		setmodalTransMem(true)
	}
	const clickCloseModalTransfMemb = () =>{
		setmodalTransMem(false)
	}
	const onOpenModalSupl = ()=>{
		setModalSupl(true)
	}
	const onCloseModalSupl = ()=>{
		setModalSupl(false)
	}
	const onOpenModalNut = ()=>{
		setmodalNutricion(true)
	}
	const onCloseModalNut = ()=>{
		setmodalNutricion(false)
	}
	if(detalle_cli_modelo.id_cli==0){
		return(
			<div style={{ height: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', opacity: '.5'}}>
				<img src={icon_CARRITO} style={{width: '80px', height: '80px'}}>
				</img>
				ELIJA UN SOCIO PARA EMPEZAR A VENDER
			</div>
		)
	}
	const onSubmitFormVentaANDnew = async()=>{
		if(sumarPagos(datos_pagos)!==sumarTarifas(dataVenta)){
			return Swal.fire({
				icon: 'error',
				title: 'EL PAGO DEBE DE SER IGUAL AL SALDO PENDIENTE',
				showConfirmButton: false,
				timer: 2000,
			});
		}
		if(detalle_cli_modelo.id_tipo_transaccion==0 || detalle_cli_modelo.id_empl==0){
			return Swal.fire({
				icon: 'error',
				title: 'COMPLETAR LOS CAMPOS DE SOCIO',
				showConfirmButton: false,
				timer: 2000,
			});
		}
		await startRegisterVenta({dataVenta, datos_pagos, detalle_cli_modelo}, funToast)
		dispatch(RESET_STATE_VENTA())
	}
	const onSubmitFormVenta = async()=>{
		startRegisterVenta({dataVenta, datos_pagos, detalle_cli_modelo})
		// onSubmitFormVentaANDnew()   
	}
	return (
		<>
		<Row>
		</Row>
		<Loading show={loadingVenta}/>
		{/* <div className='container d-flex justify-content-between'>
			<Button onClick={handelPrev}>Anterior</Button>
			<Button onClick={handelNext}>Siguiente</Button>
		</div> */}
		
		</>
	);
};

export default Shipping;

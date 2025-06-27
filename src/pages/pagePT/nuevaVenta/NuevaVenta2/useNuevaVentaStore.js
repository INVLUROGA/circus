import { PTApi } from '@/common';
import { onSetDataView } from '@/store/data/dataSlice';
import { useState } from 'react';
import { useDispatch } from 'react-redux';

export const useNuevaVentaStore = () => {
	const [dataView, setdataView] = useState([]);
	const [cajas, setcajas] = useState([]);
	const dispatch = useDispatch();
	const obtenerServicios = async () => {
		const { data } = await PTApi.get('/circus/obtener-servicios');
		const dataAlter = data.servicios.map((serv) => {
			return {
				tipo: 'servicio',
				label: serv.nombre_servicio || '',
				subCategoria: serv?.tb_parametro?.label_param || '',
				precio: serv.precio || 0,
				duracion: serv.duracion || 0,
				uid: serv.uid || '',
			};
		});
		setdataView(dataAlter);
		// setdataFormaPagos(data.audit);
	};
	const obtenerCajaActual = async () => {
		try {
			const now = new Date();
			const { data } = await PTApi.get(`/venta/buscar-cajas`, {
				params: {
					fecha: now,
				},
			});
			console.log({ me: data.cajas });
			dispatch(onSetDataView([...data.cajas]));
		} catch (error) {
			console.log(error);
		}
	};
	const onAperturarCaja = async () => {
		try {
			const now = new Date();
			const { data } = await PTApi.post(`/venta/caja-apertura/599`);
			await obtenerCajaActual();
		} catch (error) {
			console.log(error);
		}
	};
	return {
		obtenerServicios,
		obtenerCajaActual,
		onAperturarCaja,
		dataView,
	};
};

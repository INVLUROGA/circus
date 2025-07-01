import { PTApi } from '@/common';
import { onSetDataView } from '@/store/data/dataSlice';
import { useState } from 'react';
import { useDispatch } from 'react-redux';

export const useNuevaVentaStore = () => {
	const [dataView, setdataView] = useState([]);
	const [dataProductos, setdataProductos] = useState([]);
	const [cajas, setcajas] = useState([]);
	const dispatch = useDispatch();
	const obtenerServicios = async () => {
		const { data } = await PTApi.get('/circus/obtener-servicios');
		console.log({ serv: data.servicios });

		const dataAlter = data.servicios.map((serv) => {
			return {
				tipo: 'servicio',
				id: serv.id || 0,
				label: serv.nombre_servicio || '',
				subCategoria: serv?.tb_parametro?.label_param || '',
				precio: serv.precio || 0,
				duracion: serv.duracion || 0,
				uid: serv.uid || '',
			};
		});
		setdataView(dataAlter);
	};
	const obtenerProductos = async () => {
		const { data } = await PTApi.get('/circus/obtener-productos/599');

		const dataAlter = data.productos.map((serv) => {
			return {
				tipo: 'producto',
				id: serv.id || 0,
				label: serv.nombre_producto || '',
				subCategoria: 'PRODUCTO' || '',
				precio: serv.prec_venta || 0,
				duracion: '' || 0,
				uid: `producto${serv.id}` || '',
			};
		});
		console.log({ prod: data.productos, dataAlter });
		setdataProductos(dataAlter);
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
		obtenerProductos,
		obtenerCajaActual,
		onAperturarCaja,
		dataView,
		dataProductos,
	};
};

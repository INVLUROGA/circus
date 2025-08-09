import { PTApi } from '@/common';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore';
import React, { useState } from 'react';

export const useComandasStore = () => {
	const { obtenerParametrosClientes, DataClientes } = useTerminoStore();
	const { DataVendedores, obtenerDataColaboradores } = useTerminoStore();
	const [dataView, setdataView] = useState([]);
	const [dataProductos, setdataProductos] = useState([]);

	const obtenerServicios = async () => {
		const { data } = await PTApi.get('/circus/obtener-servicios');
		console.log({ serv: data.servicios });

		const dataAlter = data.servicios.map((serv) => {
			return {
				tipo: 'servicio',
				value: serv.id || 0,
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
	const onPostServiciosVenta = async (id_venta, formState) => {
		try {
			const { data } = await PTApi.post(`/venta/servicios/${id_venta}`, formState);
		} catch (error) {
			console.log(error);
		}
	};
	const onPostProductosVenta = async (id_venta, formState) => {
		try {
			const { data } = await PTApi.post(`/venta/productos/${id_venta}`, formState);
		} catch (error) {
			console.log(error);
		}
	};
	const obtenerClientes = async () => {
		try {
			await obtenerParametrosClientes();
		} catch (error) {
			console.log(error);
		}
	};
	const obtenerEmpleados = async () => {
		try {
			await obtenerParametrosClientes();
		} catch (error) {
			console.log(error);
		}
	};
	const obtenerServiciosActivos = async () => {
		try {
			await obtenerParametrosClientes();
		} catch (error) {
			console.log(error);
		}
	};
	const obtenerProductosActivos = async () => {
		try {
			await obtenerParametrosClientes();
		} catch (error) {
			console.log(error);
		}
	};
	const onPostComandas = async () => {
		try {
			await obtenerParametrosClientes();
		} catch (error) {
			console.log(error);
		}
	};
	const onUpdateComandas = async () => {
		try {
			await obtenerParametrosClientes();
		} catch (error) {
			console.log(error);
		}
	};
	return {
		onPostProductosVenta,
		onPostServiciosVenta,
		dataView,
		dataProductos,
		obtenerServicios,
		obtenerProductos,
		DataClientes,
		obtenerClientes,
		obtenerEmpleados,
		obtenerProductosActivos,
		obtenerServiciosActivos,
		onPostComandas,
		onUpdateComandas,
	};
};

import { PTApi } from '@/common';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore';
import { onSetDataView } from '@/store/data/dataSlice';
import { arrayEstadosVenta } from '@/types/type';
import { confirmDialog } from 'primereact/confirmdialog';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

export const useComandasStore = () => {
	const { obtenerParametrosClientes, DataClientes } = useTerminoStore();
	const { DataVendedores, obtenerDataColaboradores } = useTerminoStore();
	const [isLoading, setisLoading] = useState(false);
	const [dataView, setdataView] = useState([]);
	const [dataProductos, setdataProductos] = useState([]);
	const dispatch = useDispatch();
	const obtenerServicios = async () => {
		const { data } = await PTApi.get('/circus/obtener-servicios');

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
				value: serv.id || 0,
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
			obtenerComandas();
		} catch (error) {
			confirmDialog({
				message: '¿Seguro que quiero eliminar el Aporte?',
				header: 'Eliminar Aporte',
				icon: 'pi pi-info-circle',
				defaultFocus: 'reject',
				acceptClassName: 'p-button-danger',
				accept: () => {
					console.log('VENTA YA PAGADA');
				},
			});
			console.log(error);
		}
	};
	const onPostProductosVenta = async (id_venta, formState) => {
		try {
			const { data } = await PTApi.post(`/venta/productos/${id_venta}`, formState);
			obtenerComandas();
		} catch (error) {
			console.log(error);
			confirmDialog({
				message: '¿Seguro que quiero eliminar el Aporte?',
				header: 'Eliminar Aporte',
				icon: 'pi pi-info-circle',
				defaultFocus: 'reject',
				acceptClassName: 'p-button-danger',
				accept: () => {
					console.log('VENTA YA PAGADA');
				},
			});
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
	const onPostComandas = async (formState) => {
		try {
			const { data } = await PTApi.post('/venta/comanda/599', formState);
		} catch (error) {
			console.log(error);
		}
	};
	const obtenerComandas = async () => {
		try {
			setisLoading(true);
			const { data } = await PTApi.get('/venta/comanda/599');

			const dataAlter = data?.comandas.map((comanda) => {
				return {
					id: comanda.id,
					fecha_venta: comanda.fecha_venta,
					nombre_cliente: comanda?.tb_cliente?.nombres_apellidos_cli,
					observacion: comanda?.observacion,
					estado: arrayEstadosVenta.find(
						(estado) => estado.value === comanda?.status_remove
					)?.label,
					status_color: arrayEstadosVenta.find(
						(estado) => estado.value === comanda?.status_remove
					)?.bg,
					servicios: comanda?.detalle_ventaservicios?.map((serv) => {
						return {
							clase: 'servicio',
							nombre: serv?.circus_servicio?.nombre_servicio,
							monto: serv?.tarifa_monto,
							colaborador: serv?.empleado_servicio?.nombres_apellidos_empl,
						};
					}),
					productos: comanda?.detalle_ventaProductos?.map((serv) => {
						return {
							clase: 'producto',
							nombre: serv?.tb_producto?.nombre_producto,
							monto: serv?.tarifa_monto,
							colaborador: serv?.empleado_producto?.nombres_apellidos_empl,
						};
					}),
				};
			});
			dispatch(onSetDataView(dataAlter));
			setisLoading(false);
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
		isLoading,
		obtenerComandas,
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

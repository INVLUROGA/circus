import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore';
import React from 'react';

export const useComandasStore = () => {
	const { obtenerParametrosClientes, DataClientes } = useTerminoStore();
	const { DataVendedores, obtenerDataColaboradores } = useTerminoStore();
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
		DataClientes,
		obtenerClientes,
		obtenerEmpleados,
		obtenerProductosActivos,
		obtenerServiciosActivos,
		onPostComandas,
		onUpdateComandas,
	};
};

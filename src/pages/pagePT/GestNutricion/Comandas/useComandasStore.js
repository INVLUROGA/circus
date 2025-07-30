import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore';
import React from 'react';

export const useComandasStore = () => {
	const { obtenerParametrosClientes, DataClientes } = useTerminoStore();
	const obtenerClientes = async () => {
		try {
			await obtenerParametrosClientes();
		} catch (error) {
			console.log(error);
		}
	};
	return {
		DataClientes,
		obtenerClientes,
	};
};

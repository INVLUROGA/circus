import { PTApi } from '@/common';
import { useState } from 'react';

export const useCalendarDia = () => {
	const [dataClientes, setdataClientes] = useState([]);
	const obtenerClientes = async () => {
		try {
			const { data } = await PTApi.get('/usuario/get-clientes/599');
			setdataClientes(data.clientes);
		} catch (error) {
			console.log(error);
		}
	};
	return {
		obtenerClientes,
		dataClientes,
	};
};

import { PTApi } from '@/common';
import { onSetDataView } from '@/store/data/dataSlice';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useDispatch } from 'react-redux';

export const useEmpleadosStore = () => {
	const dispatch = useDispatch();
	const obtenerEmpleadosxCargoxDepxEmpresa = async (id_cargo) => {
		try {
			const { data } = await PTApi.get(`/parametros/get_params/empleados/3`);
			setDataEmpleadosDepNutricion(data);
		} catch (error) {
			console.log(error);
		}
	};
	return {};
};

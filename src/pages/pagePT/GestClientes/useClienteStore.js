import { PTApi } from '@/common';
import React, { useState } from 'react';

export const useClienteStore = () => {
	const [dataDoc, setdataDoc] = useState({
		data: {},
		msg: 'load',
	});
	const obtenerDataDoc = async (tipoDoc, numDoc) => {
		try {
			console.log({ tipoDoc, numDoc });

			const { data } = await PTApi.post('/apireniec/busqueda', { numDoc, tipoDoc });
			console.log({ data });
			const dataCli = {
				nombre_cli: data.data?.nombres,
				apPaterno_cli: data.data?.apellido_paterno,
				apMaterno_cli: data.data?.apellido_materno,
				fecha_nacimiento: data.data?.fecha_nacimiento || '',
				sexo_cli: data.data?.sexo == 'M' ? 8 : 9,
				ubigeo_distrito_cli: data.data?.ubigeo || '150101',
				direccion_cli: data.data?.direccion || '',
			};
			console.log({ data: dataCli, msg: data.msg });
			setdataDoc({ data: dataCli, msg: data.msg });
			return { data: dataCli, msg: data.msg };
		} catch (error) {
			console.log('error en obtenerdatadoc', error);
		}
	};
	return {
		dataDoc,
		obtenerDataDoc,
	};
};

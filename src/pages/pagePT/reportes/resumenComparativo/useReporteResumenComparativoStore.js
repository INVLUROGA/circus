import { PTApi } from '@/common';
import dayjs, { utc } from 'dayjs';
import { useState } from 'react';
dayjs.extend(utc);

function formatDateToSQLServerWithDayjs(date) {
	console.log(dayjs.utc(date).format('YYYY-MM-DD HH:mm:ss.SSS'), 'dame');

	return dayjs.utc(date).format('YYYY-MM-DD HH:mm:ss.SSS'); // Asegurar que esté en UTC
	// .format('YYYY-MM-DD HH:mm:ss.SSS0000 +00:00');
}

export const useReporteResumenComparativoStore = () => {
	const [dataGroup, setdataGroup] = useState([]);
	const [dataGroupCanjes, setdataGroupCanjes] = useState([]);
	const [loading, setloading] = useState(true);
	const obtenerComparativoResumen = async (RANGE_DATE) => {
		setloading(true);
		const { data } = await PTApi.get('/circus/obtener-ventas-temp', {
			params: {
				arrayDate: [
					formatDateToSQLServerWithDayjs(RANGE_DATE[0]),
					formatDateToSQLServerWithDayjs(RANGE_DATE[1]),
				],
			},
		});
		setdataGroup(data.ventasTem);
		setloading(false);
	};
	const obtenerComparativoCanjes = async (RANGE_DATE) => {
		setloading(true);
		const { data } = await PTApi.get('/canjes/canjes', {
			params: {
				arrayDate: [
					formatDateToSQLServerWithDayjs(RANGE_DATE[0]),
					formatDateToSQLServerWithDayjs(RANGE_DATE[1]),
				],
			},
		});
		const canjes = data.canjes.map((c) => {
			return {
				...c,
				pago_monto: c.precio_venta,
				cantidad: 1,
			};
		});
		setdataGroupCanjes(canjes);
		setloading(false);
	};

	return {
		obtenerComparativoResumen,
		obtenerComparativoCanjes,
		dataGroupCanjes,
		dataGroup,
		loading,
	};
};

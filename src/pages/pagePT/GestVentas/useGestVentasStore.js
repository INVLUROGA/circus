import { PTApi } from '@/common';

export const useGestVentasStore = () => {
	const putVentas = async (formState, id_venta, obtenerVentaxID) => {
		try {
			await PTApi.put(`/venta/put-venta/${id_venta}`, formState);
			obtenerVentaxID(id_venta);
		} catch (error) {
			console.log(error);
		}
	};
	return { putVentas };
};

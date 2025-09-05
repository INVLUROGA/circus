import { PTApi } from '@/common';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore';
import dayjs, { utc } from 'dayjs';
import { useState } from 'react';
dayjs.extend(utc);

function formatDateToSQLServerWithDayjs(date) {
	console.log(dayjs.utc(date).format('YYYY-MM-DD HH:mm:ss.SSS'), 'dame');

	return dayjs.utc(date).format('YYYY-MM-DD HH:mm:ss.SSS'); // Asegurar que esté en UTC
	// .format('YYYY-MM-DD HH:mm:ss.SSS0000 +00:00');
}
// ventas: Array<{ fecha_venta, tb_cliente, detalle_ventaservicios, detalle_ventaProductos, flag? }>
const transformarVentas = (ventas = []) =>
	ventas.flatMap((v) => {
		const fecha = v?.fecha_venta ?? '';
		const nombre_cliente = v?.tb_cliente?.nombres_apellidos_cli?.trim?.() ?? '';
		const flagVenta = v?.flag; // puede venir a nivel cabecera

		const deProductos = (v?.detalle_ventaProductos ?? []).map((d) => ({
			fecha,
			nombre_cliente,
			clase: 'Producto',
			proser: d?.tb_producto?.nombre_producto ?? '',
			empleado: d?.empleado_producto?.nombres_apellidos_empl ?? '',
			cantidad: Number(d?.cantidad ?? 1) || 1,
			pago_monto: Number(d?.tarifa_monto ?? 0) || 0,
			flag: d?.flag ?? flagVenta ?? 1,
			categoria: d?.tb_producto?.id_categoria ?? 'SIN DATA',
		}));

		const deServicios = (v?.detalle_ventaservicios ?? []).map((d) => ({
			fecha,
			nombre_cliente,
			clase: 'Servicio',
			proser: d?.circus_servicio?.nombre_servicio ?? '',
			empleado: d?.empleado_servicio?.nombres_apellidos_empl ?? '',
			cantidad: Number(d?.cantidad ?? 1) || 1,
			pago_monto: Number(d?.tarifa_monto ?? 0) || 0,
			flag: d?.flag ?? flagVenta ?? 1,
			categoria: d?.circus_servicio?.id_categoria ?? 'SIN DATA',
		}));

		return [...deProductos, ...deServicios];
	});

export const useReporteResumenComparativoStore = () => {
	const [dataGroup, setdataGroup] = useState([]);
	const [dataGroupCanjes, setdataGroupCanjes] = useState([]);
	const [loading, setloading] = useState(true);
	const { obtenerParametroPorEntidadyGrupo: obtenerCategorias, DataGeneral: dataCategorias } =
		useTerminoStore();
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
		await obtenerCategorias('producto', 'categoria');
		const categorias = transformarVentas(data.ventasCircus).map((ventas) => {
			return {
				...ventas,
				categoria: dataCategorias.find((categoria) => categoria.value === ventas.categoria)
					?.label,
			};
		});
		console.log({
			vmmm: data,
			trans: transformarVentas(data.ventasCircus),
			categorias,
			dataCategorias,
		});

		setdataGroup(categorias);
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

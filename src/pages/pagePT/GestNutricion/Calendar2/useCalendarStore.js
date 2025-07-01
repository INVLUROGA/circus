import { PTApi } from '@/common';
import { DateMaskString, NumberFormatMoney } from '@/components/CurrencyMask';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore';
import { onSetDataView } from '@/store/data/dataSlice';
import { useState } from 'react';
import { useDispatch } from 'react-redux';

export const useCalendarStore = () => {
	const [dataClientes, setdataClientes] = useState([]);
	const [dataCitas, setdataCitas] = useState([]);
	const [dataEmpleados, setdataEmpleados] = useState([]);
	const [dataParametrosServicios, setdataParametrosServicios] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [message, setmessage] = useState({ msg: '', ok: false });
	const { postEtiquetaxEntidadxGrupo } = useTerminoStore();
	const dispatch = useDispatch();
	const obtenerClientes = async () => {
		try {
			const { data } = await PTApi.get('/parametros/get_params/clientes/599');
			setdataClientes(data);
		} catch (error) {
			console.log(error);
		}
	};
	const obtenerEmpleadosxDepartamento = async () => {
		try {
			const { data } = await PTApi.get('/parametros/get_params/empleados/5/599');
			setdataEmpleados(data || []);
		} catch (error) {
			console.log(error);
		}
	};
	const obtenerServiciosxEmpresa = async () => {
		try {
			const { data } = await PTApi.get('/parametros/get_params/servicios/599');
			const parametrosServicios = data.map((d) => {
				return {
					label: `${d.nombre_servicio} | DURACION: ${d.duracion} | PRECIO: ${d.precio}`,
					value: d.id,
					duracion: d.duracion,
					precio: d.precio,
				};
			});
			setdataParametrosServicios(parametrosServicios);
		} catch (error) {
			console.log(error);
		}
	};
	const postEventoServicioxEmpresa = async (formState, etiquetas_busquedas, fecha_inicio) => {
		try {
			const { data } = await PTApi.post('/cita/servicio-cita/599', {
				formState,
				etiquetas_busquedas,
			});
			console.log({ formState, etiquetas_busquedas, fecha_inicio });

			if (etiquetas_busquedas.length > 0) {
				postEtiquetaxEntidadxGrupo(
					'agenda-estilista',
					'servicios',
					data.id,
					etiquetas_busquedas
				);
			}
			await obtenerEventoServicioxEmpresa(599, fecha_inicio);
			setIsLoading(false);
			// await obtenerArticulos(id_enterprice);
			setmessage({ msg: data.msg, ok: data.ok });
		} catch (error) {
			console.log(error);
		}
	};
	const putEventoServicioxEmpresa = async (
		formState,
		etiquetas_busquedas,
		fecha_inicio,
		id_cita
	) => {
		try {
			setIsLoading(true);
			const { data } = await PTApi.put(`/cita/servicio-cita/${id_cita}`, {
				formState,
			});
			await obtenerEventoServicioxEmpresa(599, fecha_inicio);
			setIsLoading(false);
			// await obtenerArticulos(id_enterprice);
			setmessage({ msg: data.msg, ok: data.ok });
		} catch (error) {
			console.log(error);
		}
	};
	const obtenerEventoServicioxEmpresa = async (id_empresa, fecha_inicio) => {
		try {
			setIsLoading(true);
			const { data } = await PTApi.get('/cita/servicio-cita/599', {
				params: {
					fecha_inicio: fecha_inicio,
				},
			});
			console.log({ fecha_inicio, data });
			setIsLoading(false);
			// await obtenerArticulos(id_enterprice);
			setmessage({ msg: data.msg, ok: data.ok });

			const dataCitas = data.map((d) => {
				// 1. Parseamos la fecha de inicio (que viene como string ISO con “Z”)
				const startDate = new Date(d.fecha_inicio);

				// 2. Sumamos todas las duraciones (en minutos)
				const totalMinutes = (d.tb_EtiquetasxIds || []).reduce((sum, servicio) => {
					const dur = servicio?.parametro_servicio?.duracion || 0;
					return sum + Number(dur);
				}, 0);

				// 3. Generamos la fecha final sumando minutos
				const endDate = new Date(startDate.getTime() + totalMinutes * 60_000);
				return {
					id: d.id,
					title: `${d.tb_cliente?.nombre_cli || ''} ${d.tb_cliente?.apMaterno_cli || ''} ${d.tb_cliente?.apPaterno_cli || ''}`,
					start: d.fecha_inicio?.split('Z')[0],
					end: endDate.toISOString().split('Z')[0],
					eventos: d.tb_EtiquetasxIds?.map((servicios) => {
						return {
							nombre_servicio: servicios?.parametro_servicio?.nombre_servicio || '',
							duracion: servicios?.parametro_servicio?.duracion || '',
						};
					}),
					id_empl: d.id_empl,
					comentario: d?.comentario,
					id_origen: d.id_origen,
					id_asistencia: d.id_asistencia,
					id_estado: d.id_estado,
				};
			});
			dispatch(onSetDataView(dataCitas));
			setdataCitas(dataCitas);
			console.log({ data }, 'obtenido.....');
		} catch (error) {
			console.log(error);
		}
	};
	return {
		obtenerEventoServicioxEmpresa,
		obtenerClientes,
		dataClientes,
		obtenerEmpleadosxDepartamento,
		dataEmpleados,
		obtenerServiciosxEmpresa,
		dataParametrosServicios,
		postEventoServicioxEmpresa,
		dataCitas,
		isLoading,
		putEventoServicioxEmpresa,
	};
};

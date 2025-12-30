export const normalizarVentasExcel = (ventas = []) => {
	return ventas.flatMap((venta, idx) => {
		const {
			id,
			numero_transac,
			fecha_venta,
			tb_cliente,
			detalle_ventaProductos = [],
			detalle_ventaservicios = [],
			detalleVenta_pagoVenta = [],
		} = venta;

		// si no hay pagos, dejamos uno vacío
		const pagos = detalleVenta_pagoVenta.length ? detalleVenta_pagoVenta : [null];

		const fila = (clase, nombre, marca, empleado, cantidad, subTotal, pago) => ({
			fecha: fecha_venta,
			pedido: idx + 1, // correlativo
			tv: 'V', // tipo venta
			com: 'eBoleta', // ejemplo, ajusta a tu lógica
			comp: numero_transac,
			t_cliente: 'Regular', // o preferencial/lo que mapees
			t_doc: 'DNI',
			doc: tb_cliente?.dni || '00000000',
			cliente: tb_cliente?.nombres_apellidos_cli || '',
			telef: tb_cliente?.telefono || '',
			email: tb_cliente?.email || '',
			total_comp: subTotal,
			clase,
			marca: marca || '',
			producto_servicio: nombre,
			empleado: empleado || '',
			cant: cantidad,
			sub_total: subTotal,
			desc: 0,
			total: subTotal,
			// forma de pago
			efec_s: pago?.parametro_forma_pago?.label_param == 'EFECTIVO' ? subTotal : 0, // si no hay pago, lo ponemos en efectivo
			tipo_op: pago?.parametro_forma_pago?.label_param || '',
			n_oper: pago?.n_operacion || '',
			op_elect_s: pago?.parcial_monto || 0,
			        responsable_venta: responsableVenta,

		});

		const filasProd = detalle_ventaProductos.flatMap((p) =>
			pagos.map((pg) =>
				fila(
					'Producto',
					p.tb_producto?.nombre_producto,
					p.tb_producto?.marca || '',
					p.empleado_producto?.nombres_apellidos_empl,
					p.cantidad,
					p.tarifa_monto,
					pg
				)
			)
		);

		const filasServ = detalle_ventaservicios.flatMap((s) =>
			pagos.map((pg) =>
				fila(
					'Servicio',
					s.circus_servicio?.nombre_servicio,
					'',
					s.empleado_servicio?.nombres_apellidos_empl,
					s.cantidad,
					s.tarifa_monto,
					pg
				)
			)
		);

		return [...filasProd, ...filasServ];
	});
};

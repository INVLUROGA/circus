import { Row, Col, Button } from 'react-bootstrap';
import { useEffect, useState } from 'react';
import { arrayEstados, arrayFacturas, arrayOrigenDeCliente } from '@/types/type';
import { useForm } from '@/hooks/useForm';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore';
import { useDispatch } from 'react-redux';
import { onSetDetalleCli } from '@/store/uiNuevaVenta/uiNuevaVenta';
import Select from 'react-select';
import { useVentasStore } from '@/hooks/hookApi/useVentasStore';
const registerCliente = {
	id_cli: 0, 
	id_empl: 0,
	id_tipo_transaccion: 0, 
	numero_transac: '', 
	id_origen: 0, 
	fecha_venta: null,
	observacion: '',
}
function formatoNumero(num) {
  const abs = Math.abs(num).toString().padStart(8, '0');
  return (num < 0 ? '-' : '') + abs;
}

const DatosCliente = ({dataCliente, setNombreCliente}) => {
	const dispatch = useDispatch()
	  const { obtenerEmpleadosxCargoxDepartamentoxEmpresa:obtenerRecepcionistas, DataVendedores:dataRecepcionista } = useTerminoStore();
	const {obtenerParametrosClientes, DataClientes, obtenerParametrosVendedores, DataVendedores} = useTerminoStore()
	const {obtenerParametroPorEntidadyGrupo:obtenerDataOrigenCircus, DataGeneral:dataOrigenCircus} = useTerminoStore()
	const { dataComprobante, obtenerVentasxComprobantes } = useVentasStore()
	const [MsgValidation, setMsgValidation] = useState('')
	const [clienteSelect, setClienteSelect] = useState({})
	const [EmpleadoSelect, setEmpleadoSelect] = useState({})
	const [TipoTransacSelect, setTipoTransacSelect] = useState({})
	const { formState: formStateCliente, 
		id_cli, 
		id_empl, 
		id_tipo_transaccion, 
		numero_transac, 
		id_origen, 
		observacion,
		fecha_venta,
		onInputChangeFunction,
		onInputChangeReact, onInputChange } = useForm(dataCliente)
	useEffect(() => {
		obtenerParametrosClientes()
		obtenerRecepcionistas(63, 5, 599)
		obtenerParametrosVendedores()
		obtenerDataOrigenCircus('nueva-venta-circus', 'origen')
	}, [])
	
	useEffect(() => {
		dispatch(onSetDetalleCli({
			...formStateCliente, 
			id_cli: id_cli,
			id_empl: id_empl, 
            id_tipo_transaccion: 703, 
            numero_transac: numero_transac, 
            id_origen: id_origen, 
            observacion: observacion,
			// fecha_venta: fecha_venta
			// email_cli: clienteSelect?.email_cli, 
			// label_cli: clienteSelect?.label, 
			// label_empl: EmpleadoSelect?.label, 
			// label_tipo_transac: TipoTransacSelect?.label
		}))
	}, [id_cli, id_empl, id_tipo_transaccion, numero_transac, id_origen, observacion, fecha_venta])
	
	useEffect(() => {
		const datacli = DataClientes.find(
			(option) => option.value === id_cli
		)
		setClienteSelect(datacli)
	}, [id_cli])
	useEffect(() => {
		const dataEmpl = DataVendedores.find(
			(option) => option.value === id_empl
		)
		setEmpleadoSelect(dataEmpl)
	}, [id_empl])
	useEffect(() => {
		const dataTipoTransac = arrayFacturas.find(
			(option) => option.value === 703
		)
		setTipoTransacSelect(dataTipoTransac)
	}, [id_tipo_transaccion])
	useEffect(() => {
		if (dataComprobante?.numero_transac) {
			onInputChangeFunction('numero_transac', `${dataComprobante?.numero_transac.split('-')[0]}-${formatoNumero(Number(dataComprobante?.numero_transac.split('-')[1])+1)}`)
		}
	}, [dataComprobante])

	const inputChangeClientes = (e)=>{
		const dataCli = DataClientes.find(
            (option) => option.label === e.value
        )
		setNombreCliente(`${e?.label.split('|')[1]}`)
		onInputChangeFunction('id_cli', e.value)
	}
	const inputChangeEmpl = (e)=>{
		const dataRecepc = dataRecepcionista.find(
            (option) => option.label === e.value
        )
		onInputChangeFunction('id_empl', e.value)
	}
	const onChangeTipoDeComprobante = (e)=>{
		// obtenerVentasxComprobantes(e.value)
		obtenerVentasxComprobantes(e?.value)
		onInputChangeFunction('id_tipo_transaccion', 703)
		// onInputChangeFunction('numero_transac', dataComprobante.numero_transac)   ${Number(dataComprobante?.numero_transac.split('-')[1])+1}
	}
	console.log({DataClientes});
	
	return (
		<>
		<form>
			<Row>
				<Col>
						<Row>
							<Col xl={12}>
									<Row>
										<Col xl={12} sm={12}>
											<div className='mb-2'>
											<Select
												onChange={(e) => inputChangeEmpl(e)}
												name="id_empl"
												placeholder={'Seleccionar COLABORADOR'}
												styles={{
												input: (provided) => ({
													...provided,
													color: "#EEBE00",
													fontWeight: "bold",
												}),
												dropdownIndicator: (provided) => ({
													...provided,
													color: "#EEBE00",
												}),
												indicatorSeparator: (provided) => ({
													...provided,
													backgroundColor: "#EEBE00",
												}),
												control: (provided) => ({
													...provided,
													borderColor: "#EEBE00",
													color: "#EEBE00",
												}),
							}}
											className="border-2 rounded-3 border-primary outline-none"
												// classNamePrefix="react-select"
												options={dataRecepcionista}
												
												value={dataRecepcionista.find(
													(option) => option.value === id_empl
												)|| 0}
												required
											/>
											</div>
										</Col>
										<Col xl={12} sm={12}>
											<div className='mb-2'>
											<Select
												onChange={(e) => inputChangeClientes(e)}
												name="id_cli"
												placeholder={'Seleccionar canje'}
                    styles={{
                      input: (provided) => ({
                        ...provided,
                        color: "#EEBE00",
                        fontWeight: "bold",
                      }),
                      dropdownIndicator: (provided) => ({
                        ...provided,
                        color: "#EEBE00",
                      }),
                      indicatorSeparator: (provided) => ({
                        ...provided,
                        backgroundColor: "#EEBE00",
                      }),
                      control: (provided) => ({
                        ...provided,
                        borderColor: "#EEBE00",
                        color: "#EEBE00",
                      }),
  }}
                  className="border-2 rounded-3 border-primary outline-none"
												// classNamePrefix="react-select"
												options={DataClientes}
												value={DataClientes.find(
													(option) => option.value === id_cli
												)|| 0}
												required
											/>
											</div>
										</Col>
										<Col xl={12} sm={12}>
										<div className='mb-2'>
											<Select
												onChange={(e) => onInputChangeReact(e, 'id_origen')}
												name="id_origen"
												placeholder={'ORIGEN'}
                    styles={{
                      input: (provided) => ({
                        ...provided,
                        color: "#EEBE00",
                        fontWeight: "bold",
                      }),
                      dropdownIndicator: (provided) => ({
                        ...provided,
                        color: "#EEBE00",
                      }),
                      indicatorSeparator: (provided) => ({
                        ...provided,
                        backgroundColor: "#EEBE00",
                      }),
                      control: (provided) => ({
                        ...provided,
                        borderColor: "#EEBE00",
                        color: "#EEBE00",
                      }),
  }}
                  className="border-2 rounded-3 border-primary outline-none"
												// classNamePrefix="react-select"
												options={dataOrigenCircus}
												value={dataOrigenCircus.find(
													(option) => option.value === id_origen
												) || 0}
												required
											/>
										</div>
										</Col>
										{/* <Col xl={12} sm={12}>
										<div className='mb-2'>
											<Select
												onChange={(e) => onChangeTipoDeComprobante(e)}
												name="id_tipo_transaccion"
												placeholder={'Tipo de comprobante'}
                    styles={{
                    //   option: (provided) => ({
                    //     ...provided,
                    //     color: "#EEBE00",
                    //     fontWeight: "bold",
                    //   }),
                      singleValue: (provided) => ({
                        ...provided,
                        color: "#EEBE00",
                        fontWeight: "bold",
                      }),
                    //   placeholder: (provided) => ({
                    //     ...provided,
                    //     color: "#EEBE00",
                    //     fontWeight: "bold",
                    //   }),
                      input: (provided) => ({
                        ...provided,
                        color: "#EEBE00",
                        fontWeight: "bold",
                      }),
                      dropdownIndicator: (provided) => ({
                        ...provided,
                        color: "#EEBE00",
                      }),
                      indicatorSeparator: (provided) => ({
                        ...provided,
                        backgroundColor: "#EEBE00",
                      }),
                      control: (provided) => ({
                        ...provided,
                        borderColor: "#EEBE00",
                        color: "#EEBE00",
                      }),
  }}
                  className="border-2 rounded-3 border-primary outline-none"
												// classNamePrefix="react-select"
												options={arrayFacturas}
												value={arrayFacturas.find(
													(option) => option.value === id_tipo_transaccion
												)|| 0}
												required
												isDisabled
											/>
										</div>
										</Col> */}
										<Col xl={12} sm={12}>
										<div className='mb-2'>
											<textarea
												name='observacion'
												id='observacion'
												className='border-2 rounded-3 border-primary w-100 p-1 outline-none border-gray-300 fw-bold font-13'
												placeholder='Observaciones'
												value={observacion}
												onChange={onInputChange}
											/>
										</div>
										</Col>
									</Row>
							</Col>
						</Row>
				</Col>
			</Row>
		</form>
		</>
	);
};

export default DatosCliente;

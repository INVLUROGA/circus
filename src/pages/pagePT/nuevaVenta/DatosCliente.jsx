import { Row, Col } from 'react-bootstrap';
import { useEffect, useState, useMemo } from 'react'; // Agregamos useMemo
import { arrayFacturas } from '@/types/type';
import { useForm } from '@/hooks/useForm';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore';
import { useDispatch } from 'react-redux';
import { onSetDetalleCli } from '@/store/uiNuevaVenta/uiNuevaVenta';
import Select from 'react-select';
import { useVentasStore } from '@/hooks/hookApi/useVentasStore';

function formatoNumero(num) {
  const abs = Math.abs(num).toString().padStart(8, '0');
  return (num < 0 ? '-' : '') + abs;
}

const DatosCliente = ({dataCliente, setNombreCliente}) => {
    const dispatch = useDispatch();


    const {
        obtenerEmpleadosxCargoxDepartamentoxEmpresa: obtenerEmpleadosxEstilistas,
        DataVendedores: dataEstilistas
    } = useTerminoStore();
    
    const {
        obtenerEmpleadosxCargoxDepartamentoxEmpresa: obtenerEmpleadosxAsistentesEstilistas,
        DataVendedores: dataAsistentesEstilistas
    } = useTerminoStore();
    
    const {
        obtenerEmpleadosxCargoxDepartamentoxEmpresa: obtenerEmpleadosxAsistentesManicuristas,
        DataVendedores: dataManicuristas
    } = useTerminoStore();
    
    const {
        obtenerEmpleadosxCargoxDepartamentoxEmpresa: obtenerEmpleadosJefesDeSalon,
        DataVendedores: dataJefesDeSalon
    } = useTerminoStore();
    
    const {
        obtenerEmpleadosxCargoxDepartamentoxEmpresa: obtenerRecepcionistas,
        DataVendedores: dataRecepcionista
    } = useTerminoStore();

    const { obtenerParametrosClientes, DataClientes } = useTerminoStore();
    const { obtenerParametroPorEntidadyGrupo: obtenerDataOrigenCircus, DataGeneral: dataOrigenCircus } = useTerminoStore();
    const { dataComprobante, obtenerVentasxComprobantes } = useVentasStore();
    
    const [errors, setErrors] = useState({});
    const [clienteSelect, setClienteSelect] = useState({});
    const [EmpleadoSelect, setEmpleadoSelect] = useState({});
    const [TipoTransacSelect, setTipoTransacSelect] = useState({});
    
    const { formState: formStateCliente, 
        id_cli, 
        id_empl, 
        id_tipo_transaccion, 
        numero_transac, 
        id_origen, 
        observacion,
        fecha_venta,
        onInputChangeFunction,
        onInputChangeReact, 
        onInputChange 
    } = useForm(dataCliente);

    useEffect(() => {
        obtenerParametrosClientes();
        obtenerDataOrigenCircus('nueva-venta-circus', 'origen');

        obtenerEmpleadosxEstilistas(26, 5, 599);
        obtenerEmpleadosxAsistentesEstilistas(27, 5, 599);
        obtenerEmpleadosxAsistentesManicuristas(62, 5, 599);
        obtenerEmpleadosJefesDeSalon(29, 5, 599);
        obtenerRecepcionistas(63, 5, 599);
    }, []);

    const dataCargos = useMemo(
        () => [
            ...(dataEstilistas || []),
            ...(dataAsistentesEstilistas || []),
            ...(dataManicuristas || []),
            ...(dataJefesDeSalon || []),
            ...(dataRecepcionista || [])
        ],
        [dataEstilistas, dataAsistentesEstilistas, dataManicuristas, dataJefesDeSalon, dataRecepcionista]
    );


    useEffect(() => {
        dispatch(onSetDetalleCli({
            ...formStateCliente, 
            id_cli, id_empl, id_tipo_transaccion, numero_transac, id_origen, observacion,
        }));
    }, [id_cli, id_empl, id_tipo_transaccion, numero_transac, id_origen, observacion, fecha_venta]);
    
    useEffect(() => {
        const datacli = DataClientes.find((option) => option.value === id_cli);
        setClienteSelect(datacli);
    }, [id_cli]);

    useEffect(() => {
        const dataEmpl = dataCargos.find((option) => option.value === id_empl);
        setEmpleadoSelect(dataEmpl);
    }, [id_empl, dataCargos]);

    useEffect(() => {
        const dataTipoTransac = arrayFacturas.find((option) => option.value === id_tipo_transaccion);
        setTipoTransacSelect(dataTipoTransac);
    }, [id_tipo_transaccion]);

    useEffect(() => {
        if (dataComprobante?.numero_transac) {
            const nuevoNumero = `${dataComprobante?.numero_transac.split('-')[0]}-${formatoNumero(Number(dataComprobante?.numero_transac.split('-')[1])+1)}`;
            onInputChangeFunction('numero_transac', nuevoNumero);
            validateField('numero_transac', nuevoNumero);
        }
    }, [dataComprobante]);

    const validateField = (field, value) => {
        let error = '';
        if (!value || value === 0 || (typeof value === 'string' && value.trim() === '')) {
            error = 'Requerido';
        }
        setErrors(prev => ({ ...prev, [field]: error }));
    };

    const inputChangeClientes = (e) => {
        setNombreCliente(`${e?.label.split('|')[1]}`);
        onInputChangeFunction('id_cli', e.value);
        validateField('id_cli', e.value);
    };

    const inputChangeEmpl = (e) => {
        onInputChangeFunction('id_empl', e.value);
        validateField('id_empl', e.value);
    };

    const onChangeTipoDeComprobante = (e) => {
        obtenerVentasxComprobantes(e?.value);
        onInputChangeFunction('id_tipo_transaccion', e?.value);
        validateField('id_tipo_transaccion', e?.value);
    };

    const handleOrigenChange = (e) => {
        onInputChangeReact(e, 'id_origen');
        validateField('id_origen', e?.value);
    };

    const handleTextChange = (e) => {
        onInputChange(e);
        validateField(e.target.name, e.target.value);
    };

    const getSelectStyles = (hasError) => ({
        input: (provided) => ({ ...provided, color: hasError ? "#dc3545" : "#EEBE00", fontWeight: "bold" }),
        dropdownIndicator: (provided) => ({ ...provided, color: hasError ? "#dc3545" : "#EEBE00" }),
        indicatorSeparator: (provided) => ({ ...provided, backgroundColor: hasError ? "#dc3545" : "#EEBE00" }),
        control: (provided) => ({
            ...provided,
            borderColor: hasError ? "#dc3545" : "#EEBE00",
            color: hasError ? "#dc3545" : "#EEBE00",
            boxShadow: hasError ? "0 0 0 1px #dc3545" : provided.boxShadow,
        }),
        singleValue: (provided) => ({ ...provided, color: hasError ? "#dc3545" : "#EEBE00", fontWeight: "bold" }),
        placeholder: (provided) => ({ ...provided, color: hasError ? "#dc3545" : "#EEBE00" })
    });

    return (
        <>
        <form>
            <Row>
                <Col>
                    <Row>
                        <Col xl={12}>
                            <Row>
                                {/* SELECT COLABORADOR - USANDO LA LÓGICA DEL MODAL */}
                                <Col xl={12} sm={12}>
                                    <div className='mb-2'>
                                        <Select
                                            onChange={inputChangeEmpl}
                                            name="id_empl"
                                            placeholder={'Seleccionar COLABORADOR'}
                                            styles={getSelectStyles(!!errors.id_empl)}
                                            className="border-2 rounded-3 outline-none"
                                            // 4. USAMOS LA LISTA FUSIONADA
                                            options={dataCargos} 
                                            value={dataCargos.find((option) => option.value === id_empl) || null}
                                            required
                                        />
                                        {errors.id_empl && <small className="text-danger fw-bold ms-1">{errors.id_empl}</small>}
                                    </div>
                                </Col>

                                <Col xl={12} sm={12}>
                                    <div className='mb-2'>
                                        <Select
                                            onChange={inputChangeClientes}
                                            name="id_cli"
                                            placeholder={'Seleccionar cliente'}
                                            styles={getSelectStyles(!!errors.id_cli)}
                                            className="border-2 rounded-3 outline-none"
                                            options={DataClientes}
                                            value={DataClientes.find((option) => option.value === id_cli) || null}
                                            required
                                        />
                                        {errors.id_cli && <small className="text-danger fw-bold ms-1">{errors.id_cli}</small>}
                                    </div>
                                </Col>

                                <Col xl={12} sm={12}>
                                    <div className='mb-2'>
                                        <Select
                                            onChange={handleOrigenChange}
                                            name="id_origen"
                                            placeholder={'ORIGEN'}
                                            styles={getSelectStyles(!!errors.id_origen)}
                                            className="border-2 rounded-3 outline-none"
                                            options={dataOrigenCircus.filter(origen => origen.value !== 1450)}
                                            value={dataOrigenCircus.find((option) => option.value === id_origen) || null}
                                            required
                                        />
                                        {errors.id_origen && <small className="text-danger fw-bold ms-1">{errors.id_origen}</small>}
                                    </div>
                                </Col>

                                <Col xl={12} sm={12}>
                                    <div className='mb-2'>
                                        <Select
                                            onChange={onChangeTipoDeComprobante}
                                            name="id_tipo_transaccion"
                                            placeholder={'Tipo de comprobante'}
                                            styles={getSelectStyles(!!errors.id_tipo_transaccion)}
                                            className="border-2 rounded-3 outline-none"
                                            options={arrayFacturas.filter(factura => factura.value !== 703)}
                                            value={arrayFacturas.find((option) => option.value === id_tipo_transaccion) || null}
                                            required
                                        />
                                        {errors.id_tipo_transaccion && <small className="text-danger fw-bold ms-1">{errors.id_tipo_transaccion}</small>}
                                    </div>
                                </Col>

                                <Col xl={12} sm={12}>
                                    <div className='mb-2'>
                                        <input
                                            type='text'
                                            name='numero_transac'
                                            id='numero_transac'
                                            className={`border-2 rounded-3 w-100 p-1 outline-none fw-bold font-13 ${errors.numero_transac ? 'border-danger text-danger' : 'border-primary border-gray-300'}`}
                                            placeholder='numero de comprobante'
                                            value={numero_transac}
                                            onChange={handleTextChange}
                                            onBlur={(e) => validateField('numero_transac', e.target.value)}
                                        />
                                        {errors.numero_transac && <small className="text-danger fw-bold ms-1">{errors.numero_transac}</small>}
                                    </div>
                                </Col>

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
import { ThemeSettings, useThemeContext } from '@/common';
import { lazy, useEffect } from 'react';
import { Navigate, Route, Routes as ReactRoutes } from 'react-router-dom';
import VerticalLayout from '@/layouts/Vertical';
import HorizontalLayout from '@/layouts/Horizontal';
import { useSelector } from 'react-redux';
import { useAuthStore } from '@/hooks/useAuthStore';
import Account from '@/pages/account';
import { Home } from '@/pages/pagePT/Home';
import { PerfilPrograma } from '@/pages/pagePT/GestProgramas/PerfilPrograma';
import CrearCitasNutricion from '@/pages/pagePT/GestNutricion';
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// dayjs.extend(utc);
// dayjs.extend(timezone);

// // Por defecto: Lima (UTC-5)
// dayjs.tz.setDefault("America/Lima");



const NuevaVenta = lazy(() => import('../pages/pagePT/nuevaVenta'));
const Seguimiento = lazy(() => import('../pages/pagePT/seguimiento'));
const TotaldeVentas = lazy(() => import('../pages/pagePT/reportes/totalVentas'));
const VentasPrograma = lazy(() => import('../pages/pagePT/reportes/ventasPrograma'));
const VentasAsesor = lazy(() => import('../pages/pagePT/reportes/ventasAsesor'));
const GestionProveedores = lazy(() => import('../pages/pagePT/GestProveedores'));
const GestionProductos = lazy(() => import('../pages/pagePT/GestProductos'));
const GestionProgramas = lazy(() => import('../pages/pagePT/GestProgramas'));
const GestionFyG = lazy(() => import('../pages/pagePT/GestGastos'));
const OrdenCompra = lazy(() => import('../pages/pagePT/GestGastos/ordenCompra'));
const GestionEmpleados = lazy(() => import('../pages/pagePT/GestEmpleados'));
const GestionUsuario = lazy(() => import('../pages/pagePT/GestAuthUser'));
const PerfilCliente = lazy(() => import('../pages/pagePT/PerfilCliente'));
const GestionClientes = lazy(()=> import('../pages/pagePT/GestClientes'))
const GestionMeta = lazy(()=> import('../pages/pagePT/GestBonosyMetas'))
const GestionDescuentos= lazy(()=> import('../pages/pagePT/GestDescuentos'))
const PerfilEmpleado = lazy(()=> import('../pages/pagePT/GestEmpleados/Perfil'))
const GestionVenta = lazy(() => import('../pages/pagePT/GestVentas'));
const GestionProspectos = lazy(()=> import('../pages/pagePT/GestProspectos'))
const GestionExtensionMembresia = lazy(()=> import('../pages/pagePT/GestExtensionMembresia'))
const GestionAuditoria = lazy(()=> import('../pages/pagePT/Auditoria'))
const GestionComision = lazy(()=> import('../pages/pagePT/GestComision'))
const ServNutricion = lazy(()=> import('../pages/pagePT/ServNutricion'))
const ReportePorProgramas = lazy(()=>import('../pages/pagePT/reportes/ventasPrograma'))
const ReporteTotalVentas = lazy(()=>import('../pages/pagePT/reportes/totalVentas'))
const ReporteVentasAsesor = lazy(()=>import('../pages/pagePT/reportes/ventasAsesor'))
const ReporteVentasporSemana = lazy(()=>import('../pages/pagePT/reportes/ventaPorSemana'))
const AportesIngresos = lazy(()=>import('../pages/pagePT/GestAportesIngresos'))
const Terminologias = lazy(()=>import('../pages/pagePT/Terminologias'))
const ReporteEgresos = lazy(()=>import('../pages/pagePT/reportes/reporteEgresos'))
const ReporteGerenciales = lazy(()=>import('../pages/pagePT/reportes/reporteGerenciales'))
const ReporteMetas = lazy(()=>import('../pages/pagePT/reportes/reporteMetas'))
const MarketingAgenda = lazy(()=>import('../pages/pagePT/GestMkt'))
const HistorialCitasNutricionista = lazy(()=>import('../pages/pagePT/HistorialCitasNutricionista'))
const GestionTipoCambio = lazy(()=>import('../pages/pagePT/GestTipoCambio'))
const GestContratosClientes = lazy(()=>import('../pages/pagePT/GestContratosCliente'))
const GestActasDeReunion = lazy(()=>import('../pages/pagePT/GestActasReunion'))
const ReporteComparativaDeVentasxDia = lazy(()=>import('../pages/pagePT/ReporteComparativoxDia'))
const ReporteFlujoCaja = lazy(()=>import('../pages/pagePT/FlujoCaja'))
const ReporteUtilidadProgramas = lazy(()=>import('../pages/pagePT/ReporteUtilidadPrograma'))
const GestProvAgente = lazy(()=>import('../pages/pagePT/GestProvAgentes'))
const PerfilProveedor = lazy(()=>import('../pages/pagePT/PerfilProveedor'))
const GestionInventario = lazy(()=>import('../pages/pagePT/GestInventario'))
const GestionInventarioProy = lazy(()=>import('../pages/pagePT/GestInventarioProy'))
const InventarioTotalizado = lazy(()=>import('../pages/pagePT/InventarioReporte'))
const EntradaInventario = lazy(()=>import('../pages/pagePT/EntradaInventario'))
const SalidaInventario = lazy(()=>import('../pages/pagePT/SalidaInventario'))
const RecursosHumanoReportes = lazy(()=>import('../pages/pagePT/RecursosHumanos'))
const ReportePorMarcacion = lazy(()=> import('../pages/pagePT/reportes/reporteCliente'))
const ReporteSeguimiento = lazy(()=>import('../pages/pagePT/reportes/reporteSeguimiento'))
const GestionComercial = lazy(()=>import('../pages/pagePT/GestComercial'))
const ResultadoChange = lazy(()=>import('../pages/pagePT/reportes/resultadoChange'))
const ReporteDeAsistenciaRH = lazy(()=> import('../pages/pagePT/reportes/reporteAsistenciaRH'));
const ReporteDeGestionComercial = lazy(()=>import('../pages/pagePT/reportes/reporteGestionComercial'))
const GestionJornada = lazy(()=>import('../pages/pagePT/GestJornada'))
const ResumenComparativo = lazy(()=>import('../pages/pagePT/reportes/resumenComparativo'))
const ClientesxVentasDeMembresia = lazy(()=>import('../pages/pagePT/MembresiaxCliente'))
const GestionCambioPrograma = lazy(()=>import('../pages/pagePT/GestionCambioPrograma'))
const ResumenComparativoAnual = lazy(()=>import('../pages/pagePT/reportes/resumenComparativoAnual'))
const SeguimientoxMesView = lazy(()=>import('../pages/pagePT/reportes/SeguimientoxMes'))
const ResumenDemograficoxPrograma = lazy(()=>import('../pages/pagePT/reportes/resumenDemograficoComparativo'))
const ViewAdquision = lazy(()=>import('../pages/pagePT/reportes/lineaMkt/adquision'))
const ViewRenovacion = lazy(()=>import('../pages/pagePT/reportes/lineaMkt/renovacion'))
const ViewReinscripcion = lazy(()=>import('../pages/pagePT/reportes/lineaMkt/reinscripcion'))
const CitasxNutricionista = lazy(()=>import('../pages/pagePT/reportes/citasxEstados'))
const GeneradorFechas = lazy(()=>import('../pages/pagePT/generadorFechas/GeneradorFechasInventario'))
const EntradaArticulosForm = lazy(()=>import('../pages/pagePT/EntradaInventarioForm'))
const TransferenciasArticulos = lazy(()=>import('../pages/pagePT/TransferenciaEmpresaInventario'))
const ArticulosNuevos = lazy(()=>import('../pages/pagePT/GestArticulosChorrillos'))
const ResumenEjecutivo = lazy(()=>import('../pages/pagePT/reportes/resumenEjecutivo/index.jsx'))
const DetalleComprobantes = lazy(()=>import('../pages/pagePT/reportes/detalleComprobantes/Index.jsx'))
const DetalleRangoFecha = lazy(()=>import('../pages/pagePT/reportes/detalleComprobantesRangoFecha/Index.jsx'))
const GestionComanda = lazy(()=>import('../pages/pagePT/GestionComandas'))
const VentaCanje = lazy(() => import('../pages/pagePT/ventaCanje'));

const ResumenVentaxDiaCalendario = lazy(()=>import('../pages/pagePT/reportes/ResumenVentasxDia/index.jsx'))
const AcumuladoAnualPorDiaCalendario = lazy(()=>import('../pages/pagePT/reportes/acumuladoAnualPorDiaCalendario/index.jsx'))
const VentasxDiaCalendario = lazy(()=>import('../pages/pagePT/reportes/ventasxDiaCalendario/index.jsx'))
/**
 * routes import
 */
const OtherPages = lazy(() => import('../pages/otherpages'));
const Error404Alt = lazy(() => import('../pages/otherpages/Error404Alt'));

export default function ProtectedRoutes() {
	const { settings } = useThemeContext();
	const Layout =
		settings.layout.type == ThemeSettings.layout.type.vertical
			? VerticalLayout
			: HorizontalLayout;
	const { status, checkAuthToken } = useAuthStore()
	// const {obtenerModulos} = useRoleStore()
	const { sections } = useSelector(e=>e.rutas)
	useEffect(() => {checkAuthToken()}, [])
	if (status === 'checking') {
		return(
			<div className='d-flex align-items-center justify-content-center' style={{height: '100vh'}}>
				<span className="loader"></span>
			</div>
		)
	}
	return (
	<ReactRoutes>
		{
			status  === 'authenticated' ? (
				<>
				<Route path="/*" element={<Layout />}>
				{/* /reporte-seguimiento  /facturacion-publicidad*/}
					{
						sections.find(e=>e.url==='/resumen-venta-x-dia-calendario')&&
                        <Route path='resumen-venta-x-dia-calendario' element={<VentasxDiaCalendario/>}/>
					}
					{
						sections.find(e=>e.url==='/acumulado-anual-x-dia-calendario')&&
                        <Route path='acumulado-anual-x-dia-calendario' element={<AcumuladoAnualPorDiaCalendario/>}/>
					}
					{
						sections.find(e=>e.url==='/resumen-ventas-x-dia-calendario')&&
                        <Route path='resumen-ventas-x-dia-calendario' element={<ResumenVentaxDiaCalendario/>}/>
					}
					{
						sections.find(e=>e.url==='/agregar-articulos-chorrillos')&&
                        <Route path='agregar-articulos-chorrillos' element={<ArticulosNuevos/>}/>
					}
					{
						sections.find(e=>e.url==='/transferencia-inventario')&&
                        <Route path='transferencia-inventario' element={<TransferenciasArticulos/>}/>
					}
					{
						sections.find(e=>e.url==='/generador-fechas-inventario')&&
                        <Route path='generador-fechas-inventario' element={<EntradaArticulosForm/>}/>
					}
					{
						sections.find(e=>e.url==='/citas-x-nutricionista')&&
                        <Route path='citas-x-nutricionista' element={<CitasxNutricionista/>}/>
					}
					{
						sections.find(e=>e.url==='/mkt-adquisicion')&&
                        <Route path='mkt-adquisicion' element={<ViewAdquision/>}/>
					}
					{
						sections.find(e=>e.url==='/mkt-renovacion')&&
                        <Route path='mkt-renovacion' element={<ViewRenovacion/>}/>
					}
					{
						sections.find(e=>e.url==='/mkt-reinscripcion')&&
                        <Route path='mkt-reinscripcion' element={<ViewReinscripcion/>}/>
					}
					{
						sections.find(e=>e.url==='/resultados-change')&&
                        <Route path='resultados-change' element={<ResultadoChange/>}/>
					}
					{/* {
						sections.find(e=>e.url==='/facturacion-publicidad')&&
                        <Route path='facturacion-publicidad' element={<ReporteSesionesxMem/>}/>
					} */}
					{
						sections.find(e=>e.url==='/reporte/seguimiento-x-mes')&&
                        <Route path='reporte/seguimiento-x-mes' element={<SeguimientoxMesView/>}/>
					}
					{
						sections.find(e=>e.url==='/ventas-transferencias')&&
                        <Route path='ventas-transferencias' element={<ResumenComparativoAnual/>}/>
					}
					{
						sections.find(e=>e.url==='/reporte')&&
                        <Route path='reporte/reporte-demografico-membresia' element={<ResumenDemograficoxPrograma/>}/>
					}
					{/* {
						sections.find(e=>e.url==='/reporte')&&
                        <Route path='reporte/reporte-demografico' element={<ReporteDemograficoCliente/>}/>
					} */}
					{
						sections.find(e=>e.url==='/reporte/comparativo-resumen-x-mes')&& //asdf
                        <Route path='reporte/comparativo-resumen-x-mes' element={<ResumenComparativoAnual/>}/>
					}
					{
                        sections.find(e=>e.url==='/reporte/gestion-comercial') && 
                        <Route path='reporte/gestion-comercial' element={<ReporteDeGestionComercial/>}/>
                    }
					{
                        sections.find(e=>e.url==='/gest-jornada') && 
                        <Route path='gest-jornada' element={<GestionJornada/>}/>
                    }
					{
                        sections.find(e=>e.url==='/totalizado-inventario') && 
                        <Route path='totalizado-inventario' element={<InventarioTotalizado/>}/>
                    }
					{
                        sections.find(e=>e.url==='/entrada-inventario') && 
                        <Route path='entrada-inventario' element={<EntradaInventario/>}/>
                    }
					{
                        sections.find(e=>e.url==='/salida-inventario') && 
                        <Route path='salida-inventario' element={<SalidaInventario/>}/>
                    }
					{
                        sections.find(e=>e.url==='/reporte-admin/asistenciaReporte') && 
                        <Route path='reporte-admin/asistenciaReporte' element={<ReporteDeAsistenciaRH/>}/>
                    }
					{
                        sections.find(e=>e.url==='/gestion-comercial') && 
                        <Route path='gestion-comercial' element={<GestionComercial/>}/>
                    }
					{
                        sections.find(e=>e.url==='/gestion-cambio-programa') && 
                        <Route path='gestion-cambio-programa' element={<GestionCambioPrograma/>}/>
                    }
					{
                        sections.find(e=>e.url==='/reporte/reporte-seguimiento') && 
                        <Route path='reporte/reporte-seguimiento' element={<ReporteSeguimiento/>}/>
                    }
					{
						sections.find(e=>e.url==='/proveedores/prov-agentes') && 
						<Route path='proveedores/prov-agentes' element={<GestProvAgente/>}/>
					}
					
					{
						sections.find(e=>e.url==='/gest-inventario-circus') && 
						<Route path='gest-inventario-circus' element={<GestionInventarioProy/>}/>
					}
					{
						sections.find(e=>e.url==='/gest-inventario') && 
						<Route path='gest-inventario' element={<GestionInventario/>}/>
					}
					{
						sections.find(e=>e.url==='/reporte-admin/flujo-caja') && 
						<Route path='reporte-admin/flujo-caja' element={<ReporteFlujoCaja/>}/>
					}
					{
						sections.find(e=>e.url==='/reporte-admin/comparativa-dia') && 
						<Route path='reporte-admin/comparativa-dia' element={<ReporteComparativaDeVentasxDia/>}/>
					}
					{sections.find(e=>e.url==='/nueva-venta')&&
						<Route path="nueva-venta" element={<NuevaVenta />} />
					}
					{
						sections.find(e=>e.url==='/canje')&&
                        <Route path='canje' element={<VentaCanje/>}/>
					}
					{
						sections.find(e=>e.url==='/reporte/venta-por-semana')&&
                        <Route path='reporte/venta-por-semana' element={<ReporteVentasporSemana/>}/>
					}
					{sections.find(e=>e.url==='/mkt-actas-reunion')&&
						<Route path="mkt-actas-reunion" element={<GestActasDeReunion />} />
					}
					{sections.find(e=>e.url==='/seguimiento')&&
						<Route path="seguimiento" element={<Seguimiento />} />
					}
					{
						sections.find(e=>e.url==='/contrato-clientes')&&
						<Route path="contrato-clientes" element={<GestContratosClientes />} />
					}
					{
						sections.find(e=>e.url==='/reporte/total-ventas')&&
                        <Route path='reporte/total-ventas' element={<TotaldeVentas/>}/>
					}
					{
						sections.find(e=>e.url==='/reporte/ventas-programas')&&
                        <Route path='reporte/ventas-programas' element={<VentasPrograma/>}/>
					}
					{
						sections.find(e=>e.url==='/reporte/ventas-asesor')&&
                        <Route path='reporte/ventas-asesor' element={<VentasAsesor/>}/>
					}
					{
						sections.find(e=>e.url==='/gestion-proveedores')&&
						<>
							<Route path='gestion-proveedores' element={<GestionProveedores/>}/>
							<Route path='perfil-proveedor/:uid' element={<PerfilProveedor/>}/>
						</>
					}
					{
						sections.find(e=>e.url==='/gestion-productos')&&
                        <Route path='gestion-productos' element={<GestionProductos/>}/>
					}
					{
						sections.find(e=>e.url==='/gestion-programas')&&
                        <Route path='gestion-programas' element={<GestionProgramas/>}/>
					}
					{
						sections.find(e=>e.url==='/orden-compra')&&
                        <Route path='orden-compra' element={<OrdenCompra/>}/>
					}
					{
						sections.find(e=>e.url==='/gestion-gastosF-gastosV')&&
                        <Route path='gestion-gastosF-gastosV' element={<GestionFyG/>}/>
					}
					{
						sections.find(e=>e.url==='/gestion-empleados')&&
						<>
							<Route path='gestion-empleados' element={<GestionEmpleados/>}/>
							<Route path='perfil-colaborador/:uid' element={<PerfilEmpleado/>}/>
						</>
					}
					{
						sections.find(e=>e.url==='/crear-citas-nutricion')&&
                        <Route path='crear-citas-nutricion' element={<CrearCitasNutricion tipo_serv={'STLS'}/>}/>
					}
					{
						sections.find(e=>e.url==='/gestion-clientes')&&
						<>
							<Route path='gestion-clientes' element={<GestionClientes/>}/>
							<Route path='historial-cliente/:uid' element={<PerfilCliente/>}/>
						</>
					}
					{
						sections.find(e=>e.url==="/reporte-clientes-membresia")&&
							<Route path='reporte-clientes-membresia' element={<ClientesxVentasDeMembresia/>}/>
					}
					{
						sections.find(e=>e.url==='/gestion-ventas')&&
                        <Route path='gestion-ventas' element={<GestionVenta/>}/>
					}
					{
						sections.find(e=>e.url==='/resumen-ejecutivo')&&
                        <Route path='resumen-ejecutivo' element={<ResumenEjecutivo/>}/>
					}
					{
						sections.find(e=>e.url==='/detalle-comprobantes')&&
                        <Route path='detalle-comprobantes' element={<DetalleComprobantes/>}/>
					}
					{
						sections.find(e=>e.url==='/comprobantes-rango-fecha')&&
                        <Route path='comprobantes-rango-fecha' element={<DetalleRangoFecha/>}/>
					}
					{
						sections.find(e=>e.url==='/gestion-comandas')&&
                        <Route path='gestion-comandas' element={<GestionComanda/>}/>
					}
					{sections.find(e=>e.url==='/gestion-auth-usuario')&&
					<Route path='gestion-auth-usuario' element={<GestionUsuario/>}/>
					}
					{sections.find(e=>e.url==='/metas')&&
					<Route path='metas' element={<GestionMeta/>}/>
					}
					{
						sections.find(e=>e.url==='/gestion-prospecto') &&
						<Route path='gestion-prospecto' element={<GestionProspectos/>}/>
					}
					{
						sections.find(e=>e.url==='/extension-membresia') &&
						<Route path='extension-membresia' element={<GestionExtensionMembresia/>}/>
					}
					{
						sections.find(e=>e.url==='/auditoria') &&
						<Route path='auditoria' element={<GestionAuditoria/>}/>
					}
					{
						sections.find(e=>e.url==='/gestion-comisional') &&
						<Route path='gestion-comisional' element={<GestionComision/>}/>
					}
					{
						sections.find(e=>e.url==='/serv-fitology') &&
						<Route path='serv-fitology' element={<ServNutricion tipo_serv={'FITOL'}/>}/>
					}
					{
						sections.find(e=>e.url==='/serv-nutricion') &&
						<Route path='serv-nutricion' element={<ServNutricion tipo_serv={'NUTRI'}/>}/>
					}
					{
						sections.find(e=>e.url==='/reporte') && 
						<Route path='reporte/reporte-programa' element={<ReportePorProgramas/>}/>
					}
					{
						sections.find(e=>e.url==='/reporte') && 
						<Route path='reporte/reporte-metas' element={<ReporteMetas/>}/>
					}
					{
						sections.find(e=>e.url==='/reporte') && 
						<Route path='reporte/total-ventas' element={<ReporteTotalVentas/>}/>
					}
					{
						sections.find(e=>e.url==='/reporte') && 
						<Route path='reporte/total-ventas' element={<ReporteTotalVentas/>}/>
					}
					{
						sections.find(e=>e.url==='/reporte') && 
						<Route path='reporte/ventas-asesor' element={<ReporteVentasAsesor/>}/>
					}
					{
						sections.find(e=>e.url==='/reporte') && 
						<Route path='reporte/resumen-comparativo' element={<ResumenComparativo/>}/>
					}
					{
						sections.find(e=>e.url==='/reporte') &&
						<Route path='reporte/venta-semana' element={<ReporteVentasporSemana/>}/>
					}
					{
						sections.find(e=>e.url==='/aporte-ingresos') &&
						<Route path='aporte-ingresos' element={<AportesIngresos/>}/>
					}
					{
						sections.find(e=>e.url==='/configuracion-terminos') &&
						<Route path='configuracion-terminos' element={<Terminologias/>}/>
					}
					{
						sections.find(e=>e.url==='/reporte-admin/reporte-egresos') &&
						<Route path='reporte-admin/reporte-egresos' element={<ReporteEgresos/>}/>
					}
					
					{
						sections.find(e=>e.url==='/reporte-admin/reporte-utilidad-programa')&&
						<Route path="reporte-admin/reporte-utilidad-programa" element={<ReporteUtilidadProgramas />} />
					}
					{
						sections.find(e=>e.url==='/trabajo-marketing') &&
						<Route path='trabajo-marketing' element={<MarketingAgenda/>}/>
					}
					{
						sections.find(e=>e.url==='/reporte-admin/reporte-gerencial') &&
						<Route path='reporte-admin/reporte-gerencial' element={<ReporteGerenciales/>}/>
					}
					{
						sections.find(e=>e.url==='/history-citas-nutricion') &&
						<Route path='history-citas-nutricion' element={<HistorialCitasNutricionista/>}/>
					}
					{
						
						sections.find(e=>e.url==='/tipo-cambio') &&
						<Route path='tipo-cambio' element={<GestionTipoCambio/>}/>
					}
					{sections.find(e=>e.url==='/reporte-admin/RecursosHumanoReportes')&&
						<Route path="reporte-admin/RecursosHumanoReportes" element={<RecursosHumanoReportes />} />
					}
					{sections.find(e=>e.url==='/reporte-admin/ReportePorMarcacion')&&
						<Route path="reporte-admin/ReportePorMarcacion" element={<ReportePorMarcacion />} />
					}
					<Route path='programa/:uid' element={<PerfilPrograma/>}/>
					<Route path='gestion-descuentos' element={<GestionDescuentos/>}/>
					<Route path="pages/*" element={<OtherPages />} />
					<Route path='home' element={<Home/>}/>
					<Route path='*' element={<Navigate to={"/home"}/>}/>
				</Route>
				</>
		)
		: (
			<>
			<Route path="account/*" element={<Account />} />
			<Route path='/*' element={<Navigate to={"/account/login"}/>}/>
			</>
			// <Navigate to={"/account/login"} replace/>
			// <Navigate to="/account/login" replace />
		)
		}
		</ReactRoutes>

	)
}

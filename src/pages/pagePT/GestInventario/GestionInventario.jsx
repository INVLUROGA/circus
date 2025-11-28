import React, { useState, useEffect, useCallback } from 'react'
import { Card, Button, Spinner, Row, Col } from 'react-bootstrap'
import { TabView, TabPanel } from 'primereact/tabview'
import { Image } from 'primereact/image'
import { PageBreadcrumb } from '@/components'

// Componentes existentes
import { DataInventario } from './DataInventario'

// Componentes nuevos del CRUD
import { ModalProducto } from './components/ModalProducto' // Asegúrate de la ruta
import { productoApi } from './components/productoApis' // Asegúrate de la ruta

// Imágenes
import ImgproyCircus3 from '@/assets/images/pr_tercer_nivel.jpeg'
import ImgproyCircus2 from '@/assets/images/pr_segundo_nivel.jpeg'
import ImgproyCircus1 from '@/assets/images/pr_primer_nivel.png'

export const GestionInventario = () => {
    // --- ESTADOS PARA EL MAESTRO DE PRODUCTOS ---
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedProd, setSelectedProd] = useState(null);

    // --- LÓGICA DEL CRUD ---
    const fetchProductos = useCallback(async () => {
        setLoading(true);
        try {
            const data = await productoApi.list();
            // Ajusta según si tu API devuelve { productos: [] } o directamente []
            const lista = Array.isArray(data) ? data : (data.productos || []);
            setProductos(lista);
        } catch (error) {
            console.error("Error cargando productos master:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Cargar productos al montar (o al cambiar de tab si quisieras optimizar)
    useEffect(() => {
        fetchProductos();
    }, [fetchProductos]);

    const handleOpenCreate = () => {
        setSelectedProd(null);
        setShowModal(true);
    };

    const handleOpenEdit = (prod) => {
        setSelectedProd(prod);
        setShowModal(true);
    };

    const handleSaved = (msg) => {
        fetchProductos(); // Recargar la lista
    };

    const renderEstado = (estado) => (
        estado ? <span className="badge bg-success">Activo</span> : <span className="badge bg-danger">Inactivo</span>
    );

    return (
        <>
            <PageBreadcrumb title={'GESTION DE INVENTARIO'} subName={'T'} />
            
            <Card>
                <Card.Body>
                    <TabView>
                        {/* --- TAB 1: MAESTRO DE PRODUCTOS (NUEVO) --- */}
                        <TabPanel header="MAESTRO DE PRODUCTOS" leftIcon="pi pi-box mr-2">
                            <div className="mb-3 d-flex justify-content-between align-items-center">
                                <h5 className="text-uppercase text-primary">Catálogo Global de Productos</h5>
                                <Button variant="primary" onClick={handleOpenCreate}>
                                    <i className="mdi mdi-plus me-1"></i> Nuevo Producto
                                </Button>
                            </div>

                            {loading ? (
                                <div className="text-center py-5">
                                    <Spinner animation="border" variant="primary" />
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-centered table-nowrap table-hover mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Código</th>
                                                <th>Producto</th>
                                                <th>Marca / Categoría</th>
                                                <th>Stock Global</th>
                                                <th>Precio Venta</th>
                                                <th>Estado</th>
                                                <th className="text-end">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {productos.length > 0 ? (
                                                productos.map((p) => (
                                                    <tr key={p.id || p.uid}>
                                                        <td>
                                                            <strong className="d-block text-truncate" style={{maxWidth: '100px'}}>{p.codigo_producto || "-"}</strong>
                                                            <small className="text-muted">{p.codigo_lote}</small>
                                                        </td>
                                                        <td>
                                                            <span className="fw-bold">{p.nombre_producto}</span>
                                                            <br/>
                                                            <small className="text-muted">Vence: {p.fec_vencimiento ? new Date(p.fec_vencimiento).toLocaleDateString() : "-"}</small>
                                                        </td>
                                                        <td>
                                                            {p.parametro_marca?.label_param || "S/M"}
                                                            <br/>
                                                            <small className="text-muted">{p.parametro_categoria?.label_param || "-"}</small>
                                                        </td>
                                                        <td>
                                                            <span className={Number(p.stock_producto) <= Number(p.stock_minimo) ? "text-danger fw-bold" : ""}>
                                                                {p.stock_producto}
                                                            </span>
                                                        </td>
                                                        <td>S/ {Number(p.prec_venta).toFixed(2)}</td>
                                                        <td>{renderEstado(p.estado_product ?? p.estado)}</td>
                                                        <td className="text-end">
                                                            <Button size="sm" variant="light" className="text-primary" onClick={() => handleOpenEdit(p)}>
                                                                <i className="mdi mdi-pencil font-size-14"></i>
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="7" className="text-center text-muted py-4">No hay productos registrados en el maestro.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </TabPanel>

                        {/* --- TAB 2: INVENTARIO REAL (EXISTENTE) --- */}
                        <TabPanel header='REAL'>
                            <TabView>
                                <TabPanel header={<>CHANGE<br /> INVENTARIO TOTAL</>}>
                                    <DataInventario id_enterprice={598} id_zona={598} />
                                </TabPanel>
                                <TabPanel header={<>REDUCTO<br />INVENTARIO TOTAL</>}>
                                    <DataInventario id_enterprice={599} id_zona={599} />
                                </TabPanel>
                                <TabPanel header={<>PLANOS REDUCTO <br /> DEFENSA CIVIL</>}>
                                    <div className="text-center p-3">
                                        <Image src={ImgproyCircus3} className='rounded shadow-sm' indicatorIcon={<i className="pi pi-search"></i>} alt="Planos" preview width="500" />
                                    </div>
                                </TabPanel>
                                <TabPanel header={<>INVENTARIO SIN INCLUIR <br /> CIRCUS BUSSINESS</>}>
                                    <DataInventario id_enterprice={610} id_zona={599} />
                                </TabPanel>
                                <TabPanel header={<>CIRCUS<br /> BUSSINESS</>}>
                                    <DataInventario ImgproyCircus3={ImgproyCircus3} ImgproyCircus2={ImgproyCircus2} ImgproyCircus1={ImgproyCircus1} id_enterprice={602} id_zona={599} />
                                </TabPanel>
                                <TabPanel header={<>CHORRILLOS<br />ALMACEN</>}>
                                    <DataInventario id_enterprice={601} id_zona={601} />
                                </TabPanel>
                                <TabPanel header={<>MP<br />TARATA</>}>
                                    <DataInventario id_enterprice={600} id_zona={600} />
                                </TabPanel>
                            </TabView>
                        </TabPanel>

                        {/* --- TAB 3: BACKUP (EXISTENTE) --- */}
                        <TabPanel header='BACKUP'>
                            <TabView>
                                <TabPanel header={<>CHANGE<br /> INVENTARIO TOTAL</>}>
                                    <DataInventario id_enterprice={1598} id_zona={598} />
                                </TabPanel>
                                <TabPanel header={<>REDUCTO<br />INVENTARIO TOTAL</>}>
                                    <DataInventario id_enterprice={1599} id_zona={599} />
                                </TabPanel>
                                <TabPanel header={<>PLANOS REDUCTO <br /> DEFENSA CIVIL</>}>
                                    <div className="text-center p-3">
                                        <Image src={ImgproyCircus3} className='rounded shadow-sm' indicatorIcon={<i className="pi pi-search"></i>} alt="Planos" preview width="500" />
                                    </div>
                                </TabPanel>
                                <TabPanel header={<>INVENTARIO SIN INCLUIR <br /> CIRCUS BUSSINESS</>}>
                                    <DataInventario id_enterprice={1610} id_zona={599} />
                                </TabPanel>
                                <TabPanel header={<>CIRCUS<br /> BUSSINESS</>}>
                                    <DataInventario ImgproyCircus3={ImgproyCircus3} ImgproyCircus2={ImgproyCircus2} ImgproyCircus1={ImgproyCircus1} id_enterprice={1602} id_zona={599} />
                                </TabPanel>
                                <TabPanel header={<>CHORRILLOS<br />ALMACEN</>}>
                                    <DataInventario id_enterprice={1601} id_zona={601} />
                                </TabPanel>
                                <TabPanel header={<>MP<br />TARATA</>}>
                                    <DataInventario id_enterprice={1600} id_zona={600} />
                                </TabPanel>
                            </TabView>
                        </TabPanel>
                    </TabView>
                </Card.Body>
            </Card>

            {/* Modal fuera de los Tabs para evitar problemas de z-index */}
            {showModal && (
                <ModalProducto
                    show={showModal}
                    onHide={() => setShowModal(false)}
                    initial={selectedProd}
                    onSaved={handleSaved}
                    idEmpresa={1} // Asigna dinámicamente si es necesario
                />
            )}
        </>
    )
}
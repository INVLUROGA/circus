import React, { useEffect, useState } from "react";
import { Button, Card, Table, Container, Badge } from "react-bootstrap";
import { ModalProducto } from "./ModalProducto"; 
import Swal from "sweetalert2";
import PTApi from '@/common/api/PTApi'; 

const productoApi = {
  getAll: async () => {
    const { data } = await PTApi.get('/producto/get-tb-productos');
    return data;
  },
  create: async (payload) => {
    const { data } = await PTApi.post('/producto/post-producto', payload);
    return data;
  },
  update: async (id, payload) => {
    const { data } = await PTApi.put(`/producto/put-producto/${id}`, payload);
    return data;
  },
  delete: async (id) => {
    const { data } = await PTApi.put(`/producto/delete-producto/${id}`);
    return data;
  },
  
  searchMarcas: async ({ term, page }) => {
    try {
        const { data } = await PTApi.get(`/parametros/get_params/articulo/marca`);
        
        const rawData = Array.isArray(data) ? data : (data?.rows || []);
        const options = rawData.map(item => ({
            value: item.id_param || item.id || item.value, 
            label: item.label_param || item.nombre || item.descripcion || item.label
        }));

        const filtered = term 
            ? options.filter(i => i.label.toLowerCase().includes(term.toLowerCase()))
            : options;

        return { rows: filtered, hasMore: false };
    } catch (e) {
        console.warn("Error cargando marcas", e);
        return { rows: [], hasMore: false };
    }
  },

 searchCategorias: async ({ term, page }) => {
    try {
        const { data } = await PTApi.get(`/parametros/get_params/producto/categoria`);
        
        const rawData = Array.isArray(data) ? data : (data?.rows || []);
        
        const options = rawData.map(item => ({
            value: item.id_param || item.id || item.value,
            label: item.label_param || item.nombre || item.descripcion || item.label || "Sin nombre"
        }));

        // Filtro local
        const filtered = term 
            ? options.filter(i => i.label.toLowerCase().includes(term.toLowerCase()))
            : options;

        return { rows: filtered, hasMore: false };
    } catch (e) {
        console.warn("Error cargando categorías, intentando ruta alternativa...", e);
        return { rows: [], hasMore: false };
    }
  }
};

export const ProductosPage = () => {
  const [productos, setProductos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedProd, setSelectedProd] = useState(null);
  const [loading, setLoading] = useState(false);
  const ID_EMPRESA = 599; //

  const fetchProductos = async () => {
    setLoading(true);
    try {
      const resp = await productoApi.getAll();
      if (resp.producto) setProductos(resp.producto);
    } catch (error) {
      console.error("Error cargando productos", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProductos(); }, []);

  const handleCreate = () => { setSelectedProd(null); setShowModal(true); };
  const handleEdit = (prod) => { setSelectedProd(prod); setShowModal(true); };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Eliminar?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar'
    });
    if (result.isConfirmed) {
      try {
        await productoApi.delete(id);
        Swal.fire('Eliminado!', '', 'success');
        fetchProductos();
      } catch (error) { Swal.fire('Error', 'No se pudo eliminar', 'error'); }
    }
  };

  const handleSaved = (msg) => { Swal.fire('Éxito', msg, 'success'); fetchProductos(); };

  return (
    <Container fluid className="mt-4">
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Inventario de Productos</h4>
          <Button variant="primary" onClick={handleCreate}>+ Nuevo Producto</Button>
        </Card.Header>
        <Card.Body>
          <Table striped bordered hover responsive>
            <thead className="bg-light">
              <tr>
                <th>Nombre</th><th>Stock</th><th>P. Compra</th><th>P. Venta</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (<tr><td colSpan="6" className="text-center">Cargando...</td></tr>) : 
               productos.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="fw-bold">{p.nombre_producto}</div>
                    <small className="text-muted">{p.codigo_producto}</small>
                  </td>
                  <td>{p.stock_producto}</td>
                  <td>{p.prec_compra}</td>
                  <td>{p.prec_venta}</td>
                  <td><Badge bg={p.estado ? "success" : "danger"}>{p.estado ? "Activo" : "Inactivo"}</Badge></td>
                  <td>
                    <Button variant="outline-warning" size="sm" className="me-2" onClick={() => handleEdit(p)}><i className="uil uil-pen"></i></Button>
                    <Button variant="outline-danger" size="sm" onClick={() => handleDelete(p.id)}><i className="uil uil-trash-alt"></i></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
      <ModalProducto
        show={showModal}
        onHide={() => setShowModal(false)}
        initial={selectedProd}
        onSaved={handleSaved}
        idEmpresa={ID_EMPRESA}
        api={productoApi}
      />
    </Container>
  );
};
export default ProductosPage;
import React, { useEffect, useState } from "react";
import { Button, Col, Modal, Row, Spinner, Form } from "react-bootstrap";
import Select from "react-select";

const initialForm = {
  id_marca: null,
  id_categoria: null,
  nombre_producto: "",
  prec_venta: "",
  prec_compra: "",
  stock_producto: "",
  stock_minimo: "",
  codigo_producto: "",
  codigo_lote: "",
  codigo_contable: "",
  fec_vencimiento: "",
  ubicacion_producto: "",
  estado_product: true,
};

export function ModalProducto({ show, onHide, initial, onSaved, idEmpresa, api }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  // Listas de opciones cargadas desde la API
  const [listaMarcas, setListaMarcas] = useState([]);
  const [listaCategorias, setListaCategorias] = useState([]);

  // Valores seleccionados en los Selects
  const [selMarca, setSelMarca] = useState(null);
  const [selCategoria, setSelCategoria] = useState(null);

  useEffect(() => {
    if (show) {
      cargarListas();
    }
  }, [show]);

  const cargarListas = async () => {
    try {

      const resMarcas = await api.searchMarcas({ term: "", page: 1 });
      const resCats = await api.searchCategorias({ term: "", page: 1 });
      
      setListaMarcas(resMarcas.rows || []);
      setListaCategorias(resCats.rows || []);
    } catch (error) {
      console.error("Error cargando listas", error);
    }
  };

  // 2. Mapear datos al editar o limpiar al crear
  useEffect(() => {
    if (initial) {
      const formatDate = (date) => (date ? new Date(date).toISOString().split("T")[0] : "");
      
      setForm({
        ...initial,
        prec_venta: initial.prec_venta || "",
        prec_compra: initial.prec_compra || "",
        fec_vencimiento: formatDate(initial.fec_vencimiento),
      });

      // Intentamos encontrar la marca/categoría en las listas cargadas, o creamos objeto temporal
      // Nota: Si la lista aún no cargó, esto podría fallar visualmente al inicio, 
      // pero al cargar las listas react-select suele emparejar por value si la referencia es correcta.
      // Aquí forzamos un objeto {value, label} básico si tenemos el ID.
      setSelMarca(initial.id_marca ? { value: initial.id_marca, label: `Marca ${initial.id_marca}` } : null);
      setSelCategoria(initial.id_categoria ? { value: initial.id_categoria, label: `Cat ${initial.id_categoria}` } : null);

    } else {
      setForm(initialForm);
      setSelMarca(null);
      setSelCategoria(null);
    }
  }, [initial, show]);

  // Si las listas cargan DESPUÉS de que se seteó el initial, actualizamos los labels bonitos
  useEffect(() => {
    if (initial && listaMarcas.length > 0) {
      const found = listaMarcas.find(m => m.value === initial.id_marca);
      if (found) setSelMarca(found);
    }
    if (initial && listaCategorias.length > 0) {
      const found = listaCategorias.find(c => c.value === initial.id_categoria);
      if (found) setSelCategoria(found);
    }
  }, [listaMarcas, listaCategorias, initial]);


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const cleanNumber = (val) => val === "" ? null : val;

      const payload = {
        ...form,
        id_empresa: idEmpresa,
        id_marca: selMarca?.value || null,
        id_categoria: selCategoria?.value || null,
        stock_producto: cleanNumber(form.stock_producto),
        stock_minimo: cleanNumber(form.stock_minimo),
        // Limpiamos campos técnicos
        id: undefined, uid: undefined, createdAt: undefined, updatedAt: undefined
      };

      console.log("Enviando Payload:", payload);

      if (initial?.id) {
        await api.update(initial.id, payload);
      } else {
        await api.create(payload);
      }

      onSaved(initial ? "Producto actualizado" : "Producto creado");
      onHide();
    } catch (error) {
      console.error("Error submit:", error);
      const msg = error.response?.data?.msg || "Error al guardar";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const customStyles = {
    control: (base) => ({
      ...base,
      minHeight: '38px',
      borderColor: '#dee2e6',
    })
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered backdrop="static">
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title>{initial ? "ACTUALIZAR ARTÍCULO" : "REGISTRAR ARTÍCULO"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          {/* SECCIÓN 1 */}
          <h5 className="mb-3 text-muted border-bottom pb-2">Datos Generales</h5>
          <Row className="g-3 mb-3">
            <Col lg={6}>
              <Form.Label>Nombre del Producto *</Form.Label>
              <Form.Control
                required
                name="nombre_producto"
                value={form.nombre_producto}
                onChange={handleChange}
                placeholder="Ej. Shampoo Keratina 1L"
              />
            </Col>
            
            <Col lg={3}>
              <Form.Label>Marca</Form.Label>
              <Select
                value={selMarca}
                onChange={setSelMarca}
                options={listaMarcas}
                placeholder="Buscar Marca..."
                isClearable
                styles={customStyles}
                noOptionsMessage={() => "Sin resultados"}
              />
            </Col>

            <Col lg={3}>
              <Form.Label>Categoría</Form.Label>
              <Select
                value={selCategoria}
                onChange={setSelCategoria}
                options={listaCategorias}
                placeholder="Buscar Categoría..."
                isClearable
                styles={customStyles}
                noOptionsMessage={() => "Sin resultados"}
              />
            </Col>
          </Row>

          {/* SECCIÓN 2 */}
          <h5 className="mb-3 text-muted border-bottom pb-2 mt-4">Precios e Inventario</h5>
          <Row className="g-3 mb-3">
            <Col lg={3}>
              <Form.Label>Precio Compra</Form.Label>
              <Form.Control
                type="number" step="0.01"
                name="prec_compra"
                value={form.prec_compra}
                onChange={handleChange}
              />
            </Col>
            <Col lg={3}>
              <Form.Label>Precio Venta *</Form.Label>
              <Form.Control
                required
                type="number" step="0.01"
                name="prec_venta"
                value={form.prec_venta}
                onChange={handleChange}
              />
            </Col>
            <Col lg={3}>
              <Form.Label>Stock Actual</Form.Label>
              <Form.Control
                type="number"
                name="stock_producto"
                value={form.stock_producto}
                onChange={handleChange}
              />
            </Col>
            <Col lg={3}>
              <Form.Label>Stock Mínimo</Form.Label>
              <Form.Control
                type="number"
                name="stock_minimo"
                value={form.stock_minimo}
                onChange={handleChange}
              />
            </Col>
          </Row>

          {/* SECCIÓN 3 */}
          <h5 className="mb-3 text-muted border-bottom pb-2 mt-4">Logística</h5>
          <Row className="g-3 mb-3">
            <Col lg={3}>
              <Form.Label>Cód. Producto</Form.Label>
              <Form.Control name="codigo_producto" value={form.codigo_producto} onChange={handleChange} />
            </Col>
            <Col lg={3}>
              <Form.Label>Cód. Lote</Form.Label>
              <Form.Control name="codigo_lote" value={form.codigo_lote} onChange={handleChange} />
            </Col>
            <Col lg={3}>
              <Form.Label>Cód. Contable</Form.Label>
              <Form.Control name="codigo_contable" value={form.codigo_contable} onChange={handleChange} />
            </Col>
            <Col lg={3}>
              <Form.Label>Fec. Vencimiento</Form.Label>
              <Form.Control type="date" name="fec_vencimiento" value={form.fec_vencimiento} onChange={handleChange} />
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col lg={8}>
              <Form.Label>Ubicación Física</Form.Label>
              <Form.Control 
                name="ubicacion_producto" 
                value={form.ubicacion_producto} 
                onChange={handleChange} 
                placeholder="Pasillo, Estante, etc."
              />
            </Col>
            <Col lg={4} className="d-flex align-items-center justify-content-center">
              <Form.Check
                type="switch"
                id="estado-switch"
                label={form.estado_product ? "ACTIVO" : "INACTIVO"}
                checked={form.estado_product}
                onChange={(e) => setForm(f => ({ ...f, estado_product: e.target.checked }))}
                className="fs-5"
              />
            </Col>
          </Row>

          <Modal.Footer className="border-0 pt-4">
            <Button variant="outline-danger" onClick={onHide} disabled={saving} className="me-2">
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Guardando...
                </>
              ) : (
                "Guardar Producto"
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
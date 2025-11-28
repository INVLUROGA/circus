import React, { useEffect, useState } from "react";
import { Button, Col, Modal, Row, Spinner, Form } from "react-bootstrap";
import { AsyncPaginate } from "react-select-async-paginate";
import { productoApi } from "@/api/productoApi"; // Importa el archivo creado arriba

const initialForm = {
  id_marca: null,
  id_categoria: null,
  id_presentacion: null, // Si tienes select para esto, agrégalo similar a marca
  id_prov: null,
  codigo_lote: "",
  codigo_producto: "",
  codigo_contable: "",
  nombre_producto: "",
  prec_venta: "",
  prec_compra: "",
  stock_minimo: "",
  stock_producto: "",
  ubicacion_producto: "",
  fec_vencimiento: "",
  estado_product: true,
};

export function ModalProducto({ show, onHide, initial, onSaved, idEmpresa }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  // Estados para los Selects (AsyncPaginate requiere objeto {value, label})
  const [selMarca, setSelMarca] = useState(null);
  const [selCategoria, setSelCategoria] = useState(null);

  useEffect(() => {
    if (initial) {
      // Mapear datos al editar
      const formatDate = (date) => (date ? new Date(date).toISOString().split("T")[0] : "");
      
      setForm({
        ...initial,
        prec_venta: initial.prec_venta || "",
        prec_compra: initial.prec_compra || "",
        fec_vencimiento: formatDate(initial.fec_vencimiento),
      });

      // AQUÍ DEBERÍAS SETEAR LOS SELECTS SI EL BACKEND DEVUELVE EL NOMBRE DE LA MARCA
      // Ejemplo: if(initial.marca) setSelMarca({ value: initial.id_marca, label: initial.marca.nombre })
      // Por ahora limpiamos o mantenemos id si no hay objeto anidado
      setSelMarca(initial.id_marca ? { value: initial.id_marca, label: `Marca ${initial.id_marca}` } : null);
      setSelCategoria(initial.id_categoria ? { value: initial.id_categoria, label: `Cat ${initial.id_categoria}` } : null);

    } else {
      // Resetear al crear nuevo
      setForm(initialForm);
      setSelMarca(null);
      setSelCategoria(null);
    }
  }, [initial, show]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Carga de Opciones (Simulada, conecta con tus APIs reales)
  const loadMarcas = async (search, prevOptions, { page }) => {
    const { rows, hasMore } = await productoApi.searchMarcas({ term: search, page: page || 1 });
    return {
      options: rows,
      hasMore,
      additional: { page: (page || 1) + 1 },
    };
  };

  const loadCategorias = async (search, prevOptions, { page }) => {
    const { rows, hasMore } = await productoApi.searchCategorias({ term: search, page: page || 1 });
    return {
      options: rows,
      hasMore,
      additional: { page: (page || 1) + 1 },
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        id_empresa: idEmpresa, // Se pasa desde las props o contexto
        id_marca: selMarca?.value || null,
        id_categoria: selCategoria?.value || null,
        prec_venta: form.prec_venta, // Se enviará como string y el backend usa eliminarCaracter
        prec_compra: form.prec_compra,
      };

      if (initial?.id) {
        await productoApi.update(initial.id, payload);
      } else {
        await productoApi.create(payload);
      }

      onSaved(initial ? "Producto actualizado" : "Producto creado");
      onHide();
    } catch (error) {
      console.error("Error submit producto:", error);
      // Aquí podrías mostrar un Toast o alerta
      alert("Error al guardar el producto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>{initial ? "Editar Producto" : "Nuevo Producto"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          {/* Fila 1: Datos Principales */}
          <Row className="g-3 mb-3">
            <Col md={6}>
              <Form.Label>Nombre del Producto *</Form.Label>
              <Form.Control
                required
                name="nombre_producto"
                value={form.nombre_producto}
                onChange={handleChange}
                placeholder="Ej. Aceite Premium 1L"
              />
            </Col>
            <Col md={3}>
              <Form.Label>Marca</Form.Label>
              <AsyncPaginate
                value={selMarca}
                loadOptions={loadMarcas}
                onChange={setSelMarca}
                placeholder="Buscar Marca..."
                isClearable
                additional={{ page: 1 }}
              />
            </Col>
            <Col md={3}>
              <Form.Label>Categoría</Form.Label>
              <AsyncPaginate
                value={selCategoria}
                loadOptions={loadCategorias}
                onChange={setSelCategoria}
                placeholder="Buscar Categoría..."
                isClearable
                additional={{ page: 1 }}
              />
            </Col>
          </Row>

          {/* Fila 2: Precios y Stock */}
          <Row className="g-3 mb-3">
            <Col md={3}>
              <Form.Label>Precio Compra</Form.Label>
              <Form.Control
                type="text" // Usamos text para permitir comas si el usuario las escribe, backend limpia
                name="prec_compra"
                value={form.prec_compra}
                onChange={handleChange}
                placeholder="0.00"
              />
            </Col>
            <Col md={3}>
              <Form.Label>Precio Venta *</Form.Label>
              <Form.Control
                required
                type="text"
                name="prec_venta"
                value={form.prec_venta}
                onChange={handleChange}
                placeholder="0.00"
              />
            </Col>
            <Col md={3}>
              <Form.Label>Stock Actual</Form.Label>
              <Form.Control
                type="number"
                name="stock_producto"
                value={form.stock_producto}
                onChange={handleChange}
              />
            </Col>
            <Col md={3}>
              <Form.Label>Stock Mínimo</Form.Label>
              <Form.Control
                type="number"
                name="stock_minimo"
                value={form.stock_minimo}
                onChange={handleChange}
              />
            </Col>
          </Row>

          {/* Fila 3: Códigos y Logística */}
          <Row className="g-3 mb-3">
            <Col md={3}>
              <Form.Label>Cód. Producto</Form.Label>
              <Form.Control
                name="codigo_producto"
                value={form.codigo_producto}
                onChange={handleChange}
              />
            </Col>
            <Col md={3}>
              <Form.Label>Cód. Lote</Form.Label>
              <Form.Control
                name="codigo_lote"
                value={form.codigo_lote}
                onChange={handleChange}
              />
            </Col>
            <Col md={3}>
              <Form.Label>Cód. Contable</Form.Label>
              <Form.Control
                name="codigo_contable"
                value={form.codigo_contable}
                onChange={handleChange}
              />
            </Col>
            <Col md={3}>
              <Form.Label>Fec. Vencimiento</Form.Label>
              <Form.Control
                type="date"
                name="fec_vencimiento"
                value={form.fec_vencimiento}
                onChange={handleChange}
              />
            </Col>
          </Row>

          {/* Fila 4: Extras */}
          <Row className="g-3 mb-3">
            <Col md={6}>
              <Form.Label>Ubicación Física</Form.Label>
              <Form.Control
                name="ubicacion_producto"
                value={form.ubicacion_producto}
                onChange={handleChange}
                placeholder="Pasillo 4, Estante B"
              />
            </Col>
            <Col md={6} className="d-flex align-items-center mt-4">
              <Form.Check
                type="switch"
                id="estado-switch"
                label={form.estado_product ? "Producto Activo" : "Producto Inactivo"}
                checked={form.estado_product}
                onChange={(e) => setForm(f => ({ ...f, estado_product: e.target.checked }))}
              />
            </Col>
          </Row>

          {/* Botones */}
          <div className="d-flex justify-content-end gap-2 mt-4 border-top pt-3">
            <Button variant="secondary" onClick={onHide} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Guardando...
                </>
              ) : (
                "Guardar Datos"
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
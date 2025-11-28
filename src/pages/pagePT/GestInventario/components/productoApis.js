import PTApi from "@/api/PTApi"; // Importación ajustada a tu estructura src/api/PTApi.js

export const productoApi = {
  // Listar tabla
  list: async () => {
    try {
      // La ruta según tu router es /get-tb-productos
      const { data } = await PTApi.get("/api/producto/get-tb-productos");
      return data.producto || []; 
    } catch (error) {
      console.error("Error en productoApi.list:", error);
      throw error;
    }
  },

  // Obtener uno por ID
  getById: async (id) => {
    try {
      const { data } = await PTApi.get(`/api/producto/get-producto/${id}`);
      return data.producto;
    } catch (error) {
      console.error("Error en productoApi.getById:", error);
      throw error;
    }
  },

  // Crear
  create: async (payload) => {
    try {
      // La ruta según tu router es /post-producto
      return await PTApi.post("/api/producto/post-producto", payload);
    } catch (error) {
      console.error("Error en productoApi.create:", error);
      throw error;
    }
  },

  // Actualizar
  update: async (id, payload) => {
    try {
      // La ruta según tu router es /put-producto/:id
      return await PTApi.put(`/api/producto/put-producto/${id}`, payload);
    } catch (error) {
      console.error("Error en productoApi.update:", error);
      throw error;
    }
  },

  // Eliminar (Soft Delete)
  delete: async (id) => {
    try {
      // Es PUT según tus rutas para borrado lógico
      return await PTApi.put(`/api/producto/delete-producto/${id}`); 
    } catch (error) {
      console.error("Error en productoApi.delete:", error);
      throw error;
    }
  },

  /* MOCKS: DEBES REEMPLAZAR ESTO CON TUS API DE MARCAS/CATEGORIAS */
  searchMarcas: async ({ term, page }) => {
    // Ejemplo real: return await PTApi.get('/api/marcas/search', { params: { term, page }});
    return { rows: [{ value: 1, label: "Marca Demo" }], hasMore: false };
  },

  searchCategorias: async ({ term, page }) => {
    // Ejemplo real: return await PTApi.get('/api/categorias/search', { params: { term, page }});
    return { rows: [{ value: 1, label: "Categoría Demo" }], hasMore: false };
  },
};
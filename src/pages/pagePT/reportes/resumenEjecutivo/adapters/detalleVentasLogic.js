
export const round2 = (x) =>
  Math.round((Number(x) + Number.EPSILON) * 100) / 100;

// Etiqueta de porcentaje
export const pctLabel = (v) => `${(v * 100).toFixed(2)}%`;


export function buildResumenServicios({
  modalResumen,
  totalCostoServicios,
  rateIgv,
  rateRenta,
  rateTarjeta,
  rateComisionEstilista,
}) {
  const bruto = Number(modalResumen?.bruto || 0);
  const costoTotal = Number(totalCostoServicios || 0);

  const baseImponible = round2(bruto / 1.18);
  const igvMonto = round2(bruto - baseImponible);
  const tarjetaMonto = round2(bruto * rateTarjeta);
  const rentaMonto = round2(baseImponible * rateRenta);

  const netoParaComision = round2(
    bruto - igvMonto - tarjetaMonto - rentaMonto-costoTotal   
  );

  const netoAntesComision = round2(
    bruto - igvMonto - tarjetaMonto - rentaMonto - costoTotal
  );

  const comisionEstilistaMonto = round2(
    netoParaComision * rateComisionEstilista
  );

  const ingresoNeto = round2(netoAntesComision - comisionEstilistaMonto);

  return {
    bruto,
    costoTotal,
    baseImponible,
    igvMonto,
    tarjetaMonto,
    rentaMonto,
    netoParaComision,
    netoAntesComision,
    comisionEstilistaMonto,
    ingresoNeto,
  };
}

/**
 * Totales de la sección DETALLE DE SERVICIOS
 * (fila TOTAL SERVICIOS con ajuste de delta al primer método)
 */
export function buildServicioTotals(modalData) {
  const servicios = modalData.serviciosOrdenados || [];
  const methods = modalData.methodsToShow || [];

  const totalPVentaServs = round2(
    servicios.reduce(
      (acc, s) =>
        acc +
        (Number(s.pVenta) || 0) * (Number(s.cantidad) || 0),
      0
    )
  );

  const totalsByMethod = methods.reduce((acc, m) => {
    acc[m] = round2(
      servicios.reduce(
        (sum, s) => sum + (Number(s[m]) || 0),
        0
      )
    );
    return acc;
  }, {});

  let sumMethods = round2(
    methods.reduce((a, m) => a + (totalsByMethod[m] || 0), 0)
  );
  let delta = round2(totalPVentaServs - sumMethods);

  if (Math.abs(delta) >= 0.01 && methods[0]) {
    const first = methods[0];
    totalsByMethod[first] = round2((totalsByMethod[first] || 0) + delta);
  }

  return { totalPVentaServs, totalsByMethod };
}

/**
 * Cálculos por producto (fila individual)
 */
export function calcProducto(p, { rateIgv, rateTarjeta, rateRenta, rateComision }) {
  const cantidad = p.cantidad || 0;
  const venta = (p.precioVentaU || 0) * cantidad;
  const compra = (p.precioCompraU || 0) * cantidad;
  const igv = venta * rateIgv;
  const tarjeta = venta * rateTarjeta;
  const renta = venta * rateRenta;
  const utilBase = venta - igv - tarjeta - renta - compra;
  const comision = utilBase * rateComision;
  const utilFinal = utilBase - comision;
  const utilPorProducto = cantidad > 0 ? utilFinal / cantidad : 0;

  return {
    cantidad,
    venta,
    compra,
    igv,
    tarjeta,
    renta,
    utilBase,
    comision,
    utilFinal,
    utilPorProducto,
  };
}


export function buildTotalesProductos(productosAgrupados, { rateIgv, rateTarjeta, rateRenta, rateComision }) {
  let totalCantidad = 0;
  let totalVenta = 0;
  let totalIGV = 0;
  let totalTarjeta = 0;
  let totalRenta = 0;
  let totalCompra = 0;
  let totalUtilBase = 0;
  let totalComision = 0;
  let totalUtilFinal = 0;

  (productosAgrupados || []).forEach((p) => {
    const {
      cantidad,
      venta,
      compra,
      igv,
      tarjeta,
      renta,
      utilBase,
      comision,
      utilFinal,
    } = calcProducto(p, { rateIgv, rateTarjeta, rateRenta, rateComision });

    totalCantidad += cantidad;
    totalVenta += venta;
    totalIGV += igv;
    totalTarjeta += tarjeta;
    totalRenta += renta;
    totalCompra += compra;
    totalUtilBase += utilBase;
    totalComision += comision;
    totalUtilFinal += utilFinal;
  });

  const utilPromedioProducto =
    totalCantidad > 0 ? totalUtilFinal / totalCantidad : 0;

  return {
    totalCantidad,
    totalVenta,
    totalIGV,
    totalTarjeta,
    totalRenta,
    totalCompra,
    totalUtilBase,
    totalComision,
    totalUtilFinal,
    utilPromedioProducto,
  };
}

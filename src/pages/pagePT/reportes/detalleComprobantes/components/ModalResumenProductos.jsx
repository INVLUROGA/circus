import React, { useState, useMemo } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles';
import { NumberFormatMoney } from '@/components/CurrencyMask';
// Ajusta la ruta de importación según donde tengas el reporteUtils
import { aggregateProductos, getTopVendedoresPorProducto, rankColaboradores, sortRows } from '../adapters/reporteUtils';

export const ModalResumenProductos = ({ show, onHide, label, productosRaw }) => {
  const [groupByProd, setGroupByProd] = useState('producto'); // 'producto' | 'producto-empleado'
  const [sortProdBy, setSortProdBy] = useState('total');
  const [sortProdDir, setSortProdDir] = useState('desc');

  const totalVendido = productosRaw.reduce((s, x) => s + Number(x?.tarifa_monto || 0), 0);

  const toggleSort = (by) => {
    setSortProdDir(prev => (sortProdBy === by ? (prev === 'asc' ? 'desc' : 'asc') : 'desc'));
    setSortProdBy(by);
  };

  // 1. Agregación Simple
  const itemsAgregados = useMemo(() => 
    aggregateProductos(productosRaw, groupByProd), 
  [productosRaw, groupByProd]);

  // 2. Ranking Top Vendedores por Producto
  const topVendedores = useMemo(() => 
    getTopVendedoresPorProducto(productosRaw), 
  [productosRaw]);

  // 3. Ranking General Colaboradores (Productos)
  const rankingBase = useMemo(() => rankColaboradores(
      productosRaw,
      (p) => p?.empleado_producto?.nombres_apellidos_empl,
      (p) => p?.tarifa_monto,
      (p) => p?.cantidad 
  ), [productosRaw]);

  const rankingProd = useMemo(() => 
    sortRows(rankingBase, sortProdBy, sortProdDir), 
  [rankingBase, sortProdBy, sortProdDir]);

  return (
    <Modal show={show} onHide={onHide} size="xl" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Resumen de productos — {label}</Modal.Title>
        <div className="ms-auto d-flex align-items-center me-4">
            <Form.Check 
               type="switch"
               id="switch-group-prod"
               label={groupByProd === 'producto' ? 'Agrupar: Producto' : 'Agrupar: Producto + Colaborador'}
               checked={groupByProd === 'producto'}
               onChange={(e) => setGroupByProd(e.target.checked ? 'producto' : 'producto-empleado')}
            />
        </div>
      </Modal.Header>

      <Modal.Body>
         <div className="d-flex justify-content-between align-items-center mb-4 bg-light p-3 rounded">
            <div className="h4 m-0">Cant. Productos: <strong>{productosRaw.length}</strong></div>
            <div className="h4 m-0">
               Total vendido: <strong><SymbolSoles size={20} bottomClasss={'8'} numero={<NumberFormatMoney amount={totalVendido} />} /></strong>
            </div>
         </div>

         {/* TABLA 1: LISTADO AGREGADO */}
         <div className="table-responsive mb-5 border rounded">
            <table className="table table-sm table-striped mb-0 align-middle">
               <thead className="table-dark">
                  <tr>
                     <th>#</th>
                     <th>Producto</th>
                     <th>Colaborador</th>
                     <th className="text-end">Cantidad</th>
                     <th className="text-end">Total</th>
                     <th className="text-end">Promedio</th>
                  </tr>
               </thead>
               <tbody>
                  {itemsAgregados.map((it, i) => (
                     <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{it.producto}</td>
                        <td>{it.empleado}</td>
                        <td className="text-end">{it.cantidad}</td>
                        <td className="text-end"><SymbolSoles size={14} bottomClasss={'4'} numero={<NumberFormatMoney amount={it.total} />} /></td>
                        <td className="text-end"><NumberFormatMoney amount={it.total / (it.cantidad||1)} /></td>
                     </tr>
                  ))}
                  {itemsAgregados.length === 0 && <tr><td colSpan={6} className="text-center p-3">Sin datos</td></tr>}
               </tbody>
            </table>
         </div>

         {/* TABLA 2: TOP VENDEDORES */}
         <h5 className="fw-bold text-primary">Top Vendedor por Producto</h5>
         <div className="table-responsive mb-5 border rounded">
            <table className="table table-sm table-hover mb-0 align-middle">
               <thead className="table-secondary">
                  <tr>
                     <th>#</th>
                     <th>Producto</th>
                     <th>Top Vendedor (Importe)</th>
                     <th className="text-end">Importe Top</th>
                     <th className="text-end">Unidades Top</th>
                     <th className="text-end">% del Prod.</th>
                  </tr>
               </thead>
               <tbody>
                  {topVendedores.map((row, i) => {
                     const pct = row.totalImporte > 0 ? (row.top.importe / row.totalImporte) * 100 : 0;
                     return (
                        <tr key={i}>
                           <td>{i + 1}</td>
                           <td>{row.producto}</td>
                           <td className="fw-bold">{row.top.empleado}</td>
                           <td className="text-end"><SymbolSoles size={14} bottomClasss={'4'} numero={<NumberFormatMoney amount={row.top.importe} />} /></td>
                           <td className="text-end">{row.top.unidades}</td>
                           <td className="text-end">{pct.toFixed(1)}%</td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>

         {/* TABLA 3: RANKING COLABORADORES */}
         <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="fw-bold text-primary m-0">Ranking Colaboradores (Productos)</h5>
            <div className="btn-group btn-group-sm">
               <Button variant={sortProdBy === 'total' ? 'primary' : 'outline-primary'} onClick={() => toggleSort('total')}>Monto</Button>
               <Button variant={sortProdBy === 'promedio' ? 'primary' : 'outline-primary'} onClick={() => toggleSort('promedio')}>Promedio</Button>
               <Button variant={sortProdBy === 'colaborador' ? 'primary' : 'outline-primary'} onClick={() => toggleSort('colaborador')}>Nombre</Button>
            </div>
         </div>
         <div className="table-responsive border rounded">
             <table className="table table-sm table-hover mb-0 align-middle">
                <thead className="table-primary">
                   <tr>
                      <th>#</th><th>Colaborador</th><th className="text-end">Monto</th><th className="text-end">Items</th><th className="text-end">Promedio</th>
                   </tr>
                </thead>
                <tbody>
                   {rankingProd.map((r, i) => (
                      <tr key={i}>
                         <td>{i + 1}</td>
                         <td className="fw-bold">{r.colaborador}</td>
                         <td className="text-end"><SymbolSoles size={14} bottomClasss={'4'} numero={<NumberFormatMoney amount={r.total} />} /></td>
                         <td className="text-end">{r.cantidad}</td>
                         <td className="text-end"><NumberFormatMoney amount={r.promedio} /></td>
                      </tr>
                   ))}
                </tbody>
             </table>
         </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cerrar</Button>
      </Modal.Footer>
    </Modal>
  );
};
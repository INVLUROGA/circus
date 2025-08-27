import React from 'react'

export const ModalReportePorComprobante = () => {
  return (
    <Modal
  show={showResumen}
  onHide={() => setShowResumen(false)}
  size="xl"
  centered
  scrollable
>
  <Modal.Header closeButton>
    <Modal.Title>Resumen de servicios — {resumenServicios.label}</Modal.Title>
  </Modal.Header>

  <Modal.Body>
    <div className="d-flex justify-content-between align-items-center mb-3">
      <div className="h4 m-0">
        Total servicios: <strong>{resumenServicios.cantidad}</strong>
      </div>
      <div className="h4 m-0">
        Total vendido:{' '}
        <strong>
          <SymbolSoles
            size={20}
            bottomClasss={'8'}
            numero={<NumberFormatMoney amount={resumenServicios.total} />}
          />
        </strong>
      </div>
    </div>

    <div className="table-responsive">
      <table className="table table-sm align-middle">
        <thead>
          <tr>
            <th>#</th>
            <th>Servicio</th>
            <th>Colaborador</th>
            <th className="text-end">Cantidad</th>
            <th className="text-end">Total</th>
            <th className="text-end">Promedio</th>
          </tr>
        </thead>
        <tbody>
          {resumenServicios.items.map((it, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{it.servicio}</td>
              <td>{it.empleado}</td>
              <td className="text-end">{it.cantidad}</td>
              <td className="text-end">
                <SymbolSoles
                  size={16}
                  bottomClasss={'6'}
                  numero={<NumberFormatMoney amount={it.total} />}
                />
              </td>
              <td className="text-end">
                <SymbolSoles
                  size={16}
                  bottomClasss={'6'}
                  numero={<NumberFormatMoney amount={it.total / it.cantidad} />}
                />
              </td>
            </tr>
          ))}
          {resumenServicios.items.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center py-4">Sin servicios en el rango.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </Modal.Body>

  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowResumen(false)}>
      Cerrar
    </Button>
  </Modal.Footer>
</Modal>

  )
}

import React, { useState } from 'react';
import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles';
import { Tag } from 'antd';
import { Button } from 'primereact/button';
import { DataScroller } from 'primereact/datascroller';

export const DetalleItemProSer = ({ dataView, onOpenModalAgregarCarrito }) => {
  const [searchTerm, setSearchTerm] = useState(''); // Estado para el término de búsqueda

  // Función para manejar el cambio del input de búsqueda
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  // Filtrar los productos o servicios según el término de búsqueda
  const filteredData = dataView.filter((d) =>
    d.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.subCategoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.precio && d.precio.toString().includes(searchTerm))
  );

  const itemTemplate = (d) => {
    return (
      <div className="col-12">
        <div className="flex flex-column xl:flex-row xl:align-items-start py-1 gap-2">
          <div style={{ width: '100%' }} className="flex flex-row lg:flex-row justify-content-between align-items-center xl:align-items-start lg:flex-1 gap-2">
            <div className="flex flex-column lg:align-items-start gap-2">
              <div className="flex flex-column gap-1">
                <div className="text-2xl font-bold text-900">{d.label}</div>
              </div>
              <div className="flex flex-column gap-2">
                <span className="flex align-items-center gap-2">
                  <i className="pi pi-tag product-category-icon"></i>
                  <span className="font-semibold">{d.subCategoria}</span>
                </span>
                {d.wthis === 101 && <Tag value={'STOCK: 1'} className="bg-primary font-17" />}
              </div>
            </div>
            <div className="flex flex-row lg:flex-column align-items-center lg:align-items-end gap-4 lg:gap-2">
              <span className="text-2xl font-semibold"><SymbolSoles numero={d.precio} /></span>
              <Button icon="pi pi-shopping-cart" label="AGREGAR" onClick={() => onOpenModalAgregarCarrito(d)} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className='d-flex mb-3'>
        <input
          type='text'
          className='form-control mx-2'
          placeholder='BUSCAR PRODUCTOS Y SERVICIOS'
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>
      <div className='p-0'>
        <DataScroller value={filteredData} itemTemplate={itemTemplate} rows={5} inline scrollHeight='24rem' />
      </div>
    </>
  );
};

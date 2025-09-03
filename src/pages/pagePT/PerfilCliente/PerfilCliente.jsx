import React, { useEffect, useState } from 'react'
import { Card, Col, Row, Tab, TabPane, Tabs } from 'react-bootstrap';
import sinAvatar from '@/assets/images/sinPhoto.jpg';
import "react-form-wizard-component/dist/style.css";
import { Link, redirect, useParams } from 'react-router-dom';
import { useUsuarioStore } from '@/hooks/hookApi/useUsuarioStore';
import { useSelector } from 'react-redux';
import { InformacionGeneralCliente } from './InformacionGeneralCliente';
import Error404AltPage from '@/pages/otherpages/Error404Alt';
import config from '@/config';
import { ComprasxCliente } from './ComprasxCliente';
import { SectionComentarios } from './SectionComentarios';
import { TabPanel, TabView } from 'primereact/tabview';
import { ScrollPanel } from 'primereact/scrollpanel';
import { SectionFiles } from './SectionFiles';
import { Image } from 'primereact/image';
import { Badge } from 'primereact/badge';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore';
import { getBgEstados } from '@/types/type';
// import './ScrollPanelDemo.css';
export const PerfilCliente = () => {
  const { uid } = useParams()
  const { obtenerOneUsuarioCliente, loadingData } = useUsuarioStore()
  // const [isOpenModalRegalos, setisOpenModal] = useState(false)
  const { status, userCliente } = useSelector(e=>e.authClient)
          const { DataGeneral:dataEstadoCliente, obtenerParametroPorEntidadyGrupo:obtenerEstadoCliente } = useTerminoStore()
  useEffect(() => {
    obtenerOneUsuarioCliente(uid)
            obtenerEstadoCliente('cliente', 'estado-cliente')
  }, [])
  if(loadingData){
    return (
      <>
      Cargando...
      </>
    )
  }
  if(!userCliente){
    return <Error404AltPage/>;
  }
  
  const avatarUrl = userCliente?.tb_images&&userCliente?.tb_images[userCliente.tb_images?.length-1]?.name_image
  
  return (
    <>
    <Row>
      
    <Col lg={3}>
            <Card className='mt-3 p-3'  style={{width: '100%', height: '85vh'}}>
              {/* {JSON.stringify(userCliente, 2, null)} */}
              <div className='' style={{height: '100%', width: '100%'}}>
                <div className='d-flex align-items-center flex-column'>
                  <Image indicatorIcon={<i className="pi pi-search"></i>} alt="Image" preview width="170"  src={`${avatarUrl==null?sinAvatar:`${config.API_IMG.AVATAR_CLI}${avatarUrl}`}`} className='rounded-circle'/>
                  <div className='m-2 text-center'>
                    <span className='fs-2 fw-bold'><p className='mb-0 pb-0'>{userCliente.nombre_cli} {userCliente.apPaterno_cli} {userCliente.apMaterno_cli}</p></span>
                    <div className='text-center'>
                    {
                      userCliente.id_estado && (
                        <Badge value={dataEstadoCliente.find(estado=>estado.value==userCliente.id_estado)?.label} size="xlarge" severity={getBgEstados(dataEstadoCliente.find(estado=>estado.value==userCliente.id_estado)?.label)}></Badge>
                      )
                    }
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </Col>
          <Col lg={9}>
        <Card className='mt-3 p-3' style={{width: '100%', height: '85vh'}}>
              <TabView>
                <TabPanel header='Informacion basica'>
                  <ScrollPanel style={{ width: '100%', height: '55vh' }} className="custombar2">
                      <InformacionGeneralCliente data={userCliente}/>
                  </ScrollPanel>
                </TabPanel>
                <TabPanel header='Documentos adjuntos'>
                <ScrollPanel style={{ width: '100%', height: '55vh' }} className="custombar2">
                  <SectionFiles uid_file={userCliente.uid_file_adj}/>
                </ScrollPanel>
                </TabPanel>
                <TabPanel header='Comentarios'>
                <ScrollPanel style={{ width: '100%', height: '55vh' }} className="custombar2">
                  <SectionComentarios data={userCliente}/>
                </ScrollPanel>
                </TabPanel>
                <TabPanel header='Compras'>
                <ScrollPanel style={{ width: '100%', height: '55vh' }} className="custombar2">
                  <ComprasxCliente uid={uid} dataVenta={userCliente.tb_venta}/>
                </ScrollPanel>
                </TabPanel>
              </TabView>
        </Card>
          </Col>
    </Row>
    </>
  );
}

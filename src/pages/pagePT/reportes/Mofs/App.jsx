import { PageBreadcrumb } from '@/components'
import React from 'react'
import { Col, Row } from 'react-bootstrap'
import CardMof from './Components/CardMof'

export const App = () => {
  return (
    <>
        <PageBreadcrumb title={'MOFS'}/>
        <Row>
            <Col lg={3}>
            <CardMof 
                title='MOF MARKETING'
                docUrl='https://docs.google.com/document/d/1myXa_Pj22Yh8s-63QWpZhdrQ_uBsH2wr/edit?usp=sharing&ouid=107494763850863046144&rtpof=true&sd=true'/>
            </Col>
        </Row>
    </>
  )
}

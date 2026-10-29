import React from 'react'
import { Outlet } from 'react-router-dom'
import NavigationProgress from '../components/NavigationProgress'
import ScrollToTop from '../components/ScrollToTop'
import DocumentTitle from '../components/DocumentTitle'

const BlankLayout = () => {
  return (
    <div>
      <NavigationProgress />
      <ScrollToTop />
      <DocumentTitle />
      <Outlet/>
    </div>
  )
}

export default BlankLayout

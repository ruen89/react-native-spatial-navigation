import React, { useEffect } from 'react'

import { SpatialApi } from './core'
import { SpatialGroup } from './SpatialGroup'

/* SpatialNavigation
================================================================== */
export function SpatialNavigation({ children }) {
  useEffect(() => {
    SpatialApi.init()
  }, [])
  return <SpatialGroup id='GLOBAL'>{children}</SpatialGroup>
}

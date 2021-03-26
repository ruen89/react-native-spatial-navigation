import React, { useEffect } from 'react'

import { SpatialApi } from './core'
import { SpatialGroup } from './SpatialGroup'

/* SpatialNavigation
================================================================== */
export function SpatialNavigation({
  children,
}: {
  children: React.ReactNode | React.ReactNode[]
}) {
  useEffect(() => {
    SpatialApi.init()
  }, [])
  return <SpatialGroup id='GLOBAL'>{children}</SpatialGroup>
}

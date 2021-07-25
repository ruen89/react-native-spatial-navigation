import * as React from 'react';

import { SpatialApi } from './core';
import { SpatialGroup } from './SpatialGroup';

const { useEffect } = React;

/* SpatialNavigation
================================================================== */
export function SpatialNavigationProvider({
  children,
}: {
  children: React.ReactNode | React.ReactNode[];
}) {
  useEffect(() => {
    SpatialApi.init();
  }, []);
  return <SpatialGroup id="GLOBAL">{children}</SpatialGroup>;
}

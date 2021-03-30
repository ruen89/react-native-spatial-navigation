/* Dependencies
================================================================== */
import * as React from 'react'

import { SpatialApi } from './core'
/* Types
================================================================== */
import { SpatialGroupContextState, SpatialGroupProps, SpatialId } from './types'

const { createContext, useContext, useEffect, useRef } = React

/* Context & Provider
================================================================== */
export const SpatialNavigationGroupContext = createContext<SpatialGroupContextState>(
  {} as SpatialGroupContextState
)

/* SpatialGroup
================================================================== */
export function SpatialGroup(props: SpatialGroupProps) {
  const willMount = useRef<boolean>(true)
  const {
    children,
    hasTVPreferredFocus,
    id,
    nextFocusUpGroup,
    nextFocusDownGroup,
    nextFocusRightGroup,
    nextFocusLeftGroup,
    preferredChildFocusIndex,
    preferredChildFocusId,
    shouldTrackChildren,
  } = props
  const parentGroupContext = useContext(SpatialNavigationGroupContext)
  const { current: groupId } = useRef<SpatialId>(id || `GroupId-${Date.now()}`)
  const unregister = useRef<() => void>()

  // I needed resemling willMount for this usecase, so implement this solution
  // took inspiration from: https://stackoverflow.com/questions/53464595/how-to-use-componentwillmount-in-react-hooks
  if (willMount.current) {
    // todo add NextFocusProps
    unregister.current = SpatialApi.registerGroup({
      id: groupId,
      groupParentId: parentGroupContext?.groupId,
      groupChildIds: [],
      nextFocusUpGroup,
      nextFocusDownGroup,
      nextFocusRightGroup,
      nextFocusLeftGroup,
      preferredChildFocusIndex,
      preferredChildFocusId,
      shouldTrackChildren,
    })
  }

  useEffect(function onMounted() {
    return unregister.current
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <SpatialNavigationGroupContext.Provider
      value={{
        groupId,
        isFocused: false,
        ...(hasTVPreferredFocus ? { preferredChildFocusId } : {}),
      }}
    >
      {children}
    </SpatialNavigationGroupContext.Provider>
  )
}

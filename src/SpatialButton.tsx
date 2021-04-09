/* Dependencies
================================================================== */
import * as React from 'react'
import { findNodeHandle, TouchableOpacity } from 'react-native'

import { SpatialApi } from './core'
import { SpatialNavigationGroupContext } from './SpatialGroup'
/* Types
================================================================== */
import { SpatialButtonProps, SpatialId } from './types'

const { memo, useCallback, useContext, useEffect, useRef } = React

/* Spatial element (button)
================================================================== */
export const SpatialButton: React.FC<SpatialButtonProps> = memo((props) => {
  const {
    activeOpacity,
    children,
    hasTVPreferredFocus = false,
    id,
    onBlur,
    onFocus,
    onPress,
    onlyPrimaryTop = false,
    onlyPrimaryRight = false,
    onlyPrimaryDown = false,
    onlyPrimaryLeft = false,
    style,
  } = props
  const { groupId, preferredChildFocusId } = useContext(
    SpatialNavigationGroupContext
  )
  const { updateFocus, register, updateLayout } = SpatialApi
  const elementRef = useRef<TouchableOpacity>(null)
  const { current: elementId } = useRef<SpatialId>(
    id || `${groupId}_SpatialId-${Date.now()}`
  )

  useEffect(function isMounted() {
    const remove = register({
      ref: elementRef.current!,
      id: elementId,
      groupId,
      nodehandle: findNodeHandle(elementRef.current),
      nextFocusRestrictions: {
        onlyPrimaryTop,
        onlyPrimaryRight,
        onlyPrimaryDown,
        onlyPrimaryLeft,
      },
    })

    return remove
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFocus = useCallback(async () => {
    updateFocus({ ref: elementRef.current!, id: elementId, groupId })
    if (typeof onFocus === 'function') {
      onFocus()
    }
  }, [elementId, updateFocus, groupId, onFocus])

  const handleBlur = useCallback(() => {
    if (typeof onBlur === 'function') {
      onBlur()
    }
  }, [onBlur])

  const handleLayout = useCallback(() => {
    elementRef.current!.measure((fx, fy, width, height, px, py) => {
      // todo: combine register & updateLayout to one call
      updateLayout({ height, id: elementId, width, x: px, y: py })
    })
  }, [elementId, updateLayout])

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity || 1}
      hasTVPreferredFocus={
        hasTVPreferredFocus || preferredChildFocusId === elementId
      }
      onBlur={handleBlur}
      onFocus={handleFocus}
      onLayout={handleLayout}
      onPress={onPress}
      ref={elementRef}
      style={style}
    >
      {children}
    </TouchableOpacity>
  )
})

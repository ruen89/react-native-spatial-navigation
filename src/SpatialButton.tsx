/* Dependencies
================================================================== */
import * as React from 'react';
import { findNodeHandle, TouchableOpacity } from 'react-native';

import { SpatialApi } from './core';
import { SpatialNavigationGroupContext } from './SpatialGroup';
/* Types
================================================================== */
import type { SpatialButtonProps, SpatialId } from './types';

const { memo, forwardRef, useCallback, useContext, useEffect, useRef } = React;

/* Spatial element (button)
================================================================== */
export const SpatialButton: React.FC<SpatialButtonProps> = memo(
  forwardRef((props, ref: any) => {
    const {
      activeOpacity,
      children,
      hasTVPreferredFocus = false,
      id,
      onBlur,
      onFocus,
      onPress,
      disableSecondaryUp = false,
      disableSecondaryRight = false,
      disableSecondaryDown = false,
      disableSecondaryLeft = false,
      style,
    } = props;
    const { groupId } = useContext(SpatialNavigationGroupContext);
    const { updateFocus, registerSpatialButton, updateLayout } = SpatialApi;
    const elementRef = useRef<TouchableOpacity>(null);
    const { current: elementId } = useRef<SpatialId>(
      id || `${groupId}_SpatialId-${Date.now()}`
    );

    useEffect(function isMounted() {
      const remove = registerSpatialButton({
        ref: elementRef.current!,
        id: elementId,
        groupId,
        nodehandle: findNodeHandle(elementRef.current),
        nextFocusRestrictions: {
          disableSecondaryUp,
          disableSecondaryRight,
          disableSecondaryDown,
          disableSecondaryLeft,
        },
      });

      return remove;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      if (!ref) {
        return;
      }

      // handle callback refs
      if (typeof ref === 'function') {
        ref(elementRef.current);
      }

      // handle object refs
      else {
        ref.current = elementRef.current;
      }
    });

    const handleFocus = useCallback(async () => {
      if (!SpatialApi.shouldUseNativeCode) {
        updateFocus({ ref: elementRef.current!, id: elementId, groupId });
      }

      if (typeof onFocus === 'function') {
        onFocus();
      }
    }, [elementId, updateFocus, groupId, onFocus]);

    const handleBlur = useCallback(() => {
      if (typeof onBlur === 'function') {
        onBlur();
      }
    }, [onBlur]);

    const handleLayout = useCallback(() => {
      if (!SpatialApi.shouldUseNativeCode) {
        elementRef.current!.measure((_fx, _fy, width, height, px, py) => {
          // todo: combine register & updateLayout to one call
          updateLayout({ height, id: elementId, width, x: px, y: py });
        });
      }
    }, [elementId, updateLayout]);

    return (
      <TouchableOpacity
        activeOpacity={activeOpacity || 1}
        hasTVPreferredFocus={hasTVPreferredFocus}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onLayout={handleLayout}
        onPress={onPress}
        ref={elementRef}
        style={style}
      >
        {children}
      </TouchableOpacity>
    );
  })
);

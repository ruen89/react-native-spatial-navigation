/* Dependencies
================================================================== */
import * as React from 'react';
import { NativeEventEmitter, NativeModules } from 'react-native';

import { SpatialApi } from './core';
/* Types
================================================================== */
import type {
  SpatialGroupContextState,
  SpatialGroupProps,
  SpatialId,
} from './types';

const { createContext, useCallback, useContext, useEffect, useRef } = React;

/* Context & Provider
================================================================== */
export const SpatialNavigationGroupContext =
  createContext<SpatialGroupContextState>({} as SpatialGroupContextState);

/* SpatialGroup
================================================================== */
export const SpatialGroup: React.FC<SpatialGroupProps> = (props) => {
  const willMount = useRef<boolean>(true);
  const {
    children,
    hasTVPreferredFocus = false,
    id,
    nextFocusUpGroup,
    nextFocusDownGroup,
    nextFocusRightGroup,
    nextFocusLeftGroup,
    onBlur,
    onFocus,
    preferredChildFocusIndex,
    preferredChildFocusId,
    shouldTrackChildren,
  } = props;
  const parentGroupContext = useContext(SpatialNavigationGroupContext);
  const { current: groupId } = useRef<SpatialId>(id || `GroupId-${Date.now()}`);
  const unregister = useRef<() => void>();
  const { current: eventEmitterRef } = useRef(
    new NativeEventEmitter(NativeModules.SpatialNavigation)
  );

  const handleBlur = useCallback(() => {
    if (typeof onBlur === 'function') {
      onBlur();
    }
  }, [onBlur]);

  const handleFocus = useCallback(() => {
    if (typeof onFocus === 'function') {
      onFocus();
    }
  }, [onFocus]);

  const nativeOnBlurListener = useCallback(
    (event: any) => {
      if (event.groupId === groupId) {
        handleBlur();
      }
    },
    [groupId, handleBlur]
  );

  const nativeOnFocusListener = useCallback(
    (event: any) => {
      if (event.groupId === groupId) {
        handleFocus();
      }
    },
    [groupId, handleFocus]
  );

  // I needed resemling willMount for this usecase, so implement this solution
  // took inspiration from: https://stackoverflow.com/questions/53464595/how-to-use-componentwillmount-in-react-hooks
  if (willMount.current) {
    // todo add NextFocusProps
    unregister.current = SpatialApi.registerGroup({
      id: groupId,
      groupParentId: parentGroupContext?.groupId,
      groupChildIds: [],
      hasTVPreferredFocus,
      nextFocusUpGroup,
      nextFocusDownGroup,
      nextFocusRightGroup,
      nextFocusLeftGroup,
      onBlur: handleBlur,
      onFocus: handleFocus,
      preferredChildFocusIndex,
      preferredChildFocusId,
      shouldTrackChildren,
      spatialChildIds: [],
    });
  }

  useEffect(function onMounted() {
    willMount.current = false;

    // Initialise event listeners to listen to Native events
    if (SpatialApi.shouldUseNativeCode) {
      eventEmitterRef.addListener('spatialGroupOnFocus', nativeOnFocusListener);
      eventEmitterRef.addListener('spatialGroupOnBlur', nativeOnBlurListener);
    }
    return () => {
      // Remove Native event listeners
      if (SpatialApi.shouldUseNativeCode) {
        eventEmitterRef.removeListener(
          'spatialGroupOnBlur',
          nativeOnBlurListener
        );
        eventEmitterRef.removeListener(
          'spatialGroupOnFocus',
          nativeOnFocusListener
        );
      }

      if (unregister.current) {
        unregister.current();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SpatialNavigationGroupContext.Provider
      value={{
        groupId,
        isFocused: false,
      }}
    >
      {children}
    </SpatialNavigationGroupContext.Provider>
  );
};

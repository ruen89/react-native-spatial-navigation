import { NativeModules } from 'react-native';

import type { NextFocusGroup, NextFocusRestrictions, SpatialId } from './types';

interface NativeRegisterGroup extends NextFocusGroup {
  id: SpatialId;
  groupParentId: SpatialId | undefined;
  hasTVPreferredFocus: boolean;
  preferredChildFocusIndex?: number;
  preferredChildFocusId?: SpatialId;
  shouldTrackChildren?: boolean;
}

interface NativeRegisterSpatialObject {
  id: SpatialId;
  groupId: SpatialId;
  nodeHandle: number;
  nextFocusRestrictions: NextFocusRestrictions;
}

type SpatialNavigationType = {
  init(): Promise<string>;
  registerGroup(groupObject: NativeRegisterGroup): Promise<SpatialId>;
  removeGroup(groupId: SpatialId): Promise<SpatialId>;
  registerSpatialObject(
    nodeHandle: NativeRegisterSpatialObject
  ): Promise<SpatialId>;
  removeSpatialObject(spatialObjectId: SpatialId): Promise<SpatialId>;
  setFocusToGroup(groupId: SpatialId): Promise<SpatialId>;
  setFocusToSpatialObject(spatialObjectId: SpatialId): void;
};

const { SpatialNavigation } = NativeModules;

export default SpatialNavigation as SpatialNavigationType;

import nativeApi from './nativeApi';

import type {
  SpatialGroupObject,
  SpatialId,
  SpatialObject,
  SpatialState,
} from './types';

/* State
================================================================== */
export const defaultState: SpatialState = {
  groups: {},
  collection: {},
  focusKey: null,
  groupFocusKey: null,
  nearestNeigborThreshold: 0.2,
  logStateChanges: false,
  logEvents: false,
  useNativeCode: true,
};

export class SpatialNavigationApi {
  private state: SpatialState = defaultState;

  // Init function - todo: add threshold props
  init = () => {};

  // Returns a boolean if the SpatialNavigation is being calculated
  // By native code
  get shouldUseNativeCode(): boolean {
    return this.state.useNativeCode;
  }

  /*
    Function that registers/add a group to the spatialNavigation state.
    It returns a function to also remove the group from spatialNavigation state.
  */
  registerGroup = (groupObject: SpatialGroupObject): (() => void) => {
    // Todo: Implement logic that to warn developer is a group with the same name already exist
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { groupChildIds, onBlur, onFocus, spatialChildIds, ...restProps } =
      groupObject;

    nativeApi.registerGroup(restProps);

    return () => this.removeGroup(groupObject.id);
  };

  /*
    Function that delete/remove a group to the spatialNavigation state.
    If the group was registered to a parent group, this function wil also remove it there
  */
  removeGroup = (groupId: SpatialId) => {
    nativeApi.removeGroup(groupId);
  };

  /*
    Function that registers/add a spatialButton to the spatialNavigation state.
    It returns a function to also remove the spatialButton from spatialNavigation state.
  */
  registerSpatialButton = ({
    groupId,
    id,
    nodehandle,
    nextFocusRestrictions,
  }: Omit<SpatialObject, 'layout'>): (() => void) => {
    nativeApi.registerSpatialObject({
      id,
      groupId,
      nodeHandle: nodehandle,
      nextFocusRestrictions,
    });

    return () => this.removeSpatialButton(id);
  };

  /*
    Function that delete/remove a spatialButton to the spatialNavigation state.
  */
  removeSpatialButton = (elementId: SpatialId) => {
    nativeApi.removeSpatialObject(elementId);
  };

  /*
    Function update spatialButon's layoutObject.
    it's x0,x1,y0,y1 are being caclutated and stored
  */
  updateLayout = () => {
    // This Method is not needed on for the native Implementation of
    // SpatialNavigation - keeping it here though for the time being
    // this is also inforced in SpatialButton.tsx
  };

  /*
   This function is called when a spatialButton get focused.
   The elements nextfocusProps are calcultated and set through setNativeProps
  */
  updateFocus = () => {
    // This Method is not needed on for the native Implementation of
    // SpatialNavigation - keeping it here though for the time being
    // this is also inforced in SpatialButton.tsx
  };

  /*
     This fuction is called when the focus need to go to a
     specific element on the screen
  */
  setFocusToElement = (id: SpatialId) => {
    if (!id) {
      this.logInfo('[WARNING][setFocusToElement] - No id or index provided');
      return;
    }

    nativeApi.setFocusToSpatialObject(id);
  };

  /*
    Set a function to a specific group.
    If group is a parent of multiple group, the first child group get's focus
    If the group has a prefferedChild that should get focus, that child will get the focus
    Or else the first child of the group
  */
  setFocusToGroup = (groupId: SpatialId) => {
    if (!groupId) {
      this.logInfo('[WARNING][setFocusToGroup] - No id provided');
      return;
    }

    nativeApi.setFocusToGroup(groupId);
  };

  /*
     Function that should be called when you suspect that the layout
     of a spatialButton of a group has changed. For example during scrolling
  */
  recalculateGroupLayout = () => {
    // This Method is not needed on for the native Implementation of
    // SpatialNavigation - keeping it here though for the time being
    // So it doesn't break the app
  };

  private logInfo = (...args: any[]) => {
    if (this.state.logEvents) {
      console.info(...args);
    }
  };
}

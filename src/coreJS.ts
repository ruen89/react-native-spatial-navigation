/* Dependencies
================================================================== */
import type { TouchableOpacity } from 'react-native';
import throttle from 'lodash.throttle';

/* Helpers
================================================================== */
import { getNearestNeighbor, getRect } from './helpers';
/* Types
================================================================== */
import type {
  GetNextFocusHandles,
  NextFocusElements,
  NextFocusGroup,
  SpatialGroupObject,
  SpatialId,
  SpatialObject,
  SpatialRef,
  SpatialState,
  UpdateLayoutProps,
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
  useNativeCode: false,
};

export class SpatialNavigationApi {
  private state: SpatialState = defaultState;

  // Init function - todo: add threshold props
  init = () => {};

  /// rename to groups
  get groups(): { [groupId: string]: SpatialGroupObject } {
    return { ...this.state.groups };
  }

  get spatialCollection(): { [spatialId: string]: SpatialObject } {
    return { ...this.state.collection };
  }

  get getCollectionArray(): SpatialObject[] {
    const collection = this.spatialCollection;
    return Object.keys(collection).map((id) => collection[id]);
  }

  get shouldUseNativeCode(): boolean {
    return this.state.useNativeCode;
  }

  /*
    Function that registers/add a group to the spatialNavigation state.
    It returns a function to also remove the group from spatialNavigation state.
  */
  registerGroup = (groupObject: SpatialGroupObject): (() => void) => {
    // Todo: Implement logic that to warn developer is a group with the same name already exist
    const groups = this.groups;

    groups[`${groupObject.id}`] = groupObject;

    if (groupObject.groupParentId) {
      if (groups[groupObject.groupParentId]) {
        groups[groupObject.groupParentId].groupChildIds.push(groupObject.id);
      } else {
        console.log(
          'WARNING - RegisterGroup',
          `parent ${groupObject.groupParentId}, not found of child ${groupObject.id}`
        );
      }
    }

    // rename to updateState
    this.setState({ groups }, 'registerGroup');

    return () => this.removeGroup(groupObject.id, groupObject.groupParentId);
  };

  /*
    Function that delete/remove a group to the spatialNavigation state.
    If the group was registered to a parent group, this function wil also remove it there
  */
  removeGroup = (groupId: SpatialId, groupParentId: SpatialId | undefined) => {
    const groups = this.groups;

    delete groups[`${groupId}`];

    if (groupParentId) {
      if (groups[groupId]) {
        const childIndex =
          groups[`${groupParentId}`].groupChildIds.indexOf(groupId);

        if (childIndex > -1) {
          groups[`${groupParentId}`].groupChildIds.splice(childIndex, 1);
        }
      } else {
        console.log(
          'WARNING - RegisterGroup',
          `parent ${groupParentId}, not found of child group ${groupId}`
        );
      }
    }

    this.setState({ groups }, 'removeGroup');
  };

  /*
    Function that registers/add a spatialButton to the spatialNavigation state.
    It returns a function to also remove the spatialButton from spatialNavigation state.
  */
  registerSpatialButton = ({
    ref,
    groupId,
    id,
    nodehandle,
    nextFocusRestrictions,
  }: Omit<SpatialObject, 'layout'>): (() => void) => {
    const groups = this.groups;
    const collection = this.spatialCollection;

    groups[`${groupId}`].spatialChildIds.push(id);
    collection[`${id}`] = {
      ref,
      id,
      groupId,
      nodehandle,
      nextFocusRestrictions,
    };

    // Prevent navigation
    ref.setNativeProps({
      nextFocusUp: nodehandle,
      nextFocusRight: nodehandle,
      nextFocusDown: nodehandle,
      nextFocusLeft: nodehandle,
    });

    this.setState({ collection, groups }, 'register');

    return () => this.removeSpatialButton(id, groupId);
  };

  /*
    Function that delete/remove a spatialButton to the spatialNavigation state.
  */
  removeSpatialButton = (elementId: SpatialId, groupId: SpatialId) => {
    const collection = this.spatialCollection;
    const focusKey = this.state.focusKey;
    const groups = this.groups;

    // Remove id from the group it belongs to
    if (groups[`${groupId}`]) {
      const index = groups[groupId].spatialChildIds.indexOf(elementId);
      groups[groupId].spatialChildIds.splice(index, 1);
    } else {
      console.log(
        'WARNING - remove',
        `groep ${groupId}, not found of spatial object ${elementId}`
      );
    }

    delete collection[elementId];

    const newState: Partial<SpatialState> = { collection };

    if (focusKey === elementId) {
      newState.focusKey = null;
      newState.groupFocusKey = null;
    }

    this.setState(newState, 'remove');
  };

  /*
    Function update spatialButon's layoutObject.
    it's x0,x1,y0,y1 are being caclutated and stored
  */
  updateLayout = (updateLayoutProps: UpdateLayoutProps) => {
    const { id, ...layoutProps } = updateLayoutProps;
    const elementLayout = getRect(layoutProps);
    const collection = this.spatialCollection;

    if (!collection[id]) {
      this.logInfo(
        `[WARNING][updateLayout] - Fatal error, element not found! ${id}, could it have been removed while scrolling?`
      );
      return;
    }

    collection[id].layout = elementLayout;

    this.setState({ collection }, 'updateLayout');
    /*
     Every time a layout of an item is updated, we need to update
     the focused item nextFocus props. these could've changed
     remember: This is an expensive calculation
     */
    const focusedItem = this.getFocusedItem();
    if (focusedItem) {
      this.setNextFocusNodeHandles(focusedItem.id, focusedItem.ref);
    }
  };

  /*
   This function is called when a spatialButton get focused.
   The elements nextfocusProps are calcultated and set through setNativeProps
  */
  updateFocus = ({ id, groupId, ref }: GetNextFocusHandles) => {
    const prevGroupFocusKey = this.state.groupFocusKey;
    const newState: Partial<SpatialState> = {
      focusKey: id,
      groupFocusKey: groupId,
    };
    const focusedGroupObject = this.selectGroupById(groupId);

    /*
      If the parent has the prop shouldTrackChildren, we
      store the id in the element group to keep track
    */
    if (focusedGroupObject?.shouldTrackChildren) {
      newState.groups = this.groups;

      if (newState.groups[groupId]) {
        newState.groups[groupId].lastChildFocusedId = id;
      }
    }

    this.setState(newState, 'updateFocus');

    if (prevGroupFocusKey !== groupId) {
      this.updateGroupFocus(groupId, prevGroupFocusKey);
    }

    this.setNextFocusNodeHandles(id, ref);
  };

  private updateGroupFocus = (
    currentGroupId: SpatialId | null,
    prevGroupId: SpatialId | null
  ) => {
    if (prevGroupId) {
      const prevGroup = this.selectGroupById(prevGroupId);
      prevGroup?.onBlur();
    }
    if (currentGroupId) {
      const currentGroup = this.selectGroupById(currentGroupId);
      this.updateGroupParent(currentGroup!);

      currentGroup!.onFocus();
    }
  };

  updateGroupParent = (childGroup: SpatialGroupObject) => {
    const parentGroup = this.selectGroupById(childGroup!.groupParentId || '');

    if (parentGroup?.shouldTrackChildren) {
      const stateUpdate = { groups: this.groups };

      if (stateUpdate.groups[parentGroup.id]) {
        stateUpdate.groups[parentGroup.id].lastChildFocusedId = childGroup.id;

        this.setState(stateUpdate, 'updateGroupLastFocused');

        const granParentGroup = this.selectGroupById(
          parentGroup.groupParentId || ''
        );

        if (granParentGroup?.shouldTrackChildren) {
          this.updateGroupParent(parentGroup);
        }
      }
    }
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

    const element = this.selectItemById(id);

    if (!element) {
      this.logInfo('[WARNING][setElementFocus] - Element not found');
      return;
    }

    this.setNativeFocus(element.ref);
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

    const group = this.selectGroupById(groupId);

    // If group has child groups, then find out which of the child
    // groups will get the focus
    if (group && group.groupChildIds.length > 0) {
      let groupChildIndex: number;
      if (group.shouldTrackChildren && group.lastChildFocusedId) {
        groupChildIndex = Math.max(
          0,
          group.groupChildIds.findIndex(
            (value) => value === group.lastChildFocusedId
          )
        );
      } else if (group.preferredChildFocusIndex) {
        groupChildIndex = group.preferredChildFocusIndex;
      } else if (group.preferredChildFocusId) {
        groupChildIndex = Math.max(
          0,
          group.groupChildIds.findIndex(
            (value) => value === group.preferredChildFocusId
          )
        );
      } else {
        groupChildIndex = 0;
      }
      this.setFocusToGroup(group.groupChildIds[groupChildIndex]);
      return;
    }

    let nextFocusElement = this.getGroupPrefferedSpatialObjectOnFocus(groupId);

    if (!nextFocusElement) {
      const groupChildren = this.selectAllItemsFromGroup(groupId);

      if (groupChildren.length === 0) {
        this.logInfo('[WARNING][setFocusToGroup] - Children not found');
        return;
      }

      nextFocusElement = groupChildren[0];
    }

    this.setNativeFocus(nextFocusElement.ref);
  };

  /*
     Function that should be called when you suspect that the layout
     of a spatialButton of a group has changed. For example during scrolling
  */
  recalculateGroupLayout = (groupId: SpatialId) => {
    if (this.shouldUseNativeCode) {
      return;
    }

    if (!groupId) {
      this.logInfo('[WARNING][recalculateGroupLayout] No id passed');
      return;
    }
    const group = this.selectGroupById(groupId);
    if (!group) {
      this.logInfo(
        '[WARNING][recalculateGroupLayout] - Group not found with id',
        groupId
      );
      return;
    }
    const children = this.selectAllItemsFromGroup(groupId);

    // Recalculate childrens layout
    if (children.length !== 0) {
      children.forEach((child: SpatialObject) => {
        const { id, ref } = child;
        ref.measure((_fx, _fy, width, height, px, py) => {
          this.updateLayout({ height, id, width, x: px, y: py });
        });
      });
    }
    // If group has nested group, calculate their children
    if (group && group.groupChildIds.length > 0) {
      group.groupChildIds.forEach((groupChildId: SpatialId) => {
        this.recalculateGroupLayout(groupChildId);
      });
    }
  };

  /*
    If group has predefined preferredChildFocusIndex or preferredChildFocusId,
    use these values to return the correct object that will get focused first.
  */
  private getGroupPrefferedSpatialObjectOnFocus = (
    groupId: SpatialId
  ): SpatialObject | void => {
    const group = this.selectGroupById(groupId);
    if (!group) {
      this.logInfo(
        `[WARNING][getGroupPrefferedFocusSpatialObject] - Group not found with id ${groupId}`
      );
      return;
    }

    const {
      groupChildIds,
      preferredChildFocusId,
      preferredChildFocusIndex,
      shouldTrackChildren,
      lastChildFocusedId,
    } = group;
    const groupChildren = this.selectAllItemsFromGroup(groupId);

    if (groupChildIds.length > 0) {
      let lasFocusedChildId = groupChildIds[0];
      if (shouldTrackChildren && lastChildFocusedId) {
        lasFocusedChildId = groupChildIds.find(
          (value) => value === lastChildFocusedId
        )!;
      }

      return this.getGroupPrefferedSpatialObjectOnFocus(lasFocusedChildId!);
    } else if (shouldTrackChildren && lastChildFocusedId) {
      const lasFocusedChild = groupChildren.find(
        (element) => element.id === lastChildFocusedId
      );

      if (!lasFocusedChild) {
        this.logInfo(
          '[WARNING][getGroupPrefferedFocusSpatialObject] - No lasFocusedChild found with this id'
        );
        return;
      }

      return lasFocusedChild;
    } else if (preferredChildFocusId) {
      const findElement = groupChildren.find(
        (element) => element.id === preferredChildFocusId
      );

      if (!findElement) {
        this.logInfo(
          '[WARNING][getGroupPrefferedFocusSpatialObject] - No element found with this id'
        );
        return;
      }

      return findElement;
    } else if (
      preferredChildFocusIndex != null &&
      preferredChildFocusIndex <= groupChildren.length - 1
    ) {
      return groupChildren[preferredChildFocusIndex];
    }
  };

  /*
    Forcefully set focus to a specific eleent
  */
  private setNativeFocus(ref: SpatialRef) {
    ref.setNativeProps({ hasTVPreferredFocus: true });
  }

  /*
    Returns the item that's currently focused
  */
  private getFocusedItem = (): SpatialObject => {
    return this.selectItemById(
      this.state.focusKey as SpatialId
    ) as SpatialObject;
  };

  /*
    Return the spatialObject thatt matches he id
  */
  private selectItemById = (id: SpatialId): SpatialObject | undefined => {
    return this.spatialCollection[id];
  };

  /*
    Return the spatialGroup thatt matches he id
  */
  private selectGroupById = (
    groupId: SpatialId
  ): SpatialGroupObject | undefined => {
    return this.groups[groupId];
  };

  /*
    Return all of the SpatialObjects from the same group -- non-recursively
  */
  private selectAllItemsFromGroup = (groupId: SpatialId): SpatialObject[] => {
    if (!this.groups[groupId]) {
      // debugger;
    }
    const childIdArray = this.groups[groupId].spatialChildIds;

    if (childIdArray.length === 0) {
      return [];
    }

    return childIdArray.map((id) => this.spatialCollection[id]);
  };

  /*
    This functions calls getNearestNeighbor to get the nearest spatial neighbors
    Based on the result it might replace the results based on the group config of
    the current group or the next group that will get focused

    Throttled this function because it's expensive
    Seeing as a lot of layoutUpdates can happen simultainously
    there is no need to run fucntion every time
  */
  private setNextFocusNodeHandles = throttle(
    async (id: SpatialId, elementRef: TouchableOpacity) => {
      const focusedElement = this.selectItemById(id);

      if (!focusedElement) {
        this.logError(
          `[setNextFocusNodeHandles] - No focused element found with this id: ${id}`
        );
        // todo: type this beter
        return;
      }

      const focusedElementGroup = this.selectGroupById(focusedElement.groupId);

      const nextFocusSpatialObjects = getNearestNeighbor(
        focusedElement,
        this.getCollectionArray,
        this.state.nearestNeigborThreshold,
        this.state.logEvents
      );

      // If the next focused element belongs to another group
      // check if this group has predefined which element need to get first focus
      // todo: Move this logic before calculatinf nearest neighbor
      Object.keys(nextFocusSpatialObjects).forEach((key) => {
        const nextFocusElement =
          nextFocusSpatialObjects[key as keyof NextFocusElements];

        // If undefined - so there is nothing to focus to in this direciton
        if (!nextFocusElement) {
          return;
        }

        if (
          nextFocusElement &&
          nextFocusElement.groupId !== focusedElement.groupId
        ) {
          const currentGroupNextFocus =
            focusedElementGroup![`${key}Group` as keyof NextFocusGroup];
          const nextFocusGroupPrefferedFocusObject =
            this.getGroupPrefferedSpatialObjectOnFocus(
              nextFocusElement.groupId
            );

          // If the current group has predefined the next group that should get focus, replace current
          if (currentGroupNextFocus) {
            nextFocusSpatialObjects[key as keyof NextFocusElements] =
              this.getGroupPrefferedSpatialObjectOnFocus(
                currentGroupNextFocus
              ) || this.selectAllItemsFromGroup(currentGroupNextFocus)[0];
            // If group has defined a preffered focus object, replace current with that of config
          } else if (nextFocusGroupPrefferedFocusObject) {
            nextFocusSpatialObjects[key as keyof NextFocusElements] =
              nextFocusGroupPrefferedFocusObject;
          }
        }
      });

      const { nextFocusDown, nextFocusLeft, nextFocusRight, nextFocusUp } =
        nextFocusSpatialObjects;

      // If there is nothing to focus on, focus on Same element again
      elementRef.setNativeProps({
        nextFocusUp: (nextFocusUp || focusedElement).nodehandle,
        nextFocusRight: (nextFocusRight || focusedElement).nodehandle,
        nextFocusDown: (nextFocusDown || focusedElement).nodehandle,
        nextFocusLeft: (nextFocusLeft || focusedElement).nodehandle,
      });

      this.log(
        'NextFocus to:',
        JSON.stringify(
          {
            nextFocusUp: (nextFocusUp || focusedElement).id,
            nextFocusRight: (nextFocusRight || focusedElement).id,
            nextFocusDown: (nextFocusDown || focusedElement).id,
            nextFocusLeft: (nextFocusLeft || focusedElement).id,
          },
          null,
          2
        )
      );
    },
    100,
    { trailing: true }
  );

  private setState = (props: Partial<SpatialState>, action: string) => {
    const newState = { ...this.state, ...props };
    this.state = newState;

    if (this.state.logStateChanges) {
      console.log(`Action: ${action}`, newState);
    }
  };

  private log = (...args: any[]) => {
    if (this.state.logEvents) {
      console.log(...args);
    }
  };

  private logInfo = (...args: any[]) => {
    if (this.state.logEvents) {
      console.info(...args);
    }
  };

  private logError = (...args: any[]) => {
    if (this.state.logEvents) {
      console.error(...args);
    }
  };
}

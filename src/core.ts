/* Dependencies
================================================================== */
import throttle from 'lodash.throttle'
import { TouchableOpacity } from 'react-native'

/* Helpers
================================================================== */
import { getNearestNeighbor, getRect } from './helpers'
/* Types
================================================================== */
import {
  GetNextFocusHandles,
  NextFocusElements,
  NextFocusGroup,
  SpatialGroupObject,
  SpatialId,
  SpatialObject,
  SpatialRef,
  SpatialState,
  UpdateLayoutProps,
} from './types'

/* State
================================================================== */
export const defaultState: SpatialState = {
  groups: [],
  collection: [],
  focusKey: null,
  groupFocusKey: null,
  nearestNeigborThreshild: 0.3,
  logStateChanges: true,
  logEvents: false,
}

class SpatialNavigationApi {
  private state: SpatialState

  constructor() {
    this.state = defaultState
  }

  // Init function - todo: add threshold props
  init = () => {}

  /*
    Function that registers/add a group to the spatialNavigation state.
    It returns a function to also remove the group from spatialNavigation state.
  */
  registerGroup = (groupObject: SpatialGroupObject): (() => void) => {
    // todo: group with same name,
    const groups = [...this.state.groups]
    groups.push(groupObject)
    const parentGroupIndex = groups.findIndex(
      ({ id }) => id === groupObject.groupParentId
    )

    // Register current group to it's parent
    if (parentGroupIndex >= 0) {
      groups[parentGroupIndex].groupChildIds.push(groupObject.id)
    }

    this.setState({ groups }, 'registerGroup')

    return () => this.removeGroup(groupObject.id, groupObject.groupParentId)
  }

  /*
    Function that delete/remove a group to the spatialNavigation state.
    If the group was registered to a parent group, this function wil also remove it there
  */
  removeGroup = (groupId: SpatialId, groupParentId: SpatialId | undefined) => {
    const groups = [...this.state.groups]
    const indexToRemove = groups.findIndex((item: SpatialGroupObject) => {
      return item.id === groupId
    })
    groups.splice(indexToRemove, 1)

    if (groupParentId) {
      const parentIndex = groups.findIndex(
        (item: SpatialGroupObject) => item.id === groupParentId
      )

      if (parentIndex > -1) {
        const childIndex = groups[parentIndex].groupChildIds.indexOf(groupId)

        if (childIndex > -1) {
          groups[parentIndex].groupChildIds.splice(childIndex, 1)
        }
      }
    }

    this.setState({ groups }, 'removeGroup')
  }

  /*
    Function that registers/add a spatialButton to the spatialNavigation state.
    It returns a function to also remove the spatialButton from spatialNavigation state.
  */
  register = ({
    ref,
    groupId,
    id,
    nodehandle,
    nextFocusRestrictions,
  }: Omit<SpatialObject, 'layout'>): (() => void) => {
    const collection = [...this.state.collection]
    collection.push({ ref, id, groupId, nodehandle, nextFocusRestrictions })

    this.setState({ collection }, 'register')

    return () => this.remove(id)
  }

  /*
    Function that delete/remove a spatialButton to the spatialNavigation state.
  */
  remove = (elementId: SpatialId) => {
    const collection = [...this.state.collection]
    const indexToRemove = collection.findIndex(({ id }: SpatialObject) => {
      return id === elementId
    })
    collection.splice(indexToRemove, 1)

    this.setState({ collection }, 'remove')
  }

  /*
    Function update spatialButon's layoutObject.
    it's x0,x1,y0,y1 are being caclutated and stored
  */
  updateLayout = (updateLayoutProps: UpdateLayoutProps) => {
    const { id, ...layoutProps } = updateLayoutProps
    const elementLayout = getRect(layoutProps)
    const collection = [...this.state.collection]
    const index = collection.findIndex(
      (props: SpatialObject) => props.id === id
    )

    if (index === -1) {
      this.logInfo(
        `[WARNING][updateLayout] - Fatal error, element not found! ${id}, could it have been removed while scrolling?`
      )
      return
    }

    collection[index].layout = elementLayout

    this.setState({ collection }, 'updateLayout')
    /*
     Every time a layout of an item is updated, we need to update
     the focused item nextFocus props. these could've changed
     remember: This is an expensive calculation
     */
    const focusedItem = this.getFocusedItem()
    if (focusedItem) {
      this.setNextFocusNodeHandles(focusedItem.id, focusedItem.ref)
    }
  }

  /*
   This function is called when a spatialButton get focused.
   The elements nextfocusProps are calcultated and set through setNativeProps
  */
  updateFocus = ({ id, groupId, ref }: GetNextFocusHandles) => {
    const prevGroupFocusKey = this.state.groupFocusKey
    const newState: Partial<SpatialState> = {
      focusKey: id,
      groupFocusKey: groupId,
    }
    const focusedGroupObject = this.selectGroupById(groupId)

    /*
      If the parent has the prop shouldTrackChildren, we
      store the id in the element group to keep track
    */
    if (focusedGroupObject?.shouldTrackChildren) {
      newState.groups = [...this.state.groups]
      const indexToUpdate = newState.groups.findIndex(
        (item) => item.id === groupId
      )

      if (indexToUpdate > -1) {
        newState.groups[indexToUpdate].lastChildFocusedId = id
      }
    }

    this.setState(newState, 'updateFocus')

    if (prevGroupFocusKey !== groupId) {
      this.updateGroupFocus(groupId, prevGroupFocusKey)
    }

    this.setNextFocusNodeHandles(id, ref)
  }

  private updateGroupFocus = (
    currentGroupId: SpatialId | null,
    prevGroupId: SpatialId | null
  ) => {
    if (prevGroupId) {
      const prevGroup = this.selectGroupById(prevGroupId)
      prevGroup?.onBlur()
    }
    if (currentGroupId) {
      const currentGroup = this.selectGroupById(currentGroupId)
      this.updateGroupParent(currentGroup!)

      currentGroup!.onFocus()
    }
  }

  updateGroupParent = (childGroup: SpatialGroupObject) => {
    const parentGroup = this.selectGroupById(childGroup!.groupParentId || '')

    if (parentGroup?.shouldTrackChildren) {
      const stateUpdate = { groups: [...this.state.groups] }
      const indexToUpdate = stateUpdate.groups.findIndex(
        (item) => item.id === parentGroup.id
      )

      if (indexToUpdate > -1) {
        stateUpdate.groups[indexToUpdate].lastChildFocusedId = childGroup.id

        this.setState(stateUpdate, 'updateGroupLastFocused')

        const granParentGroup = this.selectGroupById(
          parentGroup.groupParentId || ''
        )

        if (granParentGroup?.shouldTrackChildren) {
          this.updateGroupParent(parentGroup)
        }
      }
    }
  }

  /*
     This fuction is called when the focus need to go to a
     specific element on the screen
  */
  setFocusToElement = (id: SpatialId) => {
    if (!id) {
      this.logInfo('[WARNING][setFocusToElement] - No id or index provided')
      return
    }

    const element = this.selectItemById(id)

    if (!element) {
      this.logInfo('[WARNING][setElementFocus] - Element not found')
      return
    }

    this.setNativeFocus(element.ref)
  }

  /*
    Set a function to a specific group.
    If group is a parent of multiple group, the first child group get's focus
    If the group has a prefferedChild that should get focus, that child will get the focus
    Or else the first child of the group
  */
  setFocusToGroup = (groupId: SpatialId) => {
    if (!groupId) {
      this.logInfo('[WARNING][setFocusToGroup] - No id provided')
      return
    }
    const group = this.selectGroupById(groupId)

    // If group has child groups, then find out which of the child
    // groups will get the focus
    if (group && group.groupChildIds.length > 0) {
      let groupChildIndex: number
      if (group.shouldTrackChildren && group.lastChildFocusedId) {
        groupChildIndex = Math.max(
          0,
          group.groupChildIds.findIndex(
            (value) => value === group.lastChildFocusedId
          )
        )
      } else if (group.preferredChildFocusIndex) {
        groupChildIndex = group.preferredChildFocusIndex
      } else if (group.preferredChildFocusId) {
        groupChildIndex = Math.max(
          0,
          group.groupChildIds.findIndex(
            (value) => value === group.preferredChildFocusId
          )
        )
      } else {
        groupChildIndex = 0
      }
      this.setFocusToGroup(group.groupChildIds[groupChildIndex])
      return
    }

    let nextFocusElement = this.getGroupPrefferedSpatialObjectOnFocus(groupId)

    if (!nextFocusElement) {
      const groupChildren = this.selectAllItemsFromGroup(groupId)

      if (groupChildren.length === 0) {
        this.logInfo('[WARNING][setFocusToGroup] - Children not found')
        return
      }

      nextFocusElement = groupChildren[0]
    }

    this.setNativeFocus(nextFocusElement.ref)
  }

  /*
     Function that should be called when you suspect that the layout
     of a spatialButton of a group has changed. For example during scrolling
  */
  recalculateGroupLayout = (groupId: SpatialId) => {
    if (!groupId) {
      this.logInfo('[WARNING][recalculateGroupLayout] No id passed')
      return
    }
    const group = this.selectGroupById(groupId)
    if (!group) {
      this.logInfo(
        '[WARNING][recalculateGroupLayout] - Group not found with id',
        groupId
      )
      return
    }
    const children = this.selectAllItemsFromGroup(groupId)

    // Recalculate childrens layout
    if (children.length !== 0) {
      children.forEach((child: SpatialObject) => {
        const { id, ref } = child
        ref.measure((fx, fy, width, height, px, py) => {
          this.updateLayout({ height, id, width, x: px, y: py })
        })
      })
    }
    // If group has nested group, calculate their children
    if (group && group.groupChildIds.length > 0) {
      group.groupChildIds.forEach((groupChildId: SpatialId) => {
        this.recalculateGroupLayout(groupChildId)
      })
    }
  }

  /*
    If group has predefined preferredChildFocusIndex or preferredChildFocusId,
    use these values to return the correct object that will get focused first.
  */
  private getGroupPrefferedSpatialObjectOnFocus = (
    groupId: SpatialId
  ): SpatialObject | undefined => {
    const groups = this.selectGroupById(groupId)
    if (!groups) {
      this.logInfo(
        `[WARNING][getGroupPrefferedFocusSpatialObject] - Group not found with id ${groupId}`
      )
      return
    }

    const {
      groupChildIds,
      preferredChildFocusId,
      preferredChildFocusIndex,
      shouldTrackChildren,
      lastChildFocusedId,
    } = groups
    const groupChildren = this.selectAllItemsFromGroup(groupId)

    if (groupChildIds.length > 0) {
      let lasFocusedChildId = groupChildIds[0]
      if (shouldTrackChildren && lastChildFocusedId) {
        lasFocusedChildId = groupChildIds.find(
          (value) => value === lastChildFocusedId
        )!
      }

      return this.getGroupPrefferedSpatialObjectOnFocus(lasFocusedChildId!)
    } else if (shouldTrackChildren && lastChildFocusedId) {
      const lasFocusedChild = groupChildren.find(
        (element) => element.id === lastChildFocusedId
      )

      if (!lasFocusedChild) {
        this.logInfo(
          '[WARNING][getGroupPrefferedFocusSpatialObject] - No lasFocusedChild found with this id'
        )
        return
      }

      return lasFocusedChild
    } else if (preferredChildFocusId) {
      const findElement = groupChildren.find(
        (element) => element.id === preferredChildFocusId
      )

      if (!findElement) {
        this.logInfo(
          '[WARNING][getGroupPrefferedFocusSpatialObject] - No element found with this id'
        )
        return
      }

      return findElement
    } else if (
      preferredChildFocusIndex &&
      preferredChildFocusIndex <= groupChildren.length - 1
    ) {
      return groupChildren[preferredChildFocusIndex]
    }
  }

  /*
    Forcefully set focus to a specific eleent
  */
  private setNativeFocus(ref: SpatialRef) {
    ref.setNativeProps({ hasTVPreferredFocus: true })
  }

  /*
    Returns the item that's currently focused
  */
  private getFocusedItem = (): SpatialObject => {
    return this.selectItemById(
      this.state.focusKey as SpatialId
    ) as SpatialObject
  }

  /*
    Return the spatialObject thatt matches he id
  */
  private selectItemById = (id: SpatialId): SpatialObject | undefined => {
    return this.state.collection.find(
      ({ id: elementId }: SpatialObject) => elementId === id
    )
  }

  /*
    Return the spatialGroup thatt matches he id
  */
  private selectGroupById = (
    groupId: SpatialId
  ): SpatialGroupObject | undefined => {
    return this.state.groups.find(
      (group: SpatialGroupObject) => group.id === groupId
    )
  }

  /*
    Return all of the SpatialObjects from the same group -- non-recursively
  */
  private selectAllItemsFromGroup = (groupId: SpatialId): SpatialObject[] => {
    return this.state.collection.filter(
      (element: SpatialObject) => element.groupId === groupId
    )
  }

  /*
    This functions calls getNearestNeighbor to get the nearest spatial neighbors
    Based on the result it might replace the results based on the group config of
    the current group or the next group that will get focused

    Throttled this function because it's expensive
    Seeing as a lot of layoutUpdates can happen simultainously
    there is no need to run fucntion every time
  */
  private setNextFocusNodeHandles = throttle(
    (id: SpatialId, elementRef: TouchableOpacity) => {
      // requestAnimationFrame is needed to make sure that all of the elements layout object have been set
      requestAnimationFrame(() => {
        const focusedElement = this.selectItemById(id)
        if (!focusedElement) {
          this.logError(
            `[setNextFocusNodeHandles] - No focused element found with this id: ${id}`
          )
          // todo: type this beter
          return
        }

        const focusedElementGroup = this.selectGroupById(focusedElement.groupId)

        const nextFocusSpatialObjects = getNearestNeighbor(
          focusedElement,
          this.state.collection,
          this.state.nearestNeigborThreshild,
          this.state.logEvents
        )

        // If the next focused element belongs to another group
        // check if this group has predefined which element need to get first focus
        Object.keys(nextFocusSpatialObjects).forEach((key) => {
          const nextFocusElement =
            nextFocusSpatialObjects[key as keyof NextFocusElements]

          // If undefined - so there is nothing to focus to in this direciton
          if (!nextFocusElement) {
            return
          }

          if (
            nextFocusElement &&
            nextFocusElement.groupId !== focusedElement.groupId
          ) {
            const currentGroupNextFocus = focusedElementGroup![
              `${key}Group` as keyof NextFocusGroup
            ]
            const nextFocusGroupPrefferedFocusObject = this.getGroupPrefferedSpatialObjectOnFocus(
              nextFocusElement.groupId
            )

            // If the current group has predefined the next group that should get focus, replace current
            if (currentGroupNextFocus) {
              nextFocusSpatialObjects[key as keyof NextFocusElements] =
                this.getGroupPrefferedSpatialObjectOnFocus(
                  currentGroupNextFocus
                ) || this.selectAllItemsFromGroup(currentGroupNextFocus)[0]
              // If group has defined a preffered focus object, replace current with that of config
            } else if (nextFocusGroupPrefferedFocusObject) {
              nextFocusSpatialObjects[
                key as keyof NextFocusElements
              ] = nextFocusGroupPrefferedFocusObject
            }
          }
        })

        const {
          nextFocusDown,
          nextFocusLeft,
          nextFocusRight,
          nextFocusUp,
        } = nextFocusSpatialObjects

        // If there is nothing to focus on, focus on Same element again
        elementRef.setNativeProps({
          nextFocusUp: (nextFocusUp || focusedElement).nodehandle,
          nextFocusRight: (nextFocusRight || focusedElement).nodehandle,
          nextFocusDown: (nextFocusDown || focusedElement).nodehandle,
          nextFocusLeft: (nextFocusLeft || focusedElement).nodehandle,
        })

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
        )
      })
    },
    100,
    { trailing: true }
  )

  private setState = (props: Partial<SpatialState>, action: string) => {
    const newState = { ...this.state, ...props }
    this.state = newState

    if (this.state.logStateChanges) {
      console.log(`Action: ${action}`, newState)
    }
  }

  private log = (...args: any[]) => {
    if (this.state.logEvents) {
      console.log(...args)
    }
  }

  private logInfo = (...args: any[]) => {
    if (this.state.logEvents) {
      console.info(...args)
    }
  }

  private logError = (...args: any[]) => {
    if (this.state.logEvents) {
      console.error(...args)
    }
  }
}

export const SpatialApi = new SpatialNavigationApi()

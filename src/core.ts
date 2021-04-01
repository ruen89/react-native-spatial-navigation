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
  UpdateBlurProps,
  UpdateLayoutProps,
} from './types'

// const stateHandler: ProxyHandler<SpatialState> = {
//   get(target: SpatialState, property: keyof SpatialState) {
//     //console.log(`Property ${property} has been read`, target);
//     return target[property]
//   },
//   set(
//     target: SpatialState,
//     property: keyof SpatialState,
//     value: SpatialObject[] & SpatialGroupObject[] & SpatialId & number & never
//   ) {
//     target[property] = value
//     return true
//   },
// }

/* State
================================================================== */
export const defaultState: SpatialState = {
  groups: [],
  collection: [],
  focusKey: null,
  groupFocusKey: null,
  nearestNeigborThreshild: 0.3,
  logStateChanges: true,
}

class SpatialNavigationApi {
  private state: SpatialState
  private blurTimeout: any

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
      console.info(
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
    clearTimeout(this.blurTimeout)
    if (prevGroupId) {
      const prevGroup = this.selectGroupById(prevGroupId)
      prevGroup?.onBlur()
    }
    if (currentGroupId) {
      const currentGroup = this.selectGroupById(currentGroupId)
      currentGroup!.onFocus()
    }
  }

  updateBlur = ({ id, groupId }: UpdateBlurProps) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.blurTimeout = setTimeout(() => {
          if (id === this.state.focusKey) {
            this.updateGroupFocus(null, groupId)
            this.setState(
              {
                focusKey: null,
                groupFocusKey: null,
              },
              'updateBlur'
            )
          }
        }, 1)
      })
    })
  }

  /*
     This fuction is called when the focus need to go to a
     specific element on the screen
  */
  setFocusToElement = (id: SpatialId) => {
    if (!id) {
      console.info('[WARNING][setFocusToElement] - No id or index provided')
      return
    }

    const element = this.selectItemById(id)

    if (!element) {
      console.info('[WARNING][setElementFocus] - Element not found')
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
      console.info('[WARNING][setFocusToGroup] - No id provided')
      return
    }
    const group = this.selectGroupById(groupId)

    // Todo: extend logic to also know which (child)group gets
    // prefferedFocus and possibly also track last focus
    if (group && group.groupChildIds.length > 0) {
      this.setFocusToGroup(group.groupChildIds[0])
      return
    }

    let nextFocusElement = this.getGroupPrefferedSpatialObjectOnFocus(groupId)

    if (!nextFocusElement) {
      const groupChildren = this.selectAllItemsFromGroup(groupId)

      if (groupChildren.length === 0) {
        console.info('[WARNING][setFocusToGroup] - Children not found')
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
      console.info('[WARNING][recalculateGroupLayout] No id passed')
      return
    }
    const group = this.selectGroupById(groupId)
    if (!group) {
      console.info(
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
      console.info(
        `[WARNING][getGroupPrefferedFocusSpatialObject] - Group not found with id ${groupId}`
      )
      return
    }

    const {
      preferredChildFocusId,
      preferredChildFocusIndex,
      shouldTrackChildren,
      lastChildFocusedId,
    } = groups
    const groupChildren = this.selectAllItemsFromGroup(groupId)

    if (shouldTrackChildren && lastChildFocusedId) {
      const lasFocusedChild = groupChildren.find(
        (element) => element.id === lastChildFocusedId
      )

      if (!lasFocusedChild) {
        console.info(
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
        console.info(
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
          console.error(
            `[setNextFocusNodeHandles] - No focused element found with this id: ${id}`
          )
          // todo: type this beter
          return
        }

        const focusedElementGroup = this.selectGroupById(focusedElement.groupId)

        const nextFocusSpatialObjects = getNearestNeighbor(
          focusedElement,
          this.state.collection,
          this.state.nearestNeigborThreshild
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

        console.log(
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
}

export const SpatialApi = new SpatialNavigationApi()

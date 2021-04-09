/* Dependencies
================================================================== */
import {
  NextFocusElements,
  PrioritizedSpatialDirection,
  SpatialDirection,
  SpatialLayoutObject,
  SpatialObject,
  UpdateLayoutProps,
} from './types'

/*
 Return an object with the x0,x1,y0 & y1 coordinates and dimension of element
*/
export function getRect(
  props: Omit<UpdateLayoutProps, 'id'>
): SpatialLayoutObject {
  const { height, width, x, y } = props
  return {
    height,
    width,
    x0: x,
    x1: x + width,
    y0: y,
    y1: y + height,
  }
}

/*
  The getNearestNeighbor function calculates which elements are spatially the
  nearest up/down/right/left neighbor to focused element which (based on their
  spatial positioning) shoud get next foucs.
*/
export function getNearestNeighbor(
  focusedElement: SpatialObject,
  collection: SpatialObject[],
  threshold: number = 0.8,
  shouldLogEvents: boolean = false
): NextFocusElements {
  const prioritizedSpatialDirection = distributeCollectionSpatially(
    focusedElement,
    collection,
    threshold,
    shouldLogEvents
  )

  const sortedSpatialDirection = sortSpatialNeighborsByDistance(
    focusedElement,
    prioritizedSpatialDirection,
    shouldLogEvents
  )

  return {
    nextFocusUp: sortedSpatialDirection.up[0],
    nextFocusRight: sortedSpatialDirection.right[0],
    nextFocusDown: sortedSpatialDirection.down[0],
    nextFocusLeft: sortedSpatialDirection.left[0],
  }
}

/*
  Determine is the element that's being compared falls into the vertically treshold of priority
  of being a potential nextFocus neighbor
*/
function shouldPrioritizeVertically(
  focusedLayout: SpatialLayoutObject,
  elementLayout: SpatialLayoutObject,
  threshold: number
): boolean {
  const isInside =
    elementLayout.x0 >= focusedLayout.x1 && elementLayout.x1 <= focusedLayout.x1

  const isMoreThanThreshold =
    elementLayout.x0 < focusedLayout.x1 &&
    elementLayout.x1 > focusedLayout.x0 &&
    Math.max(elementLayout.x0, focusedLayout.x0) +
      Math.min(elementLayout.x1, focusedLayout.x1) >=
      focusedLayout.x0 + focusedLayout.x1 * threshold

  return isInside || isMoreThanThreshold
}

/*
  Determine is the element that's being compared falls into the horizontal treshold of priority
  of being a potential nextFocus neighbor
*/
function shouldPrioritizeHorizontally(
  focusedLayout: SpatialLayoutObject,
  elementLayout: SpatialLayoutObject,
  threshold: number
): boolean {
  const isInside =
    elementLayout.y0 >= focusedLayout.y1 && elementLayout.y1 <= focusedLayout.y1

  const isMoreThanThreshold =
    elementLayout.y0 < focusedLayout.y1 &&
    elementLayout.y1 > focusedLayout.y0 &&
    Math.max(elementLayout.y0, focusedLayout.y0) +
      Math.min(elementLayout.y1, focusedLayout.y1) >=
      focusedLayout.y0 + focusedLayout.y1 * threshold

  return isInside || isMoreThanThreshold
}

/*
  Distribute all element accross specific butckets based on diretion & priority
  source: https://developer.mozilla.org/en-US/docs/Mozilla/Firefox_OS_for_TV/TV_remote_control_navigation#Algorithm_design
*/
function distributeCollectionSpatially(
  focusedElement: SpatialObject,
  collection: SpatialObject[],
  threshold: number,
  logEvents: boolean = false
): PrioritizedSpatialDirection {
  const { id: focusedId, layout: focusedLayout } = focusedElement
  const prioritizedSpatialDirection: PrioritizedSpatialDirection = {
    primary: {
      up: [],
      right: [],
      down: [],
      left: [],
    },
    secondary: {
      up: [],
      right: [],
      down: [],
      left: [],
    },
  }

  if (!focusedLayout) {
    if (logEvents) {
      console.info(
        '[WARNING][getNewFocusBukets] - Focused element without layout object'
      )
    }

    return prioritizedSpatialDirection
  }

  collection.forEach((element) => {
    const { id: elementId, layout: elementLayout } = element

    // If layout for this element has not been calculated/returned yet
    if (!elementLayout) {
      if (logEvents) {
        console.info(
          `[WARNING][distributeCollectionSpatially] - Element found without layout object: ${elementId}`
        )
      }
      return
    }

    // If it's the same as the focused element
    if (elementId === focusedId) {
      return
    }

    // Define general position
    const isTop = elementLayout.y1 <= focusedLayout.y0
    const isRight = elementLayout.x0 >= focusedLayout.x1
    const isBottom = elementLayout.y0 >= focusedLayout.y1
    const isLeft = elementLayout.x1 <= focusedLayout.x0

    if (isTop) {
      if (shouldPrioritizeVertically(focusedLayout, elementLayout, threshold)) {
        prioritizedSpatialDirection.primary.up.push(element)
      } else {
        prioritizedSpatialDirection.secondary.up.push(element)
      }
    }

    if (isRight) {
      if (
        shouldPrioritizeHorizontally(focusedLayout, elementLayout, threshold)
      ) {
        prioritizedSpatialDirection.primary.right.push(element)
      } else {
        prioritizedSpatialDirection.secondary.right.push(element)
      }
    }

    if (isBottom) {
      if (shouldPrioritizeVertically(focusedLayout, elementLayout, threshold)) {
        prioritizedSpatialDirection.primary.down.push(element)
      } else {
        prioritizedSpatialDirection.secondary.down.push(element)
      }
    }

    if (isLeft) {
      if (
        shouldPrioritizeHorizontally(focusedLayout, elementLayout, threshold)
      ) {
        prioritizedSpatialDirection.primary.left.push(element)
      } else {
        prioritizedSpatialDirection.secondary.left.push(element)
      }
    }
  })

  return prioritizedSpatialDirection
}

/*
  Pass prioritizedSpatialCollection through a sorting function to sort it based on
  their distanced to focused element
*/
function sortSpatialNeighborsByDistance(
  focusedElement: SpatialObject,
  prioritizedSpatialCollection: PrioritizedSpatialDirection,
  logEvents: boolean = false
): SpatialDirection {
  const { layout: focusedLayout, nextFocusRestrictions } = focusedElement
  const { primary, secondary } = prioritizedSpatialCollection

  if (!focusedLayout) {
    if (logEvents) {
      console.info(
        '[WARNING][sortSpatialNeighborsByDistance] foccusedLayout not found'
      )
    }
    return { up: [], right: [], down: [], left: [] }
  }

  const sortedNeighbors = {
    up: sortUpSpatialObjects(
      focusedLayout,
      primary.up,
      secondary.up,
      nextFocusRestrictions.onlyPrimaryTop
    ),
    right: sortRightSpatialObjects(
      focusedLayout,
      primary.right,
      secondary.right,
      nextFocusRestrictions.onlyPrimaryRight
    ),
    down: sortDownSpatialObjects(
      focusedLayout,
      primary.down,
      secondary.down,
      nextFocusRestrictions.onlyPrimaryDown
    ),
    left: sortLeftSpatialObjects(
      focusedLayout,
      primary.left,
      secondary.left,
      nextFocusRestrictions.onlyPrimaryLeft
    ),
  }

  return sortedNeighbors
}

/*
  Sort the elements above the focused element based on their distance
  to focused element. Priority takes precedence. If there's no primary candidates
  sort the secondary collection.
*/
function sortUpSpatialObjects(
  focusedLayout: SpatialLayoutObject,
  primary: SpatialObject[],
  secondary: SpatialObject[],
  onlyPrimary: boolean
): SpatialObject[] {
  if (primary.length > 0 || onlyPrimary) {
    return primary.slice().sort((el1: SpatialObject, el2: SpatialObject) => {
      return el2.layout!.y1 - el1.layout!.y1
    })
  }

  return secondary.slice().sort((el1: SpatialObject, el2: SpatialObject) => {
    const isEl1Left = el1.layout!.x0 <= focusedLayout!.x0
    const isEL2Left = el2.layout!.x0 <= focusedLayout!.x0

    const el1DistanceX = isEl1Left
      ? Math.abs(focusedLayout!.x0 - el1.layout!.x1)
      : Math.abs(el1.layout!.x0 - focusedLayout!.x1)
    const el2DistanceX = isEL2Left
      ? focusedLayout!.x0 - el2.layout!.x1
      : el2.layout!.x0 - focusedLayout!.x1

    return el1DistanceX - el2DistanceX || el2.layout!.y1 - el1.layout!.y1
  })
}

/*
  Sort the elements to the right of the focused element based on their distance
  to focused element. Priority takes precedence. If there's no primary candidates
  sort the secondary collection.
*/
function sortRightSpatialObjects(
  focusedLayout: SpatialLayoutObject,
  primary: SpatialObject[],
  secondary: SpatialObject[],
  onlyPrimary: boolean
): SpatialObject[] {
  if (primary.length > 0 || onlyPrimary) {
    return primary.slice().sort((el1: SpatialObject, el2: SpatialObject) => {
      return el2.layout!.x0 + el1.layout!.x0
    })
  }

  return secondary.slice().sort((el1: SpatialObject, el2: SpatialObject) => {
    const isEl1Above = el1.layout!.y0 <= focusedLayout!.y0
    const isEL2Above = el2.layout!.y0 <= focusedLayout!.y0

    const el1Distance = isEl1Above
      ? focusedLayout!.y0 - el1.layout!.y1
      : el1.layout!.y0 - focusedLayout!.y1
    const el2Distance = isEL2Above
      ? focusedLayout!.y0 - el2.layout!.y1
      : el2.layout!.y0 - focusedLayout!.y1

    return (
      el1Distance - el2Distance ||
      el1.layout!.x0 - focusedLayout.x1 - (el2.layout!.x0 - focusedLayout.x0)
    )
  })
}

/*
  Sort the elements beneath of the focused element based on their distance
  to focused element. Priority takes precedence. If there's no primary candidates
  sort the secondary collection.
*/
function sortDownSpatialObjects(
  focusedLayout: SpatialLayoutObject,
  primary: SpatialObject[],
  secondary: SpatialObject[],
  onlyPrimary: boolean
): SpatialObject[] {
  if (primary.length > 0 || onlyPrimary) {
    return primary.slice().sort((el1: SpatialObject, el2: SpatialObject) => {
      return el1.layout!.y0 + el2.layout!.y0
    })
  }

  return secondary.slice().sort((el1: SpatialObject, el2: SpatialObject) => {
    const isEl1Left = el1.layout!.x0 <= focusedLayout!.x0
    const isEL2Left = el2.layout!.x0 <= focusedLayout!.x0

    const el1DistanceX = isEl1Left
      ? focusedLayout!.x0 - el1.layout!.x1
      : el1.layout!.x0 - focusedLayout!.x1
    const el2DistanceX = isEL2Left
      ? focusedLayout!.x0 - el2.layout!.x1
      : el2.layout!.x0 - focusedLayout!.x1

    return el1DistanceX - el2DistanceX || el1.layout!.y0 + el2.layout!.y0
  })
}

/*
  Sort the elements to the left of the focused element based on their distance
  to focused element. Priority takes precedence. If there's no primary candidates
  sort the secondary collection.
*/
function sortLeftSpatialObjects(
  focusedLayout: SpatialLayoutObject,
  primary: SpatialObject[],
  secondary: SpatialObject[],
  onlyPrimary: boolean
): SpatialObject[] {
  if (primary.length > 0 || onlyPrimary) {
    return primary.slice().sort((el1: SpatialObject, el2: SpatialObject) => {
      return el2.layout!.x1 - el1.layout!.x1
    })
  }

  return secondary.slice().sort((el1: SpatialObject, el2: SpatialObject) => {
    const isEl1Above = el1.layout!.y0 <= focusedLayout!.y0
    const isEL2Above = el2.layout!.y0 <= focusedLayout!.y0

    const el1Distance = isEl1Above
      ? focusedLayout!.y0 - el1.layout!.y1
      : el1.layout!.y0 - focusedLayout!.y1
    const el2Distance = isEL2Above
      ? focusedLayout!.y0 - el2.layout!.y1
      : el2.layout!.y0 - focusedLayout!.y1

    return (
      el1Distance - el2Distance ||
      focusedLayout.x0 - el1.layout!.x1 - (focusedLayout.x0 - el2.layout!.x1)
    )
  })
}

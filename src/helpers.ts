/* Dependencies
================================================================== */
import type {
  NextFocusElements,
  PrioritizedSpatialDirection,
  SpatialDirection2,
  SpatialLayoutObject,
  SpatialObject,
  UpdateLayoutProps,
} from './types';

/*
 Return an object with the x0,x1,y0 & y1 coordinates and dimension of element
*/
export function getRect(
  props: Omit<UpdateLayoutProps, 'id'>
): SpatialLayoutObject {
  const { height, width, x, y } = props;
  return {
    height,
    width,
    x0: x,
    x1: x + width,
    y0: y,
    y1: y + height,
  };
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
  );

  const nearestNeighbor = calculateNearestNeighbor(
    focusedElement,
    prioritizedSpatialDirection,
    shouldLogEvents
  );

  return {
    nextFocusUp: nearestNeighbor.up,
    nextFocusRight: nearestNeighbor.right,
    nextFocusDown: nearestNeighbor.down,
    nextFocusLeft: nearestNeighbor.left,
  };
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
    elementLayout.x0 >= focusedLayout.x1 &&
    elementLayout.x1 <= focusedLayout.x1;

  const isMoreThanThreshold =
    elementLayout.x0 < focusedLayout.x1 &&
    elementLayout.x1 > focusedLayout.x0 &&
    Math.max(elementLayout.x0, focusedLayout.x0) +
      Math.min(elementLayout.x1, focusedLayout.x1) >=
      focusedLayout.x0 + focusedLayout.x1 * threshold;

  return isInside || isMoreThanThreshold;
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
    elementLayout.y0 >= focusedLayout.y1 &&
    elementLayout.y1 <= focusedLayout.y1;

  const isMoreThanThreshold =
    elementLayout.y0 < focusedLayout.y1 &&
    elementLayout.y1 > focusedLayout.y0 &&
    Math.max(elementLayout.y0, focusedLayout.y0) +
      Math.min(elementLayout.y1, focusedLayout.y1) >=
      focusedLayout.y0 + focusedLayout.y1 * threshold;

  return isInside || isMoreThanThreshold;
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
  const { id: focusedId, layout: focusedLayout } = focusedElement;
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
  };

  if (!focusedLayout) {
    if (logEvents) {
      console.info(
        '[WARNING][getNewFocusBukets] - Focused element without layout object'
      );
    }

    return prioritizedSpatialDirection;
  }

  collection.forEach((element) => {
    const { id: elementId, layout: elementLayout } = element;

    // If layout for this element has not been calculated/returned yet
    if (!elementLayout) {
      if (logEvents) {
        console.info(
          `[WARNING][distributeCollectionSpatially] - Element found without layout object: ${elementId}`
        );
      }
      return;
    }

    // If it's the same as the focused element
    if (elementId === focusedId) {
      return;
    }

    // Define general position
    const isTop = elementLayout.y1 <= focusedLayout.y0;
    const isRight = elementLayout.x0 >= focusedLayout.x1;
    const isBottom = elementLayout.y0 >= focusedLayout.y1;
    const isLeft = elementLayout.x1 <= focusedLayout.x0;

    if (isTop) {
      if (shouldPrioritizeVertically(focusedLayout, elementLayout, threshold)) {
        prioritizedSpatialDirection.primary.up.push(element);
      } else {
        prioritizedSpatialDirection.secondary.up.push(element);
      }
    }

    if (isRight) {
      if (
        shouldPrioritizeHorizontally(focusedLayout, elementLayout, threshold)
      ) {
        prioritizedSpatialDirection.primary.right.push(element);
      } else {
        prioritizedSpatialDirection.secondary.right.push(element);
      }
    }

    if (isBottom) {
      if (shouldPrioritizeVertically(focusedLayout, elementLayout, threshold)) {
        prioritizedSpatialDirection.primary.down.push(element);
      } else {
        prioritizedSpatialDirection.secondary.down.push(element);
      }
    }

    if (isLeft) {
      if (
        shouldPrioritizeHorizontally(focusedLayout, elementLayout, threshold)
      ) {
        prioritizedSpatialDirection.primary.left.push(element);
      } else {
        prioritizedSpatialDirection.secondary.left.push(element);
      }
    }
  });

  return prioritizedSpatialDirection;
}

function calculateNearestNeighbor(
  focusedElement: SpatialObject,
  prioritizedSpatialCollection: PrioritizedSpatialDirection,
  logEvents: boolean = false
): SpatialDirection2 {
  const { layout: focusedLayout, nextFocusRestrictions } = focusedElement;
  const { primary, secondary } = prioritizedSpatialCollection;

  if (!focusedLayout) {
    if (logEvents) {
      console.info(
        '[WARNING][sortSpatialNeighborsByDistance] foccusedLayout not found'
      );
    }
    return {
      up: undefined,
      right: undefined,
      down: undefined,
      left: undefined,
    };
  }

  const sortedNeighbors = {
    up: getNearestUpNeighBor(
      focusedLayout,
      primary.up,
      secondary.up,
      nextFocusRestrictions.disableSecondaryUp
    ),
    right: getNearestRightNeighBor(
      focusedLayout,
      primary.right,
      secondary.right,
      nextFocusRestrictions.disableSecondaryRight
    ),
    down: getNearestDownNeighBor(
      focusedLayout,
      primary.down,
      secondary.down,
      nextFocusRestrictions.disableSecondaryDown
    ),
    left: getNearestLeftNeighBor(
      focusedLayout,
      primary.left,
      secondary.left,
      nextFocusRestrictions.disableSecondaryLeft
    ),
  };

  return sortedNeighbors;
}

function getNearestUpNeighBor(
  focusedLayout: SpatialLayoutObject,
  primary: SpatialObject[],
  secondary: SpatialObject[],
  onlyPrimary: boolean
): SpatialObject | undefined {
  let nearestUp: SpatialObject | undefined;
  if (primary.length > 0 || onlyPrimary) {
    primary.forEach((el) => {
      if (!nearestUp || el.layout!.y1 - nearestUp.layout!.y1 > 0) {
        nearestUp = el;
      }
    });

    return nearestUp;
  }

  secondary.forEach((el) => {
    if (!nearestUp) {
      nearestUp = el;
      return;
    }

    const isEl1Left = nearestUp.layout!.x0 <= focusedLayout!.x0;
    const isEL2Left = el.layout!.x0 <= focusedLayout!.x0;

    const el1DistanceX = isEl1Left
      ? Math.abs(focusedLayout!.x0 - nearestUp.layout!.x1)
      : Math.abs(nearestUp.layout!.x0 - focusedLayout!.x1);

    const el2DistanceX = isEL2Left
      ? focusedLayout!.x0 - el.layout!.x1
      : el.layout!.x0 - focusedLayout!.x1;

    if (
      el1DistanceX - el2DistanceX > 0 ||
      el.layout!.y1 - nearestUp.layout!.y1 > 0
    ) {
      nearestUp = el;
    }
  });

  return nearestUp;
}

function getNearestRightNeighBor(
  focusedLayout: SpatialLayoutObject,
  primary: SpatialObject[],
  secondary: SpatialObject[],
  onlyPrimary: boolean
): SpatialObject | undefined {
  let nearestRight: SpatialObject | undefined;
  if (primary.length > 0 || onlyPrimary) {
    primary.forEach((el) => {
      if (!nearestRight || nearestRight.layout!.x0 - el.layout!.x0 > 0) {
        nearestRight = el;
      }
    });

    return nearestRight;
  }

  secondary.forEach((el) => {
    if (!nearestRight) {
      nearestRight = el;
      return;
    }

    const isEl1Above = nearestRight.layout!.y0 <= focusedLayout!.y0;
    const isEL2Above = el.layout!.y0 <= focusedLayout!.y0;

    const el1Distance = isEl1Above
      ? focusedLayout!.y0 - nearestRight.layout!.y1
      : nearestRight.layout!.y0 - focusedLayout!.y1;

    const el2Distance = isEL2Above
      ? focusedLayout!.y0 - el.layout!.y1
      : el.layout!.y0 - focusedLayout!.y1;

    if (
      el1Distance - el2Distance > 0 ||
      nearestRight.layout!.y1 - el.layout!.y1 > 0
    ) {
      nearestRight = el;
    }
  });

  return nearestRight;
}

function getNearestDownNeighBor(
  focusedLayout: SpatialLayoutObject,
  primary: SpatialObject[],
  secondary: SpatialObject[],
  onlyPrimary: boolean
): SpatialObject | undefined {
  let nearestDown: SpatialObject | undefined;
  if (primary.length > 0 || onlyPrimary) {
    primary.forEach((el) => {
      if (!nearestDown || nearestDown.layout!.y0 - el.layout!.y0 > 0) {
        nearestDown = el;
      }
    });

    return nearestDown;
  }

  secondary.forEach((el) => {
    if (!nearestDown) {
      nearestDown = el;
      return;
    }

    const isEl1Left = nearestDown.layout!.x0 <= focusedLayout!.x0;
    const isEL2Left = el.layout!.x0 <= focusedLayout!.x0;

    const el1DistanceX = isEl1Left
      ? focusedLayout!.x0 - nearestDown.layout!.x1
      : nearestDown.layout!.x0 - focusedLayout!.x1;

    const el2DistanceX = isEL2Left
      ? focusedLayout!.x0 - el.layout!.x1
      : el.layout!.x0 - focusedLayout!.x1;

    if (
      el1DistanceX - el2DistanceX > 0 ||
      nearestDown.layout!.y0 - el.layout!.y0 > 0
    ) {
      nearestDown = el;
    }
  });

  return nearestDown;
}

function getNearestLeftNeighBor(
  focusedLayout: SpatialLayoutObject,
  primary: SpatialObject[],
  secondary: SpatialObject[],
  onlyPrimary: boolean
): SpatialObject | undefined {
  let nearestLeft: SpatialObject | undefined;
  if (primary.length > 0 || onlyPrimary) {
    primary.forEach((el) => {
      if (!nearestLeft || el.layout!.x1 - nearestLeft.layout!.x1 > 0) {
        nearestLeft = el;
      }
    });

    return nearestLeft;
  }

  secondary.forEach((el) => {
    if (!nearestLeft) {
      nearestLeft = el;
      return;
    }

    const isEl1Above = nearestLeft.layout!.y0 <= focusedLayout!.y0;
    const isEL2Above = el.layout!.y0 <= focusedLayout!.y0;

    const el1Distance = isEl1Above
      ? focusedLayout!.y0 - nearestLeft.layout!.y1
      : nearestLeft.layout!.y0 - focusedLayout!.y1;

    const el2Distance = isEL2Above
      ? focusedLayout!.y0 - el.layout!.y1
      : el.layout!.y0 - focusedLayout!.y1;

    if (
      el1Distance - el2Distance > 0 ||
      el.layout!.x1 - nearestLeft.layout!.x1 > 0
    ) {
      nearestLeft = el;
    }
  });

  return nearestLeft;
}

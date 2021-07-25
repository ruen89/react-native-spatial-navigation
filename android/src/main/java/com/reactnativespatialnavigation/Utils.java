package com.reactnativespatialnavigation;

import android.util.Log;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

import javax.annotation.Nullable;

public class Utils {

  public static String generateTag(String string) {
    return "##### " + string + " #####";
  }

  public static Map<String, SpatialObject> getNearestNeighbor(SpatialObject focusedElement, Map<String, SpatialObject> spatialObjects, Double nearestNeighborThreshold) {

    Map<String, Map<String, Map<String, SpatialObject>>> prioritizedSpatialDirection = distributeCollectionSpatially(focusedElement, spatialObjects, nearestNeighborThreshold);

    Map<String, SpatialObject> nearestNeighbor = calculateNearestNeighbor(focusedElement, prioritizedSpatialDirection);

    if (false) {
      Log.d("#### nearestUP:", nearestNeighbor.get("up") != null ? nearestNeighbor.get("up").getId() : "null");
      Log.d("#### nearestRight:", nearestNeighbor.get("right") != null ? nearestNeighbor.get("right").getId() : "null");
      Log.d("#### nearestDown:", nearestNeighbor.get("down") != null ? nearestNeighbor.get("down").getId() : "null");
      Log.d("#### nearestLeft:", nearestNeighbor.get("left") != null ? nearestNeighbor.get("left").getId() : "null");
      Log.d("#### nearestLeft:", "*********** end log");
    }

    return nearestNeighbor;
  }

  private static Map<String, Map<String, Map<String, SpatialObject>>> distributeCollectionSpatially(SpatialObject focusedElement, Map<String, SpatialObject> spatialObjects, Double nearestNeighborThreshold) {
    final String TAG = "distributeCollection";
    Map<String, Map<String, SpatialObject>> primary = new HashMap<String, Map<String, SpatialObject>>() {{
      put("up", new HashMap<>());
      put("right", new HashMap<>());
      put("down", new HashMap<>());
      put("left", new HashMap<>());
    }};
    Map<String, Map<String, SpatialObject>> secondary = new HashMap<String, Map<String, SpatialObject>>() {{
      put("up", new HashMap<>());
      put("right", new HashMap<>());
      put("down", new HashMap<>());
      put("left", new HashMap<>());
    }};

    final String focusedId = focusedElement.getId();
    Map<String, Integer> focusedElementLayout = focusedElement.getLayout();

    if (focusedElementLayout.isEmpty()) {
      Log.d(TAG, " focused element layout is empty: " + focusedElement.getId());

      return new HashMap<String, Map<String, Map<String, SpatialObject>>>() {{
        put("primary", primary);
        put("secondary", secondary);
      }};
    }


//    Log.d(TAG, "spatialObjects.entrySet :" + spatialObjects);

    for (Map.Entry<String, SpatialObject> entry : spatialObjects.entrySet()) {
      final SpatialObject element = entry.getValue();
      final String elementId = element.getId();
      final Map<String, Integer> elementLayout = entry.getValue().getLayout();


      if (elementLayout.isEmpty()) {
        Log.w(TAG, "[WARNING][distributeCollectionSpatially] - Element found without layout object: " + elementId);
      } else if (!focusedId.equals(elementId)) {
        final boolean isUp = elementLayout.get("y1") <= focusedElementLayout.get("y0");
        final boolean isRight = elementLayout.get("x0") >= focusedElementLayout.get("x1");
        final boolean isDown = elementLayout.get("y0") >= focusedElementLayout.get("y1");
        final boolean isLeft = elementLayout.get("x1") <= focusedElementLayout.get("x0");

        if (isUp) {
          if (shouldPrioritizeVertically(focusedElementLayout, elementLayout, nearestNeighborThreshold)) {
            primary.get("up").put(elementId, element);
          } else {
            secondary.get("up").put(elementId, element);
          }
        }

        if (isRight) {
          if (shouldPrioritizeHorizontally(focusedElementLayout, elementLayout, nearestNeighborThreshold)) {
            primary.get("right").put(elementId, element);
          } else {
            secondary.get("right").put(elementId, element);
          }
        }

        if (isDown) {
          if (shouldPrioritizeVertically(focusedElementLayout, elementLayout, nearestNeighborThreshold)) {
            primary.get("down").put(elementId, element);
          } else {
            secondary.get("down").put(elementId, element);
          }
        }

        if (isLeft) {
          if (shouldPrioritizeHorizontally(focusedElementLayout, elementLayout, nearestNeighborThreshold)) {
            primary.get("left").put(elementId, element);
          } else {
            secondary.get("left").put(elementId, element);
          }
        }
      }
    }

    return new HashMap<String, Map<String, Map<String, SpatialObject>>>() {{
      put("primary", primary);
      put("secondary", secondary);
    }};
  }

  private static boolean shouldPrioritizeVertically(Map<String, Integer> focusedElementLayout, Map<String, Integer> elementLayout, Double nearestNeighborThreshold) {
    boolean isInside = elementLayout.get("x0") >= focusedElementLayout.get("x1") &&
      elementLayout.get("x1") <= focusedElementLayout.get("x1");

    boolean isMoreThanThreshold = elementLayout.get("x0") < focusedElementLayout.get("x1") &&
      elementLayout.get("x1") > focusedElementLayout.get("x0") &&
      Math.max(elementLayout.get("x0"), focusedElementLayout.get("x0")) +
        Math.min(elementLayout.get("x1"), focusedElementLayout.get("x1")) >=
        focusedElementLayout.get("x0") + focusedElementLayout.get("x1") * nearestNeighborThreshold;

    return isInside || isMoreThanThreshold;
  }

  private static boolean shouldPrioritizeHorizontally(Map<String, Integer> focusedElementLayout, Map<String, Integer> elementLayout, Double nearestNeighborThreshold) {
    boolean isInside = elementLayout.get("y0") >= focusedElementLayout.get("y1") && elementLayout.get("y1") <= focusedElementLayout.get("y1");

    boolean isMoreThanThreshold =
      elementLayout.get("y0") < focusedElementLayout.get("y1") &&
        elementLayout.get("y1") > focusedElementLayout.get("y0") &&
        Math.max(elementLayout.get("y0"), focusedElementLayout.get("y0")) +
          Math.min(elementLayout.get("y1"), focusedElementLayout.get("y1")) >=
          focusedElementLayout.get("y0") + focusedElementLayout.get("y1") * nearestNeighborThreshold;

    return isInside || isMoreThanThreshold;
  }

  private static Map<String, SpatialObject> calculateNearestNeighbor(SpatialObject focusedElement, Map<String, Map<String, Map<String, SpatialObject>>> prioritizedSpatialDirection) {
    final Map<String, Integer> focusedElementLayout = focusedElement.getLayout();
    final Map<String, Boolean> nextFocusRestrictions = focusedElement.getNextFocusRestrictions();
    Map<String, Map<String, SpatialObject>> primary = prioritizedSpatialDirection.get("primary");
    Map<String, Map<String, SpatialObject>> secondary = prioritizedSpatialDirection.get("secondary");

    return new HashMap<String, SpatialObject>() {{
      put("up", getNearestUpNeighBor(focusedElementLayout, primary.get("up"), secondary.get("up"), nextFocusRestrictions.get("disableSecondaryUp")));
      put("right", getNearestRightNeighBor(focusedElementLayout, primary.get("right"), secondary.get("right"), nextFocusRestrictions.get("disableSecondaryRight")));
      put("down", getNearestDownNeighBor(focusedElementLayout, primary.get("down"), secondary.get("down"), nextFocusRestrictions.get("disableSecondaryDown")));
      put("left", getNearestLeftNeighBor(focusedElementLayout, primary.get("left"), secondary.get("left"), nextFocusRestrictions.get("disableSecondaryLeft")));
    }};
  }

  private @Nullable
  static SpatialObject getNearestUpNeighBor(Map<String, Integer> focusedElementLayout, Map<String, SpatialObject> primary, Map<String, SpatialObject> secondary, boolean onlyPrimary) {
    SpatialObject nearestUp = null;

    // If there are SpatialObject stored in the primary map
    // Or if props defined to only look at primary focus
    if (!primary.isEmpty() || onlyPrimary) {
      for (Map.Entry<String, SpatialObject> entry : primary.entrySet()) {
        SpatialObject element = entry.getValue();
        if (nearestUp == null || element.getLayout().get("y1") - nearestUp.getLayout().get("y1") > 0) {
          nearestUp = element;
        }
      }
      // If there are no SpatialObject stored in the primary map
      // And it is allowed to look at the secondary
    } else {
      for (Map.Entry<String, SpatialObject> entry : secondary.entrySet()) {
        SpatialObject element = entry.getValue();

        if (nearestUp == null) {
          nearestUp = element;
        } else {
          Map<String, Integer> nearestUpLayout = nearestUp.getLayout();
          Map<String, Integer> elementLayout = element.getLayout();

          boolean isEl1Left = nearestUpLayout.get("x0") <= focusedElementLayout.get("x0");
          boolean isEL2Left = elementLayout.get("x0") <= focusedElementLayout.get("x0");

          Integer el1DistanceX = isEl1Left
            ? Math.abs(focusedElementLayout.get("x0") - nearestUpLayout.get("x1"))
            : Math.abs(nearestUpLayout.get("x0") - focusedElementLayout.get("x1"));

          Integer el2DistanceX = isEL2Left
            ? focusedElementLayout.get("x0") - elementLayout.get("x1")
            : elementLayout.get("x0") - focusedElementLayout.get("x1");

          if (el1DistanceX - el2DistanceX > 0 || elementLayout.get("y1") - nearestUpLayout.get("y1") > 0) {
            nearestUp = element;
          }
        }
      }
    }

    return nearestUp;
  }

  private @Nullable
  static SpatialObject getNearestRightNeighBor(Map<String, Integer> focusedElementLayout, Map<String, SpatialObject> primary, Map<String, SpatialObject> secondary, boolean onlyPrimary) {
    SpatialObject nearestRight = null;

    // If there are SpatialObject stored in the primary map
    // Or if props defined to only look at primary focus
    if (!primary.isEmpty() || onlyPrimary) {
      for (Map.Entry<String, SpatialObject> entry : primary.entrySet()) {
        SpatialObject element = entry.getValue();
        if (nearestRight == null || nearestRight.getLayout().get("x0") - element.getLayout().get("x0") > 0) {
          nearestRight = element;
        }
      }
      // If there are no SpatialObject stored in the primary map
      // And it is allowed to look at the secondary
    } else {
      for (Map.Entry<String, SpatialObject> entry : secondary.entrySet()) {
        SpatialObject element = entry.getValue();

        if (nearestRight == null) {
          nearestRight = element;
        } else {
          Map<String, Integer> nearestRightLayout = nearestRight.getLayout();
          Map<String, Integer> elementLayout = element.getLayout();

          boolean isEl1Above = nearestRightLayout.get("y0") <= focusedElementLayout.get("y0");
          boolean isEL2Above = elementLayout.get("y0") <= focusedElementLayout.get("y0");

          Integer el1DistanceX = isEl1Above
            ? focusedElementLayout.get("y0") - nearestRightLayout.get("y1")
            : nearestRightLayout.get("y0") - focusedElementLayout.get("y1");

          Integer el2DistanceX = isEL2Above
            ? focusedElementLayout.get("y0") - elementLayout.get("y1")
            : elementLayout.get("y0") - focusedElementLayout.get("y1");

          if (el1DistanceX - el2DistanceX > 0 || nearestRightLayout.get("y1") - elementLayout.get("y1") > 0) {
            nearestRight = element;
          }
        }
      }
    }

    return nearestRight;
  }

  private @Nullable
  static SpatialObject getNearestDownNeighBor(Map<String, Integer> focusedElementLayout, Map<String, SpatialObject> primary, Map<String, SpatialObject> secondary, boolean onlyPrimary) {
    SpatialObject nearestDown = null;

    // If there are SpatialObject stored in the primary map
    // Or if props defined to only look at primary focus
    if (!primary.isEmpty() || onlyPrimary) {
      for (Map.Entry<String, SpatialObject> entry : primary.entrySet()) {
        SpatialObject element = entry.getValue();
        if (nearestDown == null || nearestDown.getLayout().get("y0") - element.getLayout().get("y0") > 0) {
          nearestDown = element;
        }
      }
      // If there are no SpatialObject stored in the primary map
      // And it is allowed to look at the secondary
    } else {
      for (Map.Entry<String, SpatialObject> entry : secondary.entrySet()) {
        SpatialObject element = entry.getValue();

        if (nearestDown == null) {
          nearestDown = element;
        } else {
          Map<String, Integer> nearestDownLayout = nearestDown.getLayout();
          Map<String, Integer> elementLayout = element.getLayout();

          boolean isEl1Left = nearestDownLayout.get("x0") <= focusedElementLayout.get("x0");
          boolean isEL2Left = elementLayout.get("x0") <= focusedElementLayout.get("x0");

          Integer el1DistanceX = isEl1Left
            ? Math.abs(focusedElementLayout.get("x0") - nearestDownLayout.get("x1"))
            : Math.abs(nearestDownLayout.get("x0") - focusedElementLayout.get("x1"));

          Integer el2DistanceX = isEL2Left
            ? focusedElementLayout.get("x0") - elementLayout.get("x1")
            : elementLayout.get("x0") - focusedElementLayout.get("x1");

          if (el1DistanceX - el2DistanceX > 0 || nearestDownLayout.get("y0") - elementLayout.get("y0") > 0) {
            nearestDown = element;
          }
        }
      }
    }

    return nearestDown;
  }

  private @Nullable
  static SpatialObject getNearestLeftNeighBor(Map<String, Integer> focusedElementLayout, Map<String, SpatialObject> primary, Map<String, SpatialObject> secondary, boolean onlyPrimary) {
    SpatialObject nearestLeft = null;

    // If there are SpatialObject stored in the primary map
    // Or if props defined to only look at primary focus
    if (!primary.isEmpty() || onlyPrimary) {
      for (Map.Entry<String, SpatialObject> entry : primary.entrySet()) {
        SpatialObject element = entry.getValue();
        if (nearestLeft == null || element.getLayout().get("x1") - nearestLeft.getLayout().get("x1") > 0) {
          nearestLeft = element;
        }
      }
      // If there are no SpatialObject stored in the primary map
      // And it is allowed to look at the secondary
    } else {
      for (Map.Entry<String, SpatialObject> entry : secondary.entrySet()) {
        SpatialObject element = entry.getValue();

        if (nearestLeft == null) {
          nearestLeft = element;
        } else {
          Map<String, Integer> nearestLeftLayout = nearestLeft.getLayout();
          Map<String, Integer> elementLayout = element.getLayout();

          boolean isEl1Above = nearestLeftLayout.get("y0") <= focusedElementLayout.get("y0");
          boolean isEL2Above = elementLayout.get("y0") <= focusedElementLayout.get("y0");

          Integer el1DistanceX = isEl1Above
            ? focusedElementLayout.get("y0") - nearestLeftLayout.get("y1")
            : nearestLeftLayout.get("y0") - focusedElementLayout.get("y1");

          Integer el2DistanceX = isEL2Above
            ? focusedElementLayout.get("y0") - elementLayout.get("y1")
            : elementLayout.get("y0") - focusedElementLayout.get("y1");

          if (el1DistanceX - el2DistanceX > 0 || elementLayout.get("x1") - focusedElementLayout.get("x1") > 0) {
            nearestLeft = element;
          }
        }
      }
    }

    return nearestLeft;
  }

  public static Map<String, SpatialObject> overrideNearestNeighborIfNeeded(Map<String, SpatialObject> nearestNeighbors, SpatialObject focusedElement, Map<String, SpatialGroup> groups) {
    Map<String, SpatialObject> overriddenValues = new HashMap<>();
    SpatialGroup focusedGroup = groups.get(focusedElement.getGroupId());

    if (focusedGroup == null) {
      throw new java.lang.Error("overrideNearestNeighborIfNeeded" + " - focusedGroup not found: " + focusedElement.getGroupId());
    }

    Map<String, String> focusedGroupNextGroupFocus = focusedGroup.getNextGroupFocus();
    for (Map.Entry<String, SpatialObject> entry : nearestNeighbors.entrySet()) {
      final String key = entry.getKey();
      final SpatialObject element = entry.getValue();
      SpatialObject nextFocusElement = null;

      // If null - there is spatially nothing to focus on remain on current focusedElement
      if (element == null) {
        nextFocusElement = focusedElement;
        // If Next focusElement belongs to the same group as the one currently focused
      } else if (element.getGroupId().equals(focusedElement.getGroupId())) {
        nextFocusElement = element;
        // If Next focusElement belongs to a different group that the one currently focused
      } else {
        SpatialGroup elementGroup = groups.get(element.getGroupId());

        if (elementGroup == null) {
          throw new java.lang.Error("overrideNearestNeighborIfNeeded" + " - elementGroup  not found: " + element.getGroupId());
        }

        // If the group has a prefer group that it want to focus on in the -key- direction
        if (focusedGroupNextGroupFocus.get(key) != null) {
          nextFocusElement = groups.get(focusedGroupNextGroupFocus.get(key)).getFirstChildToGetFocus();

          // Making sure that it never returns a null value which can break the app
         if (nextFocusElement == null) {
           nextFocusElement = element;
         }
        } else {
          // if elementGroup has a preferred focus
          nextFocusElement = elementGroup.getPreferredNextSpatialChildFocus();

          if (nextFocusElement == null) {
            nextFocusElement = element;
          }
        }
      }

      overriddenValues.put(key, nextFocusElement);
    }

    if (false) {
      Log.d("&&&& nextUp:",  overriddenValues.get("up").getId());
      Log.d("&&&& nextRight:", overriddenValues.get("right").getId());
      Log.d("&&&& nextDown:", overriddenValues.get("down").getId());
      Log.d("&&&& nextLeft:", overriddenValues.get("left").getId());
    }

    return overriddenValues;
  }
}

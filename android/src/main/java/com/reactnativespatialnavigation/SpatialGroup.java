package com.reactnativespatialnavigation;

import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.beans.PropertyChangeEvent;
import java.beans.PropertyChangeListener;
import java.lang.reflect.Array;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import javax.annotation.Nullable;

public class SpatialGroup implements PropertyChangeListener {
  private final String TAG;
  private final SpatialNavigationModule spatialNavigationModule;
  private final String id;
  private String groupParentId;
  private final LinkedHashMap<String, String> groupChildIds = new LinkedHashMap<>();
  private boolean hasTVPreferredFocus;
  private String lastChildFocusedId;
  private Integer preferredChildFocusIndex;
  private String preferredChildFocusId;
  private boolean shouldTrackChildren = false;
  private final LinkedHashMap<String, String> spatialChildIds = new LinkedHashMap<>();
  private Map<String, String> nextGroupFocus;
  private boolean isFocused;

  public SpatialGroup(ReadableMap groupConfig, SpatialNavigationModule spatialNavigationModule) {
    this.id = groupConfig.getString("id");
    this.TAG = Utils.generateTag(SpatialGroup.class.getSimpleName() + ": " + this.id);
    this.spatialNavigationModule = spatialNavigationModule;
    isFocused = false;
    lastChildFocusedId = null;
    hasTVPreferredFocus = groupConfig.getBoolean("hasTVPreferredFocus");

    if (groupConfig.hasKey("groupParentId")) {
      this.groupParentId = groupConfig.getString("groupParentId");
      this.registerToParentGroup();
    }

    this.preferredChildFocusIndex = groupConfig.hasKey("preferredChildFocusIndex") && groupConfig.getInt("preferredChildFocusIndex") != -1
      ? groupConfig.getInt("preferredChildFocusIndex")
      : null;

    this.preferredChildFocusId = groupConfig.hasKey("preferredChildFocusId")
      ? groupConfig.getString("preferredChildFocusId")
      : null;

    this.shouldTrackChildren = groupConfig.hasKey("shouldTrackChildren") && groupConfig.getBoolean("shouldTrackChildren");

    nextGroupFocus = new HashMap<String, String>() {{
      put("up", groupConfig.hasKey("nextFocusUpGroup") ? groupConfig.getString("nextFocusUpGroup") : null);
      put("right", groupConfig.hasKey("nextFocusRightGroup") ? groupConfig.getString("nextFocusRightGroup") : null);
      put("down", groupConfig.hasKey("nextFocusDownGroup") ? groupConfig.getString("nextFocusDownGroup") : null);
      put("left", groupConfig.hasKey("nextFocusLeftGroup") ? groupConfig.getString("nextFocusLeftGroup") : null);
    }};
  }

  public String getId() {
    return id;
  }

  public void setHasTVPreferredFocus(boolean shouldSet) {
    this.hasTVPreferredFocus = shouldSet;
  }

  public Map<String, String> getNextGroupFocus() {
    return nextGroupFocus;
  }

  public void registerToParentGroup() {
    if (this.groupParentId != null) {
      SpatialGroup parentGroup = this.getParentGroup();

      if (parentGroup != null) {
        parentGroup.addChildGroup(this);
      } else {
        Log.w(TAG, "!!!!!!!!!!! - registerToParentGroup: Parent with id not found: " + this.groupParentId);
      }
    } else {
      Log.w(TAG, "!!!!!!!!!!! - No parentId supplied");
    }
  }

  public void unregisterToParentGroup() {
    if (this.groupParentId != null) {
      SpatialGroup parentGroup = this.getParentGroup();
      if (parentGroup != null) {
        parentGroup.removeChildGroup(this.id);
      } else {
        Log.w(TAG, "!!!!!!!!!!! - unregisterToParentGroup: Parent with id not found: " + this.groupParentId);
      }
    } else {
      Log.d(TAG, "No parent exist to deregister from");
    }
  }

  public synchronized void test() {
    if (spatialChildIds.size() > 0) {
      for (Map.Entry<String, String> entry : spatialChildIds.entrySet()) {
        SpatialObject spatialObjectChild = spatialNavigationModule.getSpatialObject(entry.getKey());

        if (spatialObjectChild != null) {
          spatialObjectChild.cleanUp();
        }
      }
    }
  }

  public void addChildGroup(final SpatialGroup spatialGroup) {
    String childGroupId = spatialGroup.getId();
    this.groupChildIds.put(childGroupId, childGroupId);
    if (hasTVPreferredFocus) {
      boolean doesIndexMatch = preferredChildFocusIndex != null && groupChildIds.size() - 1 == preferredChildFocusIndex;
      boolean doesIdMatch = preferredChildFocusId != null && preferredChildFocusId.equals(childGroupId);
      boolean shouldDefaultToFirstChild = preferredChildFocusIndex == null && preferredChildFocusId == null && groupChildIds.size() == 1;

      if (doesIndexMatch || doesIdMatch || shouldDefaultToFirstChild) {
        spatialGroup.setHasTVPreferredFocus(true);
      }
    }
  }

  public void removeChildGroup(final String childGroupId) {
    this.groupChildIds.remove(childGroupId);
  }

  public void addChildSpatialObjectId(final SpatialObject spatialObject) {
    String childSpatialObjectId = spatialObject.getId();
    this.spatialChildIds.put(childSpatialObjectId, childSpatialObjectId);

    if (hasTVPreferredFocus) {
      boolean doesIndexMatch = preferredChildFocusIndex != null && spatialChildIds.size() - 1 == preferredChildFocusIndex;
      boolean doesIdMatch = preferredChildFocusId != null && preferredChildFocusId.equals(childSpatialObjectId);
      boolean shouldDefaultToFirstChild = preferredChildFocusIndex == null && preferredChildFocusId == null && spatialChildIds.size() == 1;

      if (doesIndexMatch || doesIdMatch || shouldDefaultToFirstChild) {
        Log.d(TAG, "preferredSpatialObject.focus() " + spatialObject.getId());
        spatialObject.focus();
      }
    }
  }

  public void removeChildSpatialObjectId(final String childSpatialObjectId) {
    this.spatialChildIds.remove(childSpatialObjectId);
  }

  public void onChildFocus(final String childId) {
    updateLastChildFocused(childId);

    if (groupParentId != null) {
      SpatialGroup parentGroup = this.getParentGroup();
      if (parentGroup != null) {
        parentGroup.onChildFocus(id);
      }
    }
  }

  public void updateLastChildFocused(final String childId) {
    if (this.shouldTrackChildren) {
      this.lastChildFocusedId = childId;
    }
  }

  public @Nullable
  SpatialObject getFirstChildToGetFocus() {
    SpatialObject preferredChildToFocus = getPreferredNextSpatialChildFocus();

    if (preferredChildToFocus != null) {
      return preferredChildToFocus;
    }
    if (spatialChildIds.size() > 0) {
      List<String> spatialChildList = new ArrayList<>(spatialChildIds.values());
      String firstSpatialObjectId = spatialChildList.get(0);
      return spatialNavigationModule.getSpatialObject(firstSpatialObjectId);
    }

    if (groupChildIds.size() > 0) {
      List<String> groupChildIdList = new ArrayList<>(groupChildIds.values());
      String firstGroupId = groupChildIdList.get(0);
      SpatialGroup firstGroup = spatialNavigationModule.getGroup(firstGroupId);
     if (firstGroup != null) {
       return firstGroup.getFirstChildToGetFocus();
     }
    }

    return null;
  }

  // todo: refactor to use getFirstChildToGetFocus -- more or less duplicate code
  public void focus() {
    SpatialObject preferredChildToFocus = getPreferredNextSpatialChildFocus();

    if (preferredChildToFocus != null) {
      preferredChildToFocus.focus();
    } else if (spatialChildIds.size() > 0) {
      List<String> spatialChildList = new ArrayList<>(spatialChildIds.values());
      String firstSpatialObjectId = spatialChildList.get(0);
      SpatialObject spatialObject = spatialNavigationModule.getSpatialObject(firstSpatialObjectId);
      spatialObject.focus();
    } else if (groupChildIds.size() > 0) {
      List<String> groupChildIdList = new ArrayList<>(groupChildIds.values());
      String firstGroupId = groupChildIdList.get(0);
      SpatialGroup firstGroup = spatialNavigationModule.getGroup(firstGroupId);
      firstGroup.focus();
    }
  }

  private @Nullable
  SpatialObject getLastFocusedChild() {
    // If group doesn't track last focus child
    if (!this.shouldTrackChildren || lastChildFocusedId == null) {
      return null;
    }

    // Check if last focused child is a SpatialObject
    @Nullable SpatialObject lastFocusSpatialObject = spatialNavigationModule.getSpatialObject(lastChildFocusedId);
    if (lastFocusSpatialObject != null) {
      return lastFocusSpatialObject;
    }

    // Check if last focus child is a SpatialGroup
    @Nullable SpatialGroup lastFocusSpatialGroup = spatialNavigationModule.getGroup(lastChildFocusedId);
    if (lastFocusSpatialGroup != null) {
      return lastFocusSpatialGroup.getPreferredNextSpatialChildFocus();
    }

    return null;
  }

  private @Nullable
  SpatialObject getPreferredChildById() {
    if (preferredChildFocusId == null) {
      return null;
    }

    // Check if last child id is a SpatialObject
    @Nullable SpatialObject spatialObject = spatialNavigationModule.getSpatialObject(preferredChildFocusId);
    if (spatialObject != null) {
      return spatialObject;
    }

    // Check if child id is a SpatialGroup
    @Nullable SpatialGroup spatialGroup = spatialNavigationModule.getGroup(preferredChildFocusId);
    if (spatialGroup != null) {
      return spatialGroup.getPreferredNextSpatialChildFocus();
    }

    return null;
  }

  private @Nullable
  SpatialObject getPreferredChildByIndex() {
    if (preferredChildFocusIndex == null) {
      return null;
    }

    // Check if last child index is a SpatialObject
    if (!spatialChildIds.isEmpty() && preferredChildFocusIndex < spatialChildIds.size()) {
      List<String> spatialChildList = new ArrayList<>(spatialChildIds.values());
      String preferredSpatialChildId = spatialChildList.get(preferredChildFocusIndex);
      return spatialNavigationModule.getSpatialObject(preferredSpatialChildId);
    }

    // If not check if there are groups to focus on
    if (!groupChildIds.isEmpty() && preferredChildFocusIndex < groupChildIds.size()) {
      List<String> groupChildIdList = new ArrayList<>(groupChildIds.values());
      String preferredGroupId = groupChildIdList.get(preferredChildFocusIndex);
      SpatialGroup preferredGroup = spatialNavigationModule.getGroup(preferredGroupId);

      if (preferredGroup == null) {
        throw new java.lang.Error(TAG + " getPreferredChildByIndex - preferredGroup not found with id: " + preferredGroupId);
      }

      SpatialObject spatialObject = preferredGroup.getPreferredNextSpatialChildFocus();

      if (spatialObject == null) {
        throw new java.lang.Error(TAG + " getPreferredChildByIndex - preferredChild not found with index: " + preferredChildFocusIndex);
      }

      return spatialObject;
    }

    return null;
  }

  ;

  public @Nullable
  SpatialObject getPreferredNextSpatialChildFocus() {
    // First check if there is a last focus child
    SpatialObject lastFocusSpatialObject = getLastFocusedChild();
    if (lastFocusSpatialObject != null) {
      return lastFocusSpatialObject;
    }

    // Check if preferredChildFocusId is defined and exist
    SpatialObject preferredSpatialObjectById = getPreferredChildById();
    if (preferredSpatialObjectById != null) {
      return preferredSpatialObjectById;
    }

    // Check if preferredChildFocusIndex is defined and exist
    SpatialObject preferredSpatialObjectByIndex = getPreferredChildByIndex();
    if (preferredSpatialObjectByIndex != null) {
      return preferredSpatialObjectByIndex;
    }

    return null;
  }

  public void logGroupState() {
    Map<String, Object> logMap = new HashMap<String, Object>() {{
      put("id", id);
      put("groupParentId", groupParentId);
      put("lastChildFocusedId", lastChildFocusedId);
      put("preferredChildFocusIndex", preferredChildFocusIndex);
      put("preferredChildFocusId", preferredChildFocusId);
      put("shouldTrackChildren", shouldTrackChildren);
      put("groupChildIds", groupChildIds);
      put("spatialChildIds", spatialChildIds);
    }};

    Log.d(TAG, "************ Logging Group state: " + this.id);
    Log.d(TAG, "" + logMap);
  }

  private @Nullable
  SpatialGroup getParentGroup() {
    if (this.groupParentId != null) {
      Map<String, SpatialGroup> groups = spatialNavigationModule.getGroups();

      return groups.get(this.groupParentId);
    }

    return null;
  }

  @Override
  public void propertyChange(PropertyChangeEvent evt) {
    Map<String, String> oldState = (Map<String, String>) evt.getOldValue();
    Map<String, String> newState = (Map<String, String>) evt.getNewValue();
    WritableMap params = Arguments.createMap();
    params.putString("groupId", id);

    // if this group is focused in the new state
    if (newState.get("groupId").equals(id) && !id.equals(oldState.get("groupId"))) {
      isFocused = true;
      Log.d(TAG, "EMIT FOCUS **********************");
      spatialNavigationModule
        .getReactContext()
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
        .emit("spatialGroupOnFocus", params);
    } else if (!newState.get("groupId").equals(id) && id.equals(oldState.get("groupId"))) {
      isFocused = false;
      Log.d(TAG, "EMIT BLUR =========================");
      spatialNavigationModule
        .getReactContext()
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
        .emit("spatialGroupOnBlur", params);
    }
  }
}

package com.reactnativespatialnavigation;

import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.module.annotations.ReactModule;

import java.beans.PropertyChangeSupport;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import javax.annotation.Nullable;

@ReactModule(name = SpatialNavigationModule.NAME)
public class SpatialNavigationModule extends ReactContextBaseJavaModule {
  public static final String NAME = "SpatialNavigation";
  public static final String TAG = Utils.generateTag("SpatialNavigationModule");
  private final ReactContext reactContext;
  private final LinkedHashMap<String, SpatialGroup> groups = new LinkedHashMap<>();
  private final ConcurrentHashMap<String, SpatialObject> spatialObjects = new ConcurrentHashMap<>();
  private @Nullable
  String focusSpatialObjectId;
  private @Nullable
  String focusGroupId;
  private final Double nearestNeighborThreshold = 0.3;
  private final PropertyChangeSupport support;

  public SpatialNavigationModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
    support = new PropertyChangeSupport(this);
  }

  @Override
  @NonNull
  public String getName() {
    return NAME;
  }

  @ReactMethod
  public void init(Promise promise) {
    Log.d(NAME, "Init success - todo: extend functionality");
    promise.resolve("success");
  }

  @ReactMethod
  public void registerGroup(ReadableMap params, Promise promise) {
    SpatialGroup newGroup = new SpatialGroup(params, this);

    support.addPropertyChangeListener(newGroup);
    this.groups.put(params.getString("id"), newGroup);

    logState("registerGroup");
    promise.resolve(params.getString("id"));
  }

  @ReactMethod
  public void removeGroup(String groupId, Promise promise) {
    SpatialGroup groupToBeRemoved = this.getGroup(groupId);
    if (groupToBeRemoved == null) {
      Log.w(TAG, "!!!!! removeGroup - No group found with this id: " + groupId);
      promise.reject("NOT FOUND", "No group found with this id: " + groupId);
      return;
    }

    support.removePropertyChangeListener(groupToBeRemoved);
    groupToBeRemoved.unregisterToParentGroup();
    this.getGroups().remove(groupId);

    logState("removeGroup");
    promise.resolve(groupId);
  }

  @ReactMethod
  public void registerSpatialObject(ReadableMap spatialObjectParams, Promise promise) {
    this.spatialObjects.put(spatialObjectParams
      .getString("id"), new SpatialObject(spatialObjectParams, this));

    logState("registerSpatialObject");
    promise.resolve(spatialObjectParams.getString("id"));
  }

  @ReactMethod
  public void removeSpatialObject(final String spatialObjectId, Promise promise) {
    SpatialObject spatialObjectToBeRemoved = this.getSpatialObject(spatialObjectId);
    if (spatialObjectToBeRemoved == null) {
      Log.w(TAG, "!!!!! removeSpatialObject - No spatialObject found with this id: " + spatialObjectId);
      promise.reject("NOT FOUND", "Not Spatial Object found with id" + spatialObjectId);
    } else {
      spatialObjectToBeRemoved.cleanUp();
      this.getSpatialObjects().remove(spatialObjectId);
      promise.resolve(spatialObjectId);
    }
  }

  @ReactMethod
  public void setFocusToGroup(String groupId) {
    this.setNativeFocusToGroup(groupId);

  }

  @ReactMethod
  public void setFocusToSpatialObject(String spatialObjectId) {
    this.setNativeFocusToSpatialElement(spatialObjectId);
  }

  public ReactContext getReactContext() {
    return this.reactContext;
  }

  public Map<String, SpatialGroup> getGroups() {
    return this.groups;
  }

  public Map<String, SpatialObject> getSpatialObjects() {
    return this.spatialObjects;
  }

  public @Nullable
  SpatialGroup getGroup(String groupId) {
    return this.getGroups().get(groupId);
  }

  public SpatialObject getSpatialObject(String spatialObjectId) {
    return this.spatialObjects.get(spatialObjectId);
  }

  public void setFocusSpatialObjectId(String spatialObjectId, String groupId) {
    support.firePropertyChange(
      "focusState",
      new HashMap<String, String>() {{
        put("spatialObjectId", focusSpatialObjectId);
        put("groupId", focusGroupId);
      }},
      new HashMap<String, String>() {{
        put("spatialObjectId", spatialObjectId);
        put("groupId", groupId);
      }}
    );

    this.focusSpatialObjectId = spatialObjectId;
    this.focusGroupId = groupId;
  }

  public void updateFocus(String spatialObjectId, String groupId) {
    // todo: add logic to blur prev group or call onFocus on next group
    this.setFocusSpatialObjectId(spatialObjectId, groupId);

  }

  public void setNativeFocusToGroup(String groupId) {
    SpatialGroup group = this.getGroup(groupId);

    if (group == null) {
      throw new Error(TAG + " - setNativeFocusToGroup: group not found: " + groupId);
    }

    group.focus();
  }

  public void setNativeFocusToSpatialElement(String spatialObjectId) {
    SpatialObject spatialObject = this.getSpatialObject(spatialObjectId);

    if (spatialObject == null) {
      throw new Error(TAG + " - setNativeFocusToSpatialElement: spatialObject not found: " + spatialObjectId);
    }

    spatialObject.focus();
  }

  public void getNextFocusNodeHandles(SpatialObject focusedElement) {
    UiThreadUtil.runOnUiThread(() -> {
//      LinkedHashMap<String, SpatialObject> test = new LinkedHashMap<>(this.spatialObjects);
      Map<String, SpatialObject> nearestNeighbors =
        Utils.getNearestNeighbor(focusedElement, spatialObjects, nearestNeighborThreshold);

      Map<String, SpatialObject> nextFocusSpatialObjects = Utils.overrideNearestNeighborIfNeeded(nearestNeighbors, focusedElement, this.getGroups());

      SpatialObject nextFocusUp = nextFocusSpatialObjects.get("up");
      SpatialObject nextFocusRight = nextFocusSpatialObjects.get("right");
      SpatialObject nextFocusDown = nextFocusSpatialObjects.get("down");
      SpatialObject nextFocusLeft = nextFocusSpatialObjects.get("left");


      focusedElement.setNativeViewNextFocusPros(
        nextFocusUp.getNodeHandle(),
        nextFocusRight.getNodeHandle(),
        nextFocusDown.getNodeHandle(),
        nextFocusLeft.getNodeHandle()
      );
    });
  }

  public void recalculateNextFocusNodeHandles() {
    if (focusSpatialObjectId != null) {
      SpatialObject focusedSpatialObject = getSpatialObject(focusSpatialObjectId);

      if (focusedSpatialObject != null) {
        getNextFocusNodeHandles(focusedSpatialObject);
      }
    }
  };

  public void logState(String label) {
    if (false) {
      Map<String, Object> logMap = new HashMap<String, Object>() {{
        put("focusSpatialObjectId", focusSpatialObjectId);
      }};

      Log.d(TAG, "*************************** Logging SpatialNavigation state: " + label);
      Log.d(TAG, "" + logMap);
      logGroupsState();
      logSpatialObjectSate();
      Log.d(TAG, "########################### End Log");
    }
  }

  private synchronized void logGroupsState() {
    Log.d(TAG, "*************************** Logging GROUP STATE $$$$$$$$$$$$$$$$$$$: ");
    for (Map.Entry<String, SpatialGroup> entry : groups.entrySet()) {
      entry.getValue().logGroupState();
    }
    Log.d(TAG, "*************************** END GROUP STATE --------------------: ");
  }

  private synchronized void logSpatialObjectSate() {
    Log.d(TAG, "*************************** Logging SPATIAL OBJECT STATE $$$$$$$$$$$$$$$$$$$: ");
    for (Map.Entry<String, SpatialObject> entry : spatialObjects.entrySet()) {
      entry.getValue().logState();
    }
    Log.d(TAG, "*************************** END SPATIAL OBJECT STATE --------------------: ");
  }
}

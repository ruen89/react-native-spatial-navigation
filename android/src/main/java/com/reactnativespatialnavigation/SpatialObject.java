package com.reactnativespatialnavigation;

import android.graphics.Matrix;
import android.graphics.RectF;
import android.os.Build;
import android.util.Log;
import android.view.View;
import android.view.ViewParent;
import android.widget.ScrollView;

import androidx.annotation.RequiresApi;

import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.uimanager.UIBlock;
import com.facebook.react.uimanager.UIManagerModule;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import javax.annotation.Nullable;

public class SpatialObject {
  private final String TAG;
  private final SpatialNavigationModule spatialNavigationModule;
  private final String id;
  private final String groupId;
  private final Map<String, Integer> layout = new HashMap<>();
  private final Integer nodeHandle;
  private View view;
  private Map<String, Boolean> nextFocusRestrictions = new HashMap<String, Boolean>() {{
    put("disableSecondaryUp", false);
    put("disableSecondaryRight", false);
    put("disableSecondaryDown", false);
    put("disableSecondaryLeft", false);
  }};
  private boolean isFocused = false;
  private final RectF mBoundingBox = new RectF();
  private boolean areListenersSet;


  public SpatialObject(ReadableMap spatialObjectConfig, SpatialNavigationModule spatialNavigationModule) {
    String id = spatialObjectConfig.getString("id");
    String groupId = spatialObjectConfig.getString("groupId");

    this.id = id;

    this.TAG = Utils.generateTag(SpatialObject.class.getSimpleName() + ": " + this.id);

    this.spatialNavigationModule = spatialNavigationModule;

    this.groupId = groupId;

    this.nodeHandle = spatialObjectConfig.getInt("nodeHandle");

    ReadableMap _focusRestrictions = spatialObjectConfig.getMap("nextFocusRestrictions");
    nextFocusRestrictions.put("disableSecondaryUp", _focusRestrictions.getBoolean("disableSecondaryUp"));
    nextFocusRestrictions.put("disableSecondaryRight", _focusRestrictions.getBoolean("disableSecondaryRight"));
    nextFocusRestrictions.put("disableSecondaryDown", _focusRestrictions.getBoolean("disableSecondaryDown"));
    nextFocusRestrictions.put("disableSecondaryLeft", _focusRestrictions.getBoolean("disableSecondaryLeft"));

    areListenersSet = false;
    this.setNativeView();
  }

  public String getId() {
    return this.id;
  }

  public String getGroupId() {
    return this.groupId;
  }

  public Integer getNodeHandle() {
    return this.nodeHandle;
  }

  public Map<String, Boolean> getNextFocusRestrictions() {
    return this.nextFocusRestrictions;
  }

  public Map<String, Integer> getLayout() {
    return layout;
  }

  public void focus() {
    if (view == null) {
      throw new java.lang.Error(TAG + " - Focus: native view not set");
    }

    // Register listeners
    if (!areListenersSet) {
      view.setOnFocusChangeListener(onFocusChangeListener);
      view.addOnLayoutChangeListener(onLayoutChangeListener);
      view.addOnAttachStateChangeListener(onAttachStateChangeListener);
      areListenersSet = true;
    }

    UiThreadUtil.runOnUiThread(() -> {
      view.setFocusable(true);
      view.setFocusableInTouchMode(true);
      view.requestFocus();
    });
  }

  private void registerToGroup() {
    SpatialGroup group = this.spatialNavigationModule.getGroup(this.groupId);

    if (group == null) {
      throw new java.lang.Error(TAG + " - registerToGroup: parent with id not found " + this.groupId);
    }

    group.addChildSpatialObjectId(this);
  }

  public void unregisterToParentGroup() {
    SpatialGroup group = this.spatialNavigationModule.getGroup(this.groupId);

    if (group == null) {
      Log.d(TAG, " - unregisterToParentGroup: parent with id not found " + groupId);
    } else {
      group.removeChildSpatialObjectId(this.id);
    }
  }

  private void setNativeView() {
    ReactContext context = this.spatialNavigationModule.getReactContext();

    UIManagerModule uiManager = context.getNativeModule((UIManagerModule.class));
    uiManager.addUIBlock((UIBlock) nativeViewHierarchyManager -> {
      View nativeView = nativeViewHierarchyManager.resolveView(nodeHandle);

      if (nativeView == null) {
        throw new Error(TAG + " - setNativeView: no view found with this tag");
      }

      view = nativeView;

      configureNativeView();
      registerToGroup();
    });
  }

  private void configureNativeView() {
    setNativeViewNextFocusPros(nodeHandle, nodeHandle, nodeHandle, nodeHandle);
    SpatialGroup group = spatialNavigationModule.getGroup(groupId);

    // Register listeners
    if (!areListenersSet) {
      view.setOnFocusChangeListener(onFocusChangeListener);
      view.addOnLayoutChangeListener(onLayoutChangeListener);
      view.addOnAttachStateChangeListener(onAttachStateChangeListener);
      areListenersSet = true;
    }

    // If view was already focused on mount
    if (view.isFocused()) {
      runNextFocusCalculations();
    } else {
      view.post(this::updateLayout);
    }

//    ViewParent parent = view.getParent();
//
//    while (parent instanceof View) {
//      View parentView = (View) parent;
//
//      if (parent instanceof ScrollView) {
//        Log.w(TAG, "@@@@@@@@@@@@@@ instanceof ScrollView " + parent);
//        ((ScrollView) parent).setOnScrollChangeListener((v, scrollX, scrollY, oldScrollX, oldScrollY) -> Log.d(TAG, "Scrolling %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%"));
//      }
//
//      parent = parentView.getParent();
//    }
  }

  public void cleanUp() {
    if (view != null) {
      view.removeOnLayoutChangeListener(onLayoutChangeListener);
      view.removeOnAttachStateChangeListener(onAttachStateChangeListener);
      unregisterToParentGroup();
      spatialNavigationModule.getSpatialObjects().remove(id);
    }
  }

  private final View.OnFocusChangeListener onFocusChangeListener = new View.OnFocusChangeListener() {
    @Override
    public void onFocusChange(View v, boolean hasFocus) {
      SpatialGroup group = spatialNavigationModule.getGroup(groupId);
      if (hasFocus) {
        isFocused = true;

        if (layout.isEmpty()) {
          updateLayout();
        }

        if (group == null) {
          throw new Error(TAG + " - configureNativeView: group not found: " + groupId);
        }

        group.onChildFocus(id);

        //todo: improve logic to check if next focused could be a ancestor relative
        //Object prevFocusState = spatialNavigationModule.getFocusState();

        Log.d(TAG, "######$$$$ spatialNavigationModule.updateFocus");
        spatialNavigationModule.updateFocus(id, groupId);

        runNextFocusCalculations();
      } else {
        isFocused = false;
      }
    }
  };

  private final View.OnLayoutChangeListener onLayoutChangeListener = new View.OnLayoutChangeListener() {
    @Override
    public void onLayoutChange(View v, int left, int top, int right, int bottom, int oldLeft, int oldTop, int oldRight, int oldBottom) {
      Log.d(TAG, "addOnLayoutChangeListener");
    }
  };

  private final View.OnAttachStateChangeListener onAttachStateChangeListener = new View.OnAttachStateChangeListener() {
    @Override
    public void onViewAttachedToWindow(View v) {

    }

    @Override
    public void onViewDetachedFromWindow(View v) {
      Log.d(TAG, "###### onViewDetachedFromWindow: " + id);
      spatialNavigationModule.logState("onViewDetachedFromWindow");
    }
  };

  private void computeBoundingBox(View view, int[] outputBuffer) {
    mBoundingBox.set(0, 0, view.getWidth(), view.getHeight());
    mapRectFromViewToWindowCoords(view, mBoundingBox);

    outputBuffer[0] = Math.round(mBoundingBox.left);
    outputBuffer[1] = Math.round(mBoundingBox.top);
    outputBuffer[2] = Math.round(mBoundingBox.right - mBoundingBox.left);
    outputBuffer[3] = Math.round(mBoundingBox.bottom - mBoundingBox.top);
  }

  private void mapRectFromViewToWindowCoords(View view, RectF rect) {
    Matrix matrix = view.getMatrix();
    if (!matrix.isIdentity()) {
      matrix.mapRect(rect);
    }

    rect.offset(view.getLeft(), view.getTop());

    ViewParent parent = view.getParent();
    while (parent instanceof View) {
      View parentView = (View) parent;

      rect.offset(-parentView.getScrollX(), -parentView.getScrollY());

      matrix = parentView.getMatrix();
      if (!matrix.isIdentity()) {
        matrix.mapRect(rect);
      }

      rect.offset(parentView.getLeft(), parentView.getTop());

      parent = parentView.getParent();
    }
  }

  public void updateLayout() {
    ViewParent parent = view.getParent();
    int height = view.getHeight();
    int width = view.getWidth();
    int x = view.getLeft();
    int y = view.getTop();
    while (parent instanceof View) {
      View parentView = (View) parent;

      x += parentView.getLeft();
      y += parentView.getTop();

      parent = parentView.getParent();
    }

    layout.put("height", height);
    layout.put("width", width);
    layout.put("x0", x);
    layout.put("x1", x + width);
    layout.put("y0", y);
    layout.put("y1", y + height);

    Log.d(TAG, "###### updateLayout: " + layout);

    spatialNavigationModule.recalculateNextFocusNodeHandles();

    spatialNavigationModule.logState("updateLayout");

    if (isFocused) {
      runNextFocusCalculations();
    }
  }

  public void setNativeViewNextFocusPros(@Nullable Integer nextFocusUp, @Nullable Integer nextFocusRight, @Nullable Integer nextFocusDown, @Nullable Integer nextFocusLeft) {
    // This could happen if while doing runNextFocusCalculations, spatial button was removed
    if (view == null) {
      Log.e(TAG, " - setNativeViewNextFocusPros: native view not set");
      return;
    }

    if (nextFocusUp != null) {
      view.setNextFocusUpId(nextFocusUp);
    }

    if (nextFocusRight != null) {
      view.setNextFocusRightId(nextFocusRight);
    }

    if (nextFocusDown != null) {
      view.setNextFocusDownId(nextFocusDown);
    }

    if (nextFocusLeft != null) {
      view.setNextFocusLeftId(nextFocusLeft);
    }

  }

  private void runNextFocusCalculations() {
    if (layout.isEmpty()) {
      updateLayout();
    }

    spatialNavigationModule.getNextFocusNodeHandles(this);
  }

  public void logState() {
    Map<String, Object> logMap = new HashMap<String, Object>() {{
      put("id", id);
      put("groupId", groupId);
      put("nodeHandle", nodeHandle);
      put("layout", layout);
      put("isFocused", isFocused);
      put("nextFocusRestrictions", nextFocusRestrictions);
    }};

    Log.d(TAG, "************ Logging SpatialObject state: " + this.id);
    Log.d(TAG, "" + logMap);
  }
}

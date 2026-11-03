package com.featherfiesta.game;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.hardware.input.InputManager;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

/**
 * Hosts the HTML5 game in a full-screen WebView and forwards physical game
 * controllers (Bluetooth / USB) to the game as up to four separate players.
 */
public class MainActivity extends Activity implements InputManager.InputDeviceListener {

    private static final String GAME_URL = "https://appassets.androidplatform.net/assets/game/index.html";

    private WebView webView;
    private InputManager inputManager;
    private SharedPreferences prefs;
    private boolean pageReady = false;

    /** Device id assigned to each player slot (-1 = empty). */
    private final int[] slotDevice = {-1, -1, -1, -1};
    /** Last axis values sent per slot, to avoid flooding the WebView. */
    private final float[][] lastAxis = new float[4][2];
    /** D-pad state derived from HAT axes per slot: up, down, left, right. */
    private final boolean[][] hatState = new boolean[4][4];
    private final boolean[][] triggerState = new boolean[4][2];

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = w.getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            w.setAttributes(lp);
        }

        prefs = getSharedPreferences("feather_fiesta", Context.MODE_PRIVATE);
        inputManager = (InputManager) getSystemService(Context.INPUT_SERVICE);

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        webView.addJavascriptInterface(new Bridge(), "AndroidBridge");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                scanControllers();
            }
        });
        setContentView(webView);
        webView.loadUrl(GAME_URL);
        hideSystemUi();
    }

    // ---------------------------------------------------------------- lifecycle

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
        inputManager.registerInputDeviceListener(this, null);
        js("window.__app&&__app.resume()");
        scanControllers();
        hideSystemUi();
    }

    @Override
    protected void onPause() {
        js("window.__app&&__app.pause()");
        inputManager.unregisterInputDeviceListener(this);
        webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) webView.destroy();
        super.onDestroy();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUi();
    }

    @SuppressWarnings("deprecation")
    private void hideSystemUi() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_FULLSCREEN);
        }
    }

    private void js(String code) {
        if (webView != null && pageReady) webView.evaluateJavascript(code, null);
    }

    // --------------------------------------------------------------- controllers

    private static boolean isGameController(InputDevice dev) {
        if (dev == null || dev.isVirtual()) return false;
        int src = dev.getSources();
        return (src & InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD
                || (src & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK;
    }

    private void scanControllers() {
        for (int id : InputDevice.getDeviceIds()) {
            if (isGameController(InputDevice.getDevice(id))) slotFor(id);
        }
    }

    /** Returns the player slot for a device, assigning the first free slot if needed. */
    private int slotFor(int deviceId) {
        for (int i = 0; i < 4; i++) if (slotDevice[i] == deviceId) return i;
        for (int i = 0; i < 4; i++) {
            if (slotDevice[i] == -1) {
                slotDevice[i] = deviceId;
                js("window.__pad&&__pad.conn(" + i + ",true)");
                return i;
            }
        }
        return -1; // more than four controllers
    }

    @Override
    public void onInputDeviceAdded(int deviceId) {
        if (isGameController(InputDevice.getDevice(deviceId))) slotFor(deviceId);
    }

    @Override
    public void onInputDeviceRemoved(int deviceId) {
        for (int i = 0; i < 4; i++) {
            if (slotDevice[i] == deviceId) {
                slotDevice[i] = -1;
                js("window.__pad&&__pad.conn(" + i + ",false)");
            }
        }
    }

    @Override
    public void onInputDeviceChanged(int deviceId) { }

    private static String buttonName(int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_BUTTON_A:
            case KeyEvent.KEYCODE_DPAD_CENTER:
                return "a";
            case KeyEvent.KEYCODE_BUTTON_B:
            case KeyEvent.KEYCODE_BACK:
                return "b";
            case KeyEvent.KEYCODE_BUTTON_X: return "x";
            case KeyEvent.KEYCODE_BUTTON_Y: return "y";
            case KeyEvent.KEYCODE_BUTTON_L1:
            case KeyEvent.KEYCODE_BUTTON_L2:
                return "l";
            case KeyEvent.KEYCODE_BUTTON_R1:
            case KeyEvent.KEYCODE_BUTTON_R2:
                return "r";
            case KeyEvent.KEYCODE_BUTTON_START:
            case KeyEvent.KEYCODE_MENU:
                return "start";
            case KeyEvent.KEYCODE_BUTTON_SELECT:
            case KeyEvent.KEYCODE_BUTTON_MODE:
                return "select";
            case KeyEvent.KEYCODE_DPAD_UP: return "up";
            case KeyEvent.KEYCODE_DPAD_DOWN: return "down";
            case KeyEvent.KEYCODE_DPAD_LEFT: return "left";
            case KeyEvent.KEYCODE_DPAD_RIGHT: return "right";
            default: return null;
        }
    }

    private void sendKey(int slot, String name, boolean down) {
        js("window.__pad&&__pad.key(" + slot + ",'" + name + "'," + down + ")");
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        InputDevice dev = e.getDevice();
        int code = e.getKeyCode();
        if (isGameController(dev)) {
            String name = buttonName(code);
            if (name != null) {
                int slot = slotFor(dev.getId());
                if (slot >= 0) {
                    if (e.getAction() == KeyEvent.ACTION_DOWN && e.getRepeatCount() == 0) sendKey(slot, name, true);
                    else if (e.getAction() == KeyEvent.ACTION_UP) sendKey(slot, name, false);
                }
                return true;
            }
        }
        if (code == KeyEvent.KEYCODE_BACK) {
            // Phone back button / gesture: the game decides what "back" means.
            if (e.getAction() == KeyEvent.ACTION_UP) js("window.__pad&&__pad.back()");
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    private static float centeredAxis(MotionEvent e, InputDevice dev, int axis) {
        InputDevice.MotionRange range = dev.getMotionRange(axis, e.getSource());
        if (range == null) return 0f;
        float flat = Math.max(range.getFlat(), 0.15f);
        float v = e.getAxisValue(axis);
        return Math.abs(v) > flat ? v : 0f;
    }

    @Override
    public boolean dispatchGenericMotionEvent(MotionEvent e) {
        InputDevice dev = e.getDevice();
        if (isGameController(dev)
                && (e.getSource() & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK
                && e.getAction() == MotionEvent.ACTION_MOVE) {
            int slot = slotFor(dev.getId());
            if (slot < 0) return true;

            float x = centeredAxis(e, dev, MotionEvent.AXIS_X);
            float y = centeredAxis(e, dev, MotionEvent.AXIS_Y);
            x = Math.round(x * 50f) / 50f;
            y = Math.round(y * 50f) / 50f;
            if (x != lastAxis[slot][0] || y != lastAxis[slot][1]) {
                lastAxis[slot][0] = x;
                lastAxis[slot][1] = y;
                js("window.__pad&&__pad.axis(" + slot + "," + x + "," + y + ")");
            }

            // Many controllers report the D-pad as a HAT axis instead of key events.
            float hx = e.getAxisValue(MotionEvent.AXIS_HAT_X);
            float hy = e.getAxisValue(MotionEvent.AXIS_HAT_Y);
            boolean[] hat = {hy < -0.5f, hy > 0.5f, hx < -0.5f, hx > 0.5f};
            String[] names = {"up", "down", "left", "right"};
            for (int i = 0; i < 4; i++) {
                if (hat[i] != hatState[slot][i]) {
                    hatState[slot][i] = hat[i];
                    sendKey(slot, names[i], hat[i]);
                }
            }

            // Analog triggers count as L / R.
            float lt = Math.max(e.getAxisValue(MotionEvent.AXIS_LTRIGGER), e.getAxisValue(MotionEvent.AXIS_BRAKE));
            float rt = Math.max(e.getAxisValue(MotionEvent.AXIS_RTRIGGER), e.getAxisValue(MotionEvent.AXIS_GAS));
            boolean l = lt > 0.5f, r = rt > 0.5f;
            if (l != triggerState[slot][0]) { triggerState[slot][0] = l; sendKey(slot, "l", l); }
            if (r != triggerState[slot][1]) { triggerState[slot][1] = r; sendKey(slot, "r", r); }
            return true;
        }
        return super.dispatchGenericMotionEvent(e);
    }

    // -------------------------------------------------------------- JS bridge

    private class Bridge {
        @JavascriptInterface
        public void save(String data) {
            prefs.edit().putString("save", data).apply();
        }

        @JavascriptInterface
        public String load() {
            return prefs.getString("save", null);
        }

        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public void vibrate(int ms) {
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v == null || !v.hasVibrator()) return;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createOneShot(Math.max(1, ms), VibrationEffect.DEFAULT_AMPLITUDE));
            } else {
                v.vibrate(ms);
            }
        }

        @JavascriptInterface
        public void exit() {
            runOnUiThread(MainActivity.this::finishAndRemoveTask);
        }
    }
}

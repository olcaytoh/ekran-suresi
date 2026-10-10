package com.olcico.ekransuresi;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;

public class MainActivity extends BridgeActivity {
    private AppUpdateManager appUpdateManager;
    private static final int UPDATE_REQUEST_CODE = 5001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getWindow() != null) {
            WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        }

        // 1. Force WebView to always fetch fresh assets when online (prevents stale cache)
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                WebSettings settings = webView.getSettings();
                settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                webView.clearCache(false);
            }
        } catch (Exception ignored) {
        }

        // 2. Check Google Play In-App Updates automatically when app opens
        checkForPlayStoreInAppUpdate();
    }

    @Override
    public void onResume() {
        super.onResume();
        if (appUpdateManager != null) {
            appUpdateManager.getAppUpdateInfo().addOnSuccessListener(appUpdateInfo -> {
                if (appUpdateInfo.installStatus() == InstallStatus.DOWNLOADED) {
                    appUpdateManager.completeUpdate();
                } else if (appUpdateInfo.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) {
                    try {
                        appUpdateManager.startUpdateFlowForResult(
                            appUpdateInfo,
                            this,
                            AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build(),
                            UPDATE_REQUEST_CODE
                        );
                    } catch (Exception ignored) {
                    }
                }
            });
        }
    }

    private void checkForPlayStoreInAppUpdate() {
        try {
            appUpdateManager = AppUpdateManagerFactory.create(this);
            appUpdateManager.getAppUpdateInfo().addOnSuccessListener((AppUpdateInfo appUpdateInfo) -> {
                if (appUpdateInfo.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE) {
                    try {
                        if (appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
                            appUpdateManager.startUpdateFlowForResult(
                                appUpdateInfo,
                                this,
                                AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build(),
                                UPDATE_REQUEST_CODE
                            );
                        } else if (appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)) {
                            appUpdateManager.startUpdateFlowForResult(
                                appUpdateInfo,
                                this,
                                AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build(),
                                UPDATE_REQUEST_CODE
                            );
                        }
                    } catch (Exception ignored) {
                    }
                }
            });
        } catch (Exception ignored) {
        }
    }
}
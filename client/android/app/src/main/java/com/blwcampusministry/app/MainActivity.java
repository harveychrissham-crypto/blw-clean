package com.blwcampusministry.app;

import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Must run before super.onCreate() -- this is what actually applies
        // the windowSplashScreen* attributes from styles.xml (see
        // AppTheme.NoActionBarLaunch) on both the real Android 12+ API and,
        // via this compat library, on older versions too. Without this call
        // the theme attributes are declared but never installed, so the OS
        // falls back to its generic default splash regardless of what's in
        // styles.xml.
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
    }
}

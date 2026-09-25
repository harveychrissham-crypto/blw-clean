package com.blwcampusministry.app;

import android.content.ComponentName;
import android.content.pm.PackageManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "AppIcon")
public class AppIconPlugin extends Plugin {
    @PluginMethod
    public void setPalette(PluginCall call) {
        String p = call.getString("palette", "black");
        String suffix = "black".equals(p) ? ".EmetIconBlack" : "blue".equals(p) ? ".EmetIconBlue" : "snow".equals(p) ? ".EmetIconSnow" : ".EmetIconSlate";
        try {
            PackageManager pm = getContext().getPackageManager();
            String pkg = getContext().getPackageName();
            String[] aliases = {".EmetIconBlack",".EmetIconBlue",".EmetIconSnow",".EmetIconSlate"};
            for (String a : aliases) pm.setComponentEnabledSetting(new ComponentName(pkg, pkg+a), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
            pm.setComponentEnabledSetting(new ComponentName(pkg, pkg+suffix), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
            call.resolve();
        } catch (Exception e) { call.reject("Unable to change the app icon.", e); }
    }
}
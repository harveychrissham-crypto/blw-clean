package com.blwcampusministry.app;

import android.app.Activity;
import android.app.PictureInPictureParams;
import android.os.Build;
import android.util.Rational;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MeetingPiP")
public class MeetingPiP extends Plugin {
    @PluginMethod
    public void setEnabled(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", false);
        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            if (activity instanceof MainActivity) {
                ((MainActivity) activity).setMeetingPipEnabled(enabled);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder()
                    .setAspectRatio(new Rational(16, 9));
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    builder.setAutoEnterEnabled(enabled);
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    builder.setSeamlessResizeEnabled(true);
                }
                activity.setPictureInPictureParams(builder.build());
            }
            call.resolve(new JSObject().put("enabled", enabled));
        });
    }

    @PluginMethod
    public void enter(PluginCall call) {
        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                activity.enterPictureInPictureMode(
                    new PictureInPictureParams.Builder()
                        .setAspectRatio(new Rational(16, 9))
                        .build()
                );
            }
            call.resolve();
        });
    }
}

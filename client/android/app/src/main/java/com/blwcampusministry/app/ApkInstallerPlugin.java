package com.blwcampusministry.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    @PluginMethod
    public void installApk(PluginCall call) {
        String url = call.getString("url");

        if (url == null || !url.startsWith("https://")) {
            call.reject("A valid HTTPS APK URL is required.");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !getContext().getPackageManager().canRequestPackageInstalls()) {
            try {
                Intent settingsIntent = new Intent(
                        Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:" + getContext().getPackageName())
                );
                settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(settingsIntent);
            } catch (Exception error) {
                call.reject("Open Android settings and allow BLW Kenya Zone to install apps from this source.");
                return;
            }

            JSObject result = new JSObject();
            result.put("requiresPermission", true);
            call.resolve(result);
            return;
        }

        new Thread(() -> {
            File apkFile = new File(getContext().getCacheDir(), "blw-campus-ministry-update.apk");
            HttpURLConnection connection = null;

            try {
                URL remoteUrl = new URL(url);
                connection = (HttpURLConnection) remoteUrl.openConnection();
                connection.setInstanceFollowRedirects(true);
                connection.setConnectTimeout(20_000);
                connection.setReadTimeout(120_000);
                connection.setRequestMethod("GET");
                connection.setRequestProperty("Accept", "application/vnd.android.package-archive");

                int responseCode = connection.getResponseCode();
                if (responseCode < 200 || responseCode >= 300) {
                    throw new IOException("APK download failed: HTTP " + responseCode);
                }

                try (InputStream input = new BufferedInputStream(connection.getInputStream());
                     OutputStream output = new BufferedOutputStream(new FileOutputStream(apkFile))) {
                    byte[] buffer = new byte[16 * 1024];
                    int count;
                    while ((count = input.read(buffer)) != -1) {
                        output.write(buffer, 0, count);
                    }
                }

                if (!apkFile.exists() || apkFile.length() == 0) {
                    throw new IOException("Downloaded APK is empty.");
                }

                Uri apkUri = FileProvider.getUriForFile(
                        getContext(),
                        getContext().getPackageName() + ".fileprovider",
                        apkFile
                );

                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                getActivity().runOnUiThread(() -> {
                    try {
                        getContext().startActivity(installIntent);
                        call.resolve();
                    } catch (Exception error) {
                        call.reject("Unable to open the Android installer: " + error.getMessage());
                    }
                });
            } catch (Exception error) {
                call.reject("Unable to download the update: " + error.getMessage());
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        }).start();
    }
}

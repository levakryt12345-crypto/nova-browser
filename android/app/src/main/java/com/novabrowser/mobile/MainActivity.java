package com.novabrowser.mobile;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import java.io.File;

public class MainActivity extends AppCompatActivity {

    private WebView web;
    private EditText addr;
    private ImageButton back, fwd, refresh, home;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        web = findViewById(R.id.web);
        addr = findViewById(R.id.addr);
        back = findViewById(R.id.btn_back);
        fwd = findViewById(R.id.btn_fwd);
        refresh = findViewById(R.id.btn_refresh);
        home = findViewById(R.id.btn_home);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setSupportZoom(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSafeBrowsingEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(true);
        CookieManager.getInstance().setAcceptCookie(true);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                } catch (ActivityNotFoundException ignored) {
                }
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                addr.setText(url);
                updateNav();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                addr.setText(url);
                updateNav();
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int progress) {
                refresh.setImageResource(progress < 100 ? R.drawable.ic_stop : R.drawable.ic_refresh);
            }
        });

        web.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                String name = URLUtil.guessFileName(url, contentDisposition, mimetype);
                File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                Toast.makeText(MainActivity.this, "Загрузка: " + name, Toast.LENGTH_SHORT).show();
                try {
                    Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(i);
                } catch (ActivityNotFoundException e) {
                    web.loadUrl("about:blank");
                }
            }
        });

        addr.setOnEditorActionListener((v, actionId, event) -> {
            load(addr.getText().toString());
            web.requestFocus();
            return true;
        });

        back.setOnClickListener(v -> { if (web.canGoBack()) web.goBack(); });
        fwd.setOnClickListener(v -> { if (web.canGoForward()) web.goForward(); });
        refresh.setOnClickListener(v -> { if (web.getProgress() < 100) web.stopLoading(); else web.reload(); });
        home.setOnClickListener(v -> load(HOME_URL));

        updateNav();
        load(getIntent());
    }

    private static final String HOME_URL = "https://www.google.com";

    private String normalize(String input) {
        String s = (input == null ? "" : input.trim());
        if (s.isEmpty()) return HOME_URL;
        if (s.matches("^(https?|ftp)://.*")) return s;
        if (s.matches("^[\\w-]+(\\.[\\w-]+)+([/?#][^\\s]*)?$") || s.matches("^localhost(:\\d+)?([/?#][^\\s]*)?$")) {
            return "https://" + s;
        }
        return "https://www.google.com/search?q=" + Uri.encode(s);
    }

    private void load(String raw) {
        web.loadUrl(normalize(raw));
    }

    private void load(Intent intent) {
        String data = intent == null ? null : intent.getDataString();
        if (data != null && (data.startsWith("http://") || data.startsWith("https://"))) {
            web.loadUrl(data);
            addr.setText(data);
        } else {
            web.loadUrl(HOME_URL);
            addr.setText(HOME_URL);
        }
    }

    private void updateNav() {
        back.setEnabled(web.canGoBack());
        fwd.setEnabled(web.canGoForward());
        back.setAlpha(web.canGoBack() ? 1f : 0.35f);
        fwd.setAlpha(web.canGoForward() ? 1f : 0.35f);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && web.canGoBack()) {
            web.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}

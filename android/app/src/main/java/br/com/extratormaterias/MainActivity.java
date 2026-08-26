package br.com.extratormaterias;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {
    private static final String VERSAO = "1.25.1-ANDROID-WEBVIEW-LAYOUT-MODERNO";
    private static final String RELATIVE_PATH = "Download/ExtratorMaterias/";
    private static final String LAST_FILE = "materia-extraida.txt";
    private static final String HISTORY_FILE = "materias-extraidas.txt";
    private static final String SEPARATOR = "\n######################################################################\n\n";

    private EditText urlInput;
    private Button extractButton, copyButton, historyButton, folderButton;
    private TextView statusText, versionText, metaTitle, metaSubtitle, metaVehicle, metaAuthor, metaDate, metaUrl, bodyText;
    private LinearLayout metaCard, contentCard;
    private WebView webView;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final List<ArticleData> snapshots = new ArrayList<>();
    private String formattedResult = "";
    private String currentUrl = "";
    private int pendingReads = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        setContentView(R.layout.activity_main);
        bindViews();
        applyInsets();
        configureWebView();
        configureActions();
        versionText.setText("Android • Motor " + VERSAO);
    }

    private void bindViews() {
        urlInput = findViewById(R.id.urlInput);
        extractButton = findViewById(R.id.extractButton);
        copyButton = findViewById(R.id.copyButton);
        historyButton = findViewById(R.id.historyButton);
        folderButton = findViewById(R.id.folderButton);
        statusText = findViewById(R.id.statusText);
        versionText = findViewById(R.id.versionText);
        metaCard = findViewById(R.id.metaCard);
        contentCard = findViewById(R.id.contentCard);
        metaTitle = findViewById(R.id.metaTitle);
        metaSubtitle = findViewById(R.id.metaSubtitle);
        metaVehicle = findViewById(R.id.metaVehicle);
        metaAuthor = findViewById(R.id.metaAuthor);
        metaDate = findViewById(R.id.metaDate);
        metaUrl = findViewById(R.id.metaUrl);
        bodyText = findViewById(R.id.bodyText);
        webView = findViewById(R.id.webView);
    }

    private void applyInsets() {
        View root = findViewById(R.id.root);
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            android.graphics.Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars()).toPlatformInsets();
            v.setPadding(0, bars.top, 0, bars.bottom);
            return insets;
        });
    }

    @SuppressWarnings("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setLoadsImagesAutomatically(false);
        s.setUserAgentString(s.getUserAgentString() + " ExtratorMateriasAndroid/1.25.1");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (!url.equals(currentUrl)) return;
                statusText.setText("Página carregada. Aguardando conteúdo completo...");
                snapshots.clear();
                pendingReads = 3;
                handler.postDelayed(() -> captureSnapshot(1), 1200);
                handler.postDelayed(() -> captureSnapshot(2), 3000);
                handler.postDelayed(() -> captureSnapshot(3), 5000);
            }
        });
    }

    private void configureActions() {
        extractButton.setOnClickListener(v -> startExtraction());
        copyButton.setOnClickListener(v -> copyResult());
        historyButton.setOnClickListener(v -> openTextFile(HISTORY_FILE));
        folderButton.setOnClickListener(v -> {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.setType("text/plain");
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            try { startActivity(intent); } catch (Exception e) { setError("Não foi possível abrir o seletor de arquivos."); }
        });
    }

    private void startExtraction() {
        String url = urlInput.getText().toString().trim();
        if (!url.matches("(?i)^https?://.+")) {
            setError("Cole um link válido começando com http:// ou https://");
            return;
        }
        currentUrl = url;
        formattedResult = "";
        metaCard.setVisibility(View.GONE);
        contentCard.setVisibility(View.GONE);
        extractButton.setEnabled(false);
        statusText.setText("Carregando a matéria...");
        webView.stopLoading();
        webView.loadUrl(url);
    }

    private void captureSnapshot(int index) {
        statusText.setText("Lendo conteúdo da página (" + index + "/3)...");
        webView.evaluateJavascript(extractionScript(), value -> {
            try {
                String decoded = new JSONArray("[" + value + "]").getString(0);
                JSONObject o = new JSONObject(decoded);
                ArticleData data = new ArticleData();
                data.title = clean(o.optString("title"));
                data.subtitle = clean(o.optString("subtitle"));
                data.author = clean(o.optString("author"));
                data.date = clean(o.optString("date"));
                data.vehicle = clean(o.optString("vehicle"));
                data.body = cleanBody(o.optString("body"), currentUrl);
                data.url = currentUrl;
                snapshots.add(data);
            } catch (Exception ignored) {}
            pendingReads--;
            if (pendingReads <= 0) finishExtraction();
        });
    }

    private void finishExtraction() {
        ArticleData best = null;
        for (ArticleData d : snapshots) {
            if (best == null || d.body.length() > best.body.length()) best = d;
        }
        if (best == null || best.body.length() < 120) {
            extractButton.setEnabled(true);
            setError("Não foi possível identificar o corpo completo da matéria.");
            return;
        }
        if (best.vehicle.isEmpty()) best.vehicle = vehicleFromUrl(best.url);
        if (best.author.isEmpty()) best.author = "não informado";
        formattedResult = formatResult(best);
        showResult(best);
        saveResult(best, formattedResult);
        extractButton.setEnabled(true);
    }

    private void showResult(ArticleData d) {
        metaTitle.setText(d.title.isEmpty() ? "Título não identificado" : d.title);
        metaSubtitle.setText(d.subtitle.isEmpty() ? "" : d.subtitle);
        metaSubtitle.setVisibility(d.subtitle.isEmpty() ? View.GONE : View.VISIBLE);
        metaVehicle.setText("Veículo: " + d.vehicle);
        metaAuthor.setText("Autor: " + d.author);
        metaDate.setText("Data: " + (d.date.isEmpty() ? "não informada" : d.date));
        metaUrl.setText(d.url);
        bodyText.setText(d.body);
        metaCard.setVisibility(View.VISIBLE);
        contentCard.setVisibility(View.VISIBLE);
    }

    private String formatResult(ArticleData d) {
        StringBuilder b = new StringBuilder();
        b.append(d.url).append("\n\n");
        b.append(d.vehicle).append("\n\n");
        b.append("*").append(d.title).append("*").append("\n\n");
        if (!d.subtitle.isEmpty()) b.append("_").append(d.subtitle).append("_").append("\n\n");
        b.append(d.author).append("\n\n");
        if (!d.date.isEmpty()) b.append(d.date).append("\n\n");
        b.append(d.body.trim());
        return b.toString().trim();
    }

    private String clean(String s) {
        return s == null ? "" : s.replace('\u00A0', ' ').replaceAll("\\s+", " ").trim();
    }

    private String cleanBody(String body, String url) {
        String[] raw = body.replace("\r", "").split("\\n\\s*\\n|\\n");
        List<String> out = new ArrayList<>();
        boolean g1 = url.toLowerCase(Locale.ROOT).contains("g1.globo.com");
        for (String item : raw) {
            String p = clean(item);
            if (p.length() < 2) continue;
            String n = p.toLowerCase(Locale.ROOT);
            if (n.matches("^(publicidade|anúncio|compartilhe|leia também|veja também|leia mais|saiba mais)$")) continue;
            if (n.startsWith("continua depois da publicidade") || n.startsWith("artigo continua abaixo")) continue;
            if (g1 && (n.equals("agora no g1") || n.equals("mais do g1"))) break;
            if (g1 && (n.contains("vídeos em alta no g1") || n.startsWith("vídeos: as notícias que foram ao ar"))) continue;
            if (!out.isEmpty() && out.get(out.size() - 1).equalsIgnoreCase(p)) continue;
            out.add(p);
        }
        return String.join("\n\n", out).trim();
    }

    private String vehicleFromUrl(String url) {
        String u = url.toLowerCase(Locale.ROOT);
        if (u.contains("g1.globo.com")) return "G1";
        if (u.contains("cnnbrasil.com.br")) return "CNN Brasil";
        if (u.contains("folha.uol.com.br")) return "Folha de S.Paulo";
        if (u.contains("uol.com.br")) return "UOL";
        if (u.contains("metropoles.com")) return "Metrópoles";
        if (u.contains("r7.com")) return "R7";
        try { return Uri.parse(url).getHost().replace("www.", ""); } catch (Exception e) { return "Veículo não identificado"; }
    }

    private void saveResult(ArticleData data, String text) {
        new Thread(() -> {
            try {
                writeDownloadFile(LAST_FILE, text);
                String old = readDownloadFile(HISTORY_FILE);
                boolean duplicate = old.contains(data.url);
                if (!duplicate) writeDownloadFile(HISTORY_FILE, old.isEmpty() ? text : old + SEPARATOR + text);
                runOnUiThread(() -> {
                    copyResult();
                    statusText.setText(duplicate
                            ? "✓ Matéria salva. URL já existia no histórico. Texto copiado."
                            : "✓ Matéria salva em Downloads/ExtratorMaterias. Texto copiado.");
                });
            } catch (Exception e) {
                runOnUiThread(() -> setError("Extração concluída, mas não foi possível salvar o TXT: " + e.getMessage()));
            }
        }).start();
    }

    private Uri findDownload(String name) {
        ContentResolver cr = getContentResolver();
        Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        String[] projection = { MediaStore.Downloads._ID };
        String selection = MediaStore.Downloads.DISPLAY_NAME + "=? AND " + MediaStore.Downloads.RELATIVE_PATH + "=?";
        try (Cursor c = cr.query(collection, projection, selection, new String[]{name, RELATIVE_PATH}, null)) {
            if (c != null && c.moveToFirst()) return ContentUris.withAppendedId(collection, c.getLong(0));
        }
        return null;
    }

    private void writeDownloadFile(String name, String text) throws Exception {
        ContentResolver cr = getContentResolver();
        Uri uri = findDownload(name);
        if (uri == null) {
            ContentValues v = new ContentValues();
            v.put(MediaStore.Downloads.DISPLAY_NAME, name);
            v.put(MediaStore.Downloads.MIME_TYPE, "text/plain");
            v.put(MediaStore.Downloads.RELATIVE_PATH, RELATIVE_PATH);
            uri = cr.insert(MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY), v);
        }
        if (uri == null) throw new IllegalStateException("Não foi possível criar " + name);
        try (OutputStream os = cr.openOutputStream(uri, "wt")) {
            if (os == null) throw new IllegalStateException("Sem acesso de escrita");
            os.write(text.getBytes(StandardCharsets.UTF_8));
        }
    }

    private String readDownloadFile(String name) {
        try {
            Uri uri = findDownload(name);
            if (uri == null) return "";
            StringBuilder b = new StringBuilder();
            try (InputStream is = getContentResolver().openInputStream(uri);
                 BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                String line;
                while ((line = r.readLine()) != null) b.append(line).append('\n');
            }
            return b.toString().trim();
        } catch (Exception e) { return ""; }
    }

    private void openTextFile(String name) {
        Uri uri = findDownload(name);
        if (uri == null) { setError("O arquivo ainda não foi criado."); return; }
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "text/plain");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try { startActivity(intent); } catch (Exception e) { setError("Não há aplicativo para abrir o TXT."); }
    }

    private void copyResult() {
        if (formattedResult.isEmpty()) return;
        ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        cm.setPrimaryClip(ClipData.newPlainText("Matéria extraída", formattedResult));
    }

    private void setError(String message) {
        statusText.setText("⚠ " + message);
    }

    private String extractionScript() {
        return "(function(){try{" +
                "function t(s){return (s||'').replace(/\\s+/g,' ').trim()}" +
                "function m(sel,attr){var e=document.querySelector(sel);return e?t(attr?e.getAttribute(attr):e.textContent):''}" +
                "var roots=[].slice.call(document.querySelectorAll('article,main,[role=main]'));if(!roots.length)roots=[document.body];" +
                "var root=roots.sort(function(a,b){return (b.innerText||'').length-(a.innerText||'').length})[0].cloneNode(true);" +
                "root.querySelectorAll('script,style,noscript,nav,footer,aside,form,button,iframe,[class*=advert],[class*=publicidade],[class*=share],[class*=social],[class*=related],[class*=recommend],[class*=newsletter]').forEach(function(e){e.remove()});" +
                "var blocks=[].slice.call(root.querySelectorAll('p,h2,h3,blockquote,li')).map(function(e){return t(e.innerText)}).filter(function(x){return x.length>15&&!/^(Publicidade|Anúncio|Compartilhe|Leia também|Veja também|Leia mais|Saiba mais)$/i.test(x)});" +
                "var title=m('h1')||m('meta[property=\\\"og:title\\\"]','content')||document.title;" +
                "var subtitle=m('meta[name=\\\"description\\\"]','content')||m('meta[property=\\\"og:description\\\"]','content');" +
                "var author=m('meta[name=\\\"author\\\"]','content')||m('[rel=author]')||m('[class*=author]');" +
                "var date=m('meta[property=\\\"article:published_time\\\"]','content')||m('time','datetime')||m('time');" +
                "var vehicle=m('meta[property=\\\"og:site_name\\\"]','content');" +
                "return JSON.stringify({title:t(title),subtitle:t(subtitle),author:t(author),date:t(date),vehicle:t(vehicle),body:blocks.join('\\n\\n')});" +
                "}catch(e){return JSON.stringify({error:String(e),body:''})}})();";
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (webView != null) webView.destroy();
        super.onDestroy();
    }

    private static class ArticleData {
        String url = "";
        String vehicle = "";
        String title = "";
        String subtitle = "";
        String author = "";
        String date = "";
        String body = "";
    }
}

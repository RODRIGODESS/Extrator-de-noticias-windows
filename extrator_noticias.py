import os
import re
import threading
import tkinter as tk
from tkinter import ttk, messagebox
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

APP_NAME = "Extrator de Notícias"
VERSION = "V1.25.9"


def clean_text(value):
    if not value:
        return ""
    return re.sub(r"\s+", " ", value).strip()


def meta(soup, *names):
    for name in names:
        tag = soup.find("meta", attrs={"property": name}) or soup.find("meta", attrs={"name": name})
        if tag and tag.get("content"):
            return clean_text(tag["content"])
    return ""


def extract_article(url, proxy=""):
    proxies = None
    if proxy.strip():
        p = proxy.strip()
        if not p.startswith(("http://", "https://")):
            p = "http://" + p
        proxies = {"http": p, "https": p}

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
    }
    r = requests.get(url, headers=headers, proxies=proxies, timeout=35)
    r.raise_for_status()
    r.encoding = r.apparent_encoding or r.encoding
    soup = BeautifulSoup(r.text, "html.parser")

    for tag in soup(["script", "style", "noscript", "svg", "nav", "footer", "aside", "form"]):
        tag.decompose()

    title = meta(soup, "og:title", "twitter:title")
    if not title and soup.title:
        title = clean_text(soup.title.get_text(" "))

    subtitle = meta(soup, "og:description", "description", "twitter:description")
    author = meta(soup, "author", "article:author") or "não informado"
    date = meta(soup, "article:published_time", "datePublished", "date", "pubdate")
    vehicle = meta(soup, "og:site_name") or urlparse(url).netloc.replace("www.", "")

    article = soup.find("article") or soup.find("main")
    scope = article if article else soup
    paragraphs = []
    seen = set()
    for p in scope.find_all("p"):
        text = clean_text(p.get_text(" "))
        if len(text) >= 35 and text not in seen:
            seen.add(text)
            paragraphs.append(text)

    body = "\n\n".join(paragraphs)
    if not body:
        body = "Não foi possível identificar automaticamente o corpo da matéria."

    return {
        "Título": title or "não identificado",
        "Veículo": vehicle or "não identificado",
        "Subtítulo": subtitle or "não informado",
        "Autor": author,
        "Data": date or "não informada",
        "Link": url,
        "Texto": body,
    }


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(f"{APP_NAME} {VERSION}")
        self.geometry("1040x720")
        self.minsize(850, 600)
        self.configure(bg="#10151f")
        self._style()
        self._ui()

    def _style(self):
        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except Exception:
            pass
        style.configure("TFrame", background="#10151f")
        style.configure("Card.TFrame", background="#182130")
        style.configure("TLabel", background="#10151f", foreground="#e8eef7", font=("Segoe UI", 10))
        style.configure("Title.TLabel", background="#10151f", foreground="#ffffff", font=("Segoe UI Semibold", 22))
        style.configure("Sub.TLabel", background="#10151f", foreground="#93a4bb", font=("Segoe UI", 10))
        style.configure("TButton", font=("Segoe UI Semibold", 10), padding=(14, 9))
        style.configure("TEntry", padding=8)
        style.configure("TNotebook", background="#10151f", borderwidth=0)
        style.configure("TNotebook.Tab", font=("Segoe UI Semibold", 10), padding=(14, 8))

    def _ui(self):
        top = ttk.Frame(self)
        top.pack(fill="x", padx=24, pady=(20, 10))
        ttk.Label(top, text="Extrator de Notícias", style="Title.TLabel").pack(anchor="w")
        ttk.Label(top, text=f"Windows Portable • {VERSION}", style="Sub.TLabel").pack(anchor="w", pady=(2, 0))

        nb = ttk.Notebook(self)
        nb.pack(fill="both", expand=True, padx=24, pady=(4, 22))
        main = ttk.Frame(nb, style="Card.TFrame")
        proxy = ttk.Frame(nb, style="Card.TFrame")
        nb.add(main, text="Extrair notícia")
        nb.add(proxy, text="Proxy")

        input_frame = ttk.Frame(main, style="Card.TFrame")
        input_frame.pack(fill="x", padx=18, pady=18)
        ttk.Label(input_frame, text="Link da matéria", background="#182130", foreground="#e8eef7").pack(anchor="w")
        self.url = ttk.Entry(input_frame)
        self.url.pack(fill="x", pady=(6, 10))
        btns = ttk.Frame(input_frame, style="Card.TFrame")
        btns.pack(fill="x")
        ttk.Button(btns, text="Extrair", command=self.start_extract).pack(side="left")
        ttk.Button(btns, text="Limpar", command=self.clear).pack(side="left", padx=8)
        ttk.Button(btns, text="Copiar resultado", command=self.copy_result).pack(side="left")

        self.status = tk.StringVar(value="Pronto")
        ttk.Label(input_frame, textvariable=self.status, background="#182130", foreground="#93a4bb").pack(anchor="e", pady=(8, 0))

        self.text = tk.Text(main, wrap="word", bg="#0d131c", fg="#e8eef7", insertbackground="white", relief="flat", font=("Segoe UI", 10), padx=14, pady=14)
        self.text.pack(fill="both", expand=True, padx=18, pady=(0, 18))

        pframe = ttk.Frame(proxy, style="Card.TFrame")
        pframe.pack(fill="x", padx=18, pady=18)
        ttk.Label(pframe, text="Proxy (opcional)", background="#182130", foreground="#e8eef7").pack(anchor="w")
        ttk.Label(pframe, text="Exemplo: proxy.exemplo:6060", background="#182130", foreground="#93a4bb").pack(anchor="w", pady=(2, 8))
        self.proxy = ttk.Entry(pframe)
        self.proxy.pack(fill="x")

    def start_extract(self):
        url = self.url.get().strip()
        if not url.startswith(("http://", "https://")):
            messagebox.showwarning(APP_NAME, "Informe um link válido começando com http:// ou https://")
            return
        self.status.set("Extraindo matéria...")
        threading.Thread(target=self._extract, args=(url,), daemon=True).start()

    def _extract(self, url):
        try:
            data = extract_article(url, self.proxy.get())
            out = (
                f"TÍTULO: {data['Título']}\n"
                f"VEÍCULO: {data['Veículo']}\n"
                f"SUBTÍTULO: {data['Subtítulo']}\n"
                f"AUTOR: {data['Autor']}\n"
                f"DATA: {data['Data']}\n"
                f"LINK: {data['Link']}\n\n"
                f"TEXTO\n{'=' * 70}\n{data['Texto']}"
            )
            self.after(0, lambda: self._show(out))
        except Exception as e:
            self.after(0, lambda: self._error(str(e)))

    def _show(self, out):
        self.text.delete("1.0", "end")
        self.text.insert("1.0", out)
        self.status.set("Extração concluída")

    def _error(self, err):
        self.status.set("Falha na extração")
        messagebox.showerror(APP_NAME, f"Não foi possível extrair a matéria.\n\n{err}")

    def clear(self):
        self.url.delete(0, "end")
        self.text.delete("1.0", "end")
        self.status.set("Pronto")

    def copy_result(self):
        value = self.text.get("1.0", "end-1c")
        if value:
            self.clipboard_clear()
            self.clipboard_append(value)
            self.status.set("Resultado copiado")


if __name__ == "__main__":
    App().mainloop()

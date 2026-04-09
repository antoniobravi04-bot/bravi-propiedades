"""
scraper.py - Bravi Propiedades
Lee propiedades de MapaProp (bravipropiedades.com.ar) y genera properties.json.

Uso:
    pip install requests beautifulsoup4
    python scraper.py
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import sys
import time

BASE_URL = "https://www.bravipropiedades.com.ar"
HEADERS  = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# operation=1 → Ventas, operation=2 → Alquileres
OPERATIONS = [
    ("1", "Venta"),
    ("2", "Alquiler"),
]

MAX_PAGES = 20


def get_page(url):
    r = requests.get(url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    r.encoding = "utf-8"
    return r.text


def limpiar(texto):
    if not texto:
        return ""
    return re.sub(r'\s+', ' ', texto).strip()


def scrape_cards(html):
    """Parsea las cards .searchpage-item de MapaProp."""
    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select("div.searchpage-item")
    props = []

    for card in cards:
        prop_id = card.get("id", "")

        # Link
        a_tag = card.select_one("div.data .title a, a[href*='/propiedad/']")
        link = ""
        if a_tag:
            link = a_tag["href"]
            if not link.startswith("http"):
                link = BASE_URL + link

        # Título
        titulo = limpiar(a_tag.get_text()) if a_tag else ""

        # Imagen
        img_tag = card.select_one("img.searchpage-item-image")
        imagen = img_tag["src"] if img_tag else ""

        # Precio
        precio_tag = card.select_one("div.price")
        precio_raw = limpiar(precio_tag.get_text()) if precio_tag else ""
        precio = ""
        m = re.search(r'USD\s*([\d\.,]+)', precio_raw, re.I)
        if m:
            num = re.sub(r'[,\.]', '', m.group(1))
            if num and int(num) > 100:
                precio = "USD {:,}".format(int(num)).replace(",", ".")
        if not precio:
            m = re.search(r'\$\s*([\d\.,]+)', precio_raw)
            if m:
                num = re.sub(r'[,\.]', '', m.group(1))
                if num and int(num) > 100:
                    precio = "${:,}".format(int(num)).replace(",", ".")
        if not precio:
            precio = limpiar(precio_raw)

        # Código y dirección desde .description
        desc_tag = card.select_one("div.description")
        desc_texto = limpiar(desc_tag.get_text()) if desc_tag else ""

        codigo = ""
        m = re.search(r'[Cc][oó]d\.?\s*([\w\-]+)', desc_texto)
        if m:
            codigo = m.group(1).strip()

        direccion = ""
        strong = card.select_one("div.description strong")
        if strong:
            direccion = limpiar(strong.get_text())

        # Tipo operación
        tl = (titulo + link).lower()
        op_tag = card.select_one("div.searchpage-item-operation-tag a")
        if op_tag:
            tipo = limpiar(op_tag.get_text())
        else:
            tipo = "Alquiler" if "alquiler" in tl else "Venta"

        # Tipo de propiedad
        if "terreno" in tl or "lote" in tl:
            tipoProp = "terreno"
        elif "local" in tl or "comerci" in tl:
            tipoProp = "local"
        elif "oficina" in tl:
            tipoProp = "oficina"
        elif "galpon" in tl or "galpón" in tl or "nave" in tl:
            tipoProp = "galpon"
        elif "depto" in tl or "dpto" in tl or "departamento" in tl or "apart" in tl:
            tipoProp = "departamento"
        elif "quinta" in tl or "chalet" in tl or "country" in tl:
            tipoProp = "quinta"
        elif "casa" in tl or "duplex" in tl or "dúplex" in tl:
            tipoProp = "casa"
        else:
            tipoProp = ""

        # Dormitorios
        dormitorios = ""
        m = re.search(r'[Dd]ormitorio[s]?\D{0,5}(\d)', desc_texto)
        if m:
            dormitorios = m.group(1)

        if link or titulo:
            props.append({
                "id":       prop_id,
                "titulo":   titulo,
                "imagen":   imagen,
                "imagenes": [imagen] if imagen else [],
                "link":     link,
                "codigo":   codigo,
                "tipo":     tipo,
                "precio":   precio,
                "dormitorios": dormitorios,
                "banos":    "",
                "superficie": "",
                "tipoProp": tipoProp,
                "descripcion": desc_texto,
                "direccion": direccion,
            })

    return props


def scrape_markers(html):
    """Fallback: extrae propiedades del array markers[] en el JS de la página."""
    patron = re.compile(
        r'markers\s*\[\s*markers\.length\s*\]\s*=\s*\{([^}]+)\}',
        re.DOTALL
    )
    bloques = patron.findall(html)
    props = []
    for b in bloques:
        def campo(nombre):
            m = re.search(r'{}["\']?\s*:\s*"([^"]*)"'.format(nombre), b)
            return m.group(1).strip() if m else ""

        titulo = campo("title")
        imagen = campo("image")
        link   = campo("link")
        codigo = campo("code")

        if link and not link.startswith("http"):
            link = BASE_URL + link

        tl = (titulo + link).lower()
        tipo = "Alquiler" if ("alquiler" in tl or "/alq" in tl) else "Venta"

        if "terreno" in tl or "lote" in tl:
            tipoProp = "terreno"
        elif "local" in tl or "comerci" in tl:
            tipoProp = "local"
        elif "depto" in tl or "dpto" in tl or "departamento" in tl or "apart" in tl:
            tipoProp = "departamento"
        elif "quinta" in tl or "chalet" in tl or "country" in tl:
            tipoProp = "quinta"
        elif "casa" in tl or "duplex" in tl:
            tipoProp = "casa"
        else:
            tipoProp = ""

        if titulo or imagen:
            props.append({
                "titulo": titulo,
                "imagen": imagen,
                "imagenes": [],
                "link": link,
                "codigo": codigo,
                "tipo": tipo,
                "precio": "",
                "dormitorios": "",
                "banos": "",
                "superficie": "",
                "tipoProp": tipoProp,
                "descripcion": "",
                "direccion": "",
            })
    return props


def enriquecer(props):
    print("\nEnriqueciendo propiedades con datos de detalle...")
    for i, p in enumerate(props):
        if not p["link"]:
            continue
        try:
            html = get_page(p["link"])

            # Precio USD
            if not p["precio"]:
                m = re.search(r'USD\s*([\d\.,]+)', html, re.I)
                if m:
                    num = re.sub(r'[,\.]', '', m.group(1))
                    if num and int(num) > 1000:
                        p["precio"] = "USD {:,}".format(int(num)).replace(",", ".")

            # Precio ARS
            if not p["precio"]:
                m = re.search(r'ARS\s*([\d\.,]+)', html, re.I)
                if not m:
                    m = re.search(r'\$\s*([\d\.]+)', html)
                if m:
                    num = re.sub(r'[,\.]', '', m.group(1))
                    if num and int(num) > 1000:
                        p["precio"] = "${:,}".format(int(num)).replace(",", ".")

            # Dormitorios
            if not p["dormitorios"]:
                m = re.search(r'[Dd]ormitorio[s]?\D{0,5}(\d)', html)
                if m:
                    p["dormitorios"] = m.group(1)

            # Baños
            m = re.search(r'[Bb]a[ñn]o[s]?\D{0,5}(\d)', html)
            if m:
                p["banos"] = m.group(1)

            # Superficie
            m = re.search(r'[Cc]ubierta[^\d]{0,10}(\d+)', html)
            if not m:
                m = re.search(r'(\d{2,4})\s*m2', html)
            if m:
                p["superficie"] = m.group(1) + " m2"

            # Imágenes
            soup = BeautifulSoup(html, "html.parser")
            imgs = []
            for img_tag in soup.find_all("img"):
                src = img_tag.get("src") or img_tag.get("data-src") or ""
                if src and any(x in src for x in ["fotos", "images", "uploads", "foto", "img"]):
                    if src not in imgs and not src.endswith(".gif"):
                        imgs.append(src)
            if imgs:
                p["imagenes"] = imgs[:10]
            elif p["imagen"]:
                p["imagenes"] = [p["imagen"]]

            # Descripción
            for sel in ["div.descripcion", "div.description", "p.descripcion",
                        "div.detalle-descripcion", "div.obs", "div.observaciones"]:
                tag = soup.select_one(sel)
                if tag:
                    p["descripcion"] = limpiar(tag.get_text())[:600]
                    break

            # Dirección
            for sel in ["span.direccion", "div.direccion", "p.direccion",
                        "span.address", "div.address", "span.location"]:
                tag = soup.select_one(sel)
                if tag:
                    p["direccion"] = limpiar(tag.get_text())
                    break

            print("  [{:>2}] {} | {:>12} | {}".format(
                i + 1, p["tipo"][:8], p["precio"] or "sin precio", p["titulo"][:45]
            ))
            time.sleep(0.3)  # pausa cortés para no sobrecargar el servidor

        except Exception as e:
            print("  [{:>2}] Error: {}".format(i + 1, e))

    return props


def guardar(props):
    with open("properties.json", "w", encoding="utf-8") as f:
        json.dump(props, f, ensure_ascii=False, indent=2)
    print("\n✓ properties.json guardado con {} propiedades.".format(len(props)))


if __name__ == "__main__":
    seen_codigos = set()
    seen_links   = set()
    props        = []

    for op_code, op_name in OPERATIONS:
        print("\n========== {} ==========".format(op_name.upper()))

        for page in range(MAX_PAGES):
            url = "{}/buscar/?type=&operation={}&page={}".format(BASE_URL, op_code, page)
            print("Página {} → {}".format(page, url))

            try:
                html = get_page(url)
            except Exception as e:
                print("Error: {}".format(e))
                break

            nuevas = scrape_cards(html)

            if not nuevas:
                print("  Intentando fallback markers...")
                nuevas = scrape_markers(html)

            if not nuevas:
                print("  Sin propiedades — fin de paginación para {}.".format(op_name))
                break

            antes = len(props)
            for p in nuevas:
                key_id     = p.get("id", "")
                key_link   = p["link"]
                key_codigo = p["codigo"]
                # deduplicar por id MapaProp (más confiable), luego código, luego link
                if key_id and key_id in seen_codigos:
                    continue
                if not key_id and key_codigo and key_codigo in seen_codigos:
                    continue
                if not key_id and not key_codigo and key_link and key_link in seen_links:
                    continue
                seen_codigos.add(key_id or key_codigo)
                if key_link:
                    seen_links.add(key_link)
                props.append(p)

            agregadas = len(props) - antes
            print("  Nuevas: {}  |  Total: {}".format(agregadas, len(props)))
            time.sleep(0.5)

            if agregadas == 0:
                print("  Sin propiedades nuevas — fin de paginación para {}.".format(op_name))
                break

    if not props:
        print("\nNo se encontraron propiedades.")
        sys.exit(1)

    print("\n\nTotal propiedades únicas: {}".format(len(props)))
    props = enriquecer(props)
    guardar(props)
    print("\nMuestra (primera propiedad):")
    print(json.dumps(props[0], ensure_ascii=False, indent=2))

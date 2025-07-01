# ─────────────────────────────────────────────────────────────
# main.py
# ─────────────────────────────────────────────────────────────
from fastapi import FastAPI, Request, Body
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from apscheduler.schedulers.background import BackgroundScheduler
import sqlite3, requests, json, datetime, os

# ---------- stałe ----------
DB_PATH = "db.sqlite"
HEADERS = {"User-Agent": "Mozilla/5.0"}

# ---------- wczytujemy drzewo kategorii ----------
with open("elektronika_kat.json", encoding="utf-8") as f:
    categories = json.load(f)

# ---------- pomocnicze ----------
def flatten_categories(node):
    res = [{"id": node["id"], "name": node["name"]}]
    for sub in node.get("subcategories", []):
        res.extend(flatten_categories(sub))
    return res

def build_optgroups(node):
    """Zamienia drzewo kategorii na listę grup:
       [{label:'Telefony', options:[(id,name)…]}, …]"""
    groups = []
    for lvl1 in node.get("subcategories", []):
        g = {"label": lvl1["name"], "options": []}

        def collect(n):
            g["options"].append((n["id"], n["name"]))
            for kid in n.get("subcategories", []):
                collect(kid)

        collect(lvl1)
        groups.append(g)
    return groups
OPTGROUPS = build_optgroups(categories) 
        #  ←  tworzymy listę raz
 #  ←  udostępniamy w Jinja

def get_category_name(cat_id: int, node=categories):
    if node["id"] == cat_id:
        return node["name"]
    for sub in node.get("subcategories", []):
        name = get_category_name(cat_id, sub)
        if name:
            return name
    return "Kategoria"

# ---------- baza: migracja ----------
def migrate_db():
    """Zapewnia, że baza ma wszystkie potrzebne tabele / kolumny."""
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()

        # tabela offers
        c.execute("""
            CREATE TABLE IF NOT EXISTS offers (
                id           INTEGER,
                title        TEXT,
                url          TEXT,
                created_time TEXT,
                category_id  INTEGER,
                PRIMARY KEY (id, category_id)
            )
        """)
        # tabela observed
        c.execute("""
            CREATE TABLE IF NOT EXISTS observed (
                category_id INTEGER PRIMARY KEY,
                added_at    TEXT
            )
        """)
        conn.commit()

# ---------- FastAPI ----------
app = FastAPI()
templates = Jinja2Templates(directory="templates")
templates.env.filters["flatten_categories"] = flatten_categories
templates.env.globals["optgroups"] = OPTGROUPS

# ---------- scheduler ----------
scheduler = BackgroundScheduler()

def schedule_for(cat_id: int):
    """Tworzy / nadpisuje joba dla danej kategorii."""
    scheduler.add_job(
        lambda: fetch_offers(cat_id),
        trigger="interval",
        minutes=60,
        id=f"cat_{cat_id}",
        replace_existing=True,
    )

# ---------- pobieranie ofert ----------
def fetch_offers(cat_id: int):
    url = (
        f"https://www.olx.pl/api/v1/offers/"
        f"?category_id={cat_id}&limit=40&sort_by=created_at:desc"
    )
    r = requests.get(url, headers=HEADERS)
    if not r.ok:
        print(f"❗ Błąd pobierania dla kat {cat_id}")
        return

    items = r.json().get("data", [])
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        for o in items:
            promo = o.get("promotion", {})
            if promo.get("highlighted") or promo.get("top_ad"):
                continue
            c.execute(
                """INSERT OR IGNORE INTO offers
                   (id, title, url, created_time, category_id)
                   VALUES (?,?,?,?,?)""",
                (
                    o["id"],
                    o["title"],
                    o["url"],
                    o["created_time"],
                    cat_id,
                ),
            )
        conn.commit()
    print(f"✅  {datetime.datetime.now():%H:%M} | {len(items)} ofert | kat {cat_id}")

# ---------- zdarzenie startowe ----------
@app.on_event("startup")
def on_startup():
    migrate_db()
    scheduler.start()

    # wznowienie zaplanowanych kategorii zapisanych w DB
    with sqlite3.connect(DB_PATH) as conn:
        for (cid,) in conn.execute("SELECT category_id FROM observed"):
            schedule_for(cid)

# ───── ROUTING ───────────────────────────────────────────────


# 1) widok główny z kafelkami
@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse(
        "index.html", {"request": request, "categories": categories}
    )

# 2) klik "Obserwuj"  (AJAX z frontu)
@app.post("/observe-json")
def observe_json(payload: dict = Body(...)):
    cat_id = int(payload["category_id"])
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR IGNORE INTO observed (category_id, added_at) VALUES (?, ?)",
            (cat_id, datetime.datetime.utcnow().isoformat()),
        )
    schedule_for(cat_id)          # uruchamiamy / odświeżamy job
    fetch_offers(cat_id)          # pierwszy zaciąg "na już"
    return {"id": cat_id, "name": get_category_name(cat_id)}

# 3) podstrona z ofertami
@app.get("/observing/{cat_id}", response_class=HTMLResponse)
def observing(request: Request, cat_id: int):
    return templates.TemplateResponse(
        "observing.html",
        {"request": request,
         "cat_id": cat_id,
         "cat_name": get_category_name(cat_id)},
    )

# 4) JSON z ofertami dla JS
@app.get("/offers-json/{cat_id}")
def offers_json(cat_id: int):
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute(
            """SELECT title, url FROM offers
               WHERE category_id=? ORDER BY created_time DESC LIMIT 40""",
            (cat_id,),
        ).fetchall()
    return [{"title": r[0], "url": r[1]} for r in rows]

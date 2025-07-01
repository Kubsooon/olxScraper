from fastapi import FastAPI, HTTPException, Body, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
import time, requests, json, os
from typing import Dict, List
from functools import lru_cache
from sqlalchemy.orm import Session
from db.session import SessionLocal
from db.models import Offer
from dateutil import parser

app = FastAPI(title="OLX Offer Tracker API (In-Memory)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

observations: Dict[str, Dict] = {}
offers: Dict[str, List[Dict]] = {}

HEADERS = {"User-Agent": "Mozilla/5.0"}

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        
def _query_olx_api(category_id: int, limit: int = 50) -> list[dict]:
    url = f"https://www.olx.pl/api/v1/offers/?category_id={category_id}&limit={limit}&sort_by=created_at:desc"
    r = requests.get(url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return r.json().get("data", [])

def find_matching_olx_offers(obs: dict) -> list[dict]:
    category_id = int(obs["categoryId"])
    raw_offers = _query_olx_api(category_id, limit=40)
    offers = []
    keywords = obs.get("keywords", "").strip().lower()
    # Split by ; for OR groups, then by space for AND within group
    or_groups = [g.strip() for g in keywords.split(';') if g.strip()]
    and_groups = [[w for w in group.split() if w] for group in or_groups]
    for raw in raw_offers:
        promo = raw.get("promotion", {})
        if promo.get("highlighted") or promo.get("top_ad"):
            continue
        # Dynamic filter fields
        match = True
        for key, value in obs.items():
            if key in ["id", "categoryId", "keywords"]:
                continue
            if value == "" or value is None:
                continue

            # Handle priceMin and priceMax
            if key == "priceMin" or key == "priceMax":
                price_param = next((p for p in raw.get("params", []) if p.get("key") == "price"), None)
                if not price_param:
                    match = False
                    break
                try:
                    offer_price = float(price_param.get("value", {}).get("value", 0))
                except Exception:
                    match = False
                    break
                if key == "priceMin" and offer_price < float(value):
                    match = False
                    break
                if key == "priceMax" and float(value) < 10000 and offer_price > float(value):
                    match = False
                    break
                continue

            found = False
            for param in raw.get("params", []):
                if param.get("key") == key and str(param.get("value", {}).get("key", param.get("value"))) == str(value):
                    found = True
                    break
            if not found:
                match = False
                break
        # Keyword filter (title/description)
        if match and and_groups:
            title = (raw.get("title") or "").lower()
            desc = (raw.get("description") or "").lower()
            def group_matches(group):
                return all(kw in title or kw in desc for kw in group)
            if not any(group_matches(group) for group in and_groups):
                match = False
        if match:
            offers.append(raw)
    return offers

def format_offers(offers_raw: list[dict]) -> list[dict]:
    formatted = []
    for o in offers_raw:
        img = o.get("photos", [{}])[0].get("link", "") if o.get("photos") else ""
        if ";s={width}x{height}" in img:
            img = img.replace(";s={width}x{height}", ";s=400x400")
        price = next((p["value"]["label"] for p in o.get("params", []) if p["key"] == "price"), "-")
        formatted.append({
            "id": o["id"],
            "title": o["title"],
            "url": o["url"],
            "price": price,
            "imageUrl": img,
            "timestamp": int(time.time() * 1000),
            "lastRefreshTime": o.get("last_refresh_time"),
            "isNew": True,
        })
    return formatted

@app.get("/api/observations")
def list_observations():
    now_ms = int(time.time() * 1000)
    return [
        {
            **obs,
            "offers": offers.get(obs_id, []),
            "lastChecked": now_ms,
        }
        for obs_id, obs in observations.items()
    ]

@app.post("/api/observations")
def create_observation(data: Dict = Body(...)):
    if not data.get("categoryId"):
        raise HTTPException(status_code=400, detail="categoryId is required")
    obs_id = str(int(time.time() * 1000))
    obs = {k: (v.strip() if isinstance(v, str) else v) for k, v in data.items()}
    obs["id"] = obs_id
    obs["categoryId"] = str(data["categoryId"])
    observations[obs_id] = obs
    offers[obs_id] = []
    return {
        **obs,
        "offers": offers.get(obs_id, []),
        "lastChecked": int(time.time() * 1000),
    }

@app.patch("/api/observations/{obs_id}")
def update_observation(obs_id: str, data: Dict = Body(...)):
    obs = observations.get(obs_id)
    if not obs:
        raise HTTPException(status_code=404, detail="Observation not found")
    for k, v in data.items():
        if k != "id":
            obs[k] = v.strip() if isinstance(v, str) else v
    observations[obs_id] = obs
    fresh = find_matching_olx_offers(obs)
    new_offers = []
    for o in fresh:
        img = o.get("photos", [{}])[0].get("link", "") if o.get("photos") else ""
        if ";s={width}x{height}" in img:
            img = img.replace(";s={width}x{height}", ";s=400x400")
        price = next((p["value"]["label"] for p in o.get("params", []) if p["key"] == "price"), "-")
        new_offers.append({
            "id": o["id"],
            "title": o["title"],
            "url": o["url"],
            "price": price,
            "imageUrl": img,
            "timestamp": int(time.time() * 1000),
            "lastRefreshTime": o.get("last_refresh_time"),
            "isNew": True,
        })
    # Merge new offers with cached offers, keeping unique by ID
    cached = {o['id']: o for o in offers.get(obs_id, [])}
    for o in new_offers:
        cached[o['id']] = o  # update or add new
    merged_offers = sorted(cached.values(), key=lambda x: x.get('lastRefreshTime', 0), reverse=True)
    offers[obs_id] = merged_offers[:50]
    return {
        **obs,
        "offers": offers.get(obs_id, []),
        "lastChecked": int(time.time() * 1000),
    }

@app.post("/api/observations/{obs_id}/refresh")
def refresh_observation(obs_id: str, db: Session = Depends(get_db)):
    obs = observations.get(obs_id)
    if not obs:
        raise HTTPException(status_code=404, detail="Observation not found")
    if not obs.get("categoryId"):
        raise HTTPException(status_code=400, detail="categoryId is required for this observation")
    fresh = find_matching_olx_offers(obs)
    new_offers = []
    for o in fresh:
        img = o.get("photos", [{}])[0].get("link", "") if o.get("photos") else ""
        if ";s={width}x{height}" in img:
            img = img.replace(";s={width}x{height}", ";s=400x400")
        price = next((p["value"]["label"] for p in o.get("params", []) if p["key"] == "price"), "-")
        price_val = None
        prev_price_val = None
        for p in o.get("params", []):
            if p["key"] == "price":
                try:
                    price_val = float(p["value"].get("value", 0))
                    prev_price_val = float(p["value"].get("previous_value", 0)) if p["value"].get("previous_value") else None
                except Exception:
                    pass
        stan = next((p["value"].get("key") for p in o.get("params", []) if p["key"] == "state"), None)
        offer_id = o["id"]
        # Parse last_refresh_time to datetime
        last_refresh_time_str = o.get("last_refresh_time")
        last_refresh_time = parser.parse(last_refresh_time_str) if last_refresh_time_str else None
        # Upsert offer in DB
        db_offer = db.query(Offer).filter(Offer.id == offer_id).first()
        if db_offer:
            # Update existing offer
            db_offer.last_refresh_time = last_refresh_time
            db_offer.title = o.get("title")
            db_offer.description = o.get("description")
            db_offer.url = o.get("url")
            db_offer.filters = {k: v for k, v in obs.items() if k not in ["id", "offers", "lastChecked"]}
            db_offer.value = price_val
            db_offer.previous_value = prev_price_val
            db_offer.stan = stan
        else:
            # Create new offer
            db_offer = Offer(
                id=offer_id,
                last_refresh_time=last_refresh_time,
                title=o.get("title"),
                description=o.get("description"),
                url=o.get("url"),
                filters={k: v for k, v in obs.items() if k not in ["id", "offers", "lastChecked"]},
                value=price_val,
                previous_value=prev_price_val,
                stan=stan
            )
            db.add(db_offer)
        
        new_offers.append({
            "id": o["id"],
            "title": o["title"],
            "url": o["url"],
            "price": price,
            "imageUrl": img,
            "timestamp": int(time.time() * 1000),
            "lastRefreshTime": o.get("last_refresh_time"),
            "isNew": True,
        })
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Database error: {e}")
        # Continue without failing the entire request
    # Merge new offers with cached offers, keeping unique by ID
    cached = {o['id']: o for o in offers.get(obs_id, [])}
    for o in new_offers:
        cached[o['id']] = o  # update or add new
    merged_offers = sorted(cached.values(), key=lambda x: x.get('lastRefreshTime', 0), reverse=True)
    offers[obs_id] = merged_offers[:50]
    return {
        **obs,
        "offers": offers.get(obs_id, []),
        "lastChecked": int(time.time() * 1000),
    }

@app.delete("/api/observations/{obs_id}")
def delete_observation(obs_id: str):
    observations.pop(obs_id, None)
    offers.pop(obs_id, None)
    return {"status": "deleted"}

@app.get("/api/observations/{obs_id}")
def get_observation(obs_id: str):
    obs = observations.get(obs_id)
    if not obs:
        raise HTTPException(status_code=404, detail="Observation not found")
    return {
        **obs,
        "offers": offers.get(obs_id, []),
        "lastChecked": int(time.time() * 1000),
    }

@app.get("/api/category-filters")
def get_category_filters(categoryId: int = Query(...)):
    try:
        filters_db = load_filters_db()
        data = filters_db.get('data', {})
        filters = []
        for filter_key, filter_list in data.items():
            for filter_obj in filter_list:
                options = filter_obj.get('options', [])
                if any(categoryId in opt.get('categories', []) for opt in options):
                    filters.append({
                        'key': filter_key,
                        'label': filter_obj.get('label', filter_key),
                        'values': filter_obj.get('values', []),
                    })
        return {'filters': filters}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sample-offers")
def get_sample_offers(categoryId: int = Query(...)):
    try:
        offers_raw = _query_olx_api(categoryId, limit=10)
        return format_offers(offers_raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@lru_cache(maxsize=1)
def load_filters_db():
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    filters_path = os.path.join(project_root, 'filtry.json')
    with open(filters_path, encoding='utf-8') as f:
        return json.load(f)


@app.post("/api/offers/")
def create_offer(offer: dict, db: Session = Depends(get_db)):
    db_offer = Offer(**offer)
    db.add(db_offer)
    db.commit()
    db.refresh(db_offer)
    return db_offer

@app.get("/api/offers/{offer_id}")
def get_offer(offer_id: str, db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    return offer

@app.get("/api/offers/by-observation/{observation_id}")
def get_offers_by_observation(observation_id: str, db: Session = Depends(get_db)):
    # Find all offers where filters['categoryId'] == observation_id
    offers = db.query(Offer).filter(Offer.filters["categoryId"].as_string() == observation_id).all()
    return [
        {
            "id": o.id,
            "last_refresh_time": o.last_refresh_time,
            "title": o.title,
            "description": o.description,
            "url": o.url,
            "filters": o.filters,
            "value": o.value,
            "previous_value": o.previous_value,
            "stan": o.stan,
        }
        for o in offers
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=False)

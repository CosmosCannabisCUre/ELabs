"""Tests for new 37-product catalog (Trost, Moon Impact, Cannazo)."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://moon-impact-gummies.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def products():
    r = requests.get(f"{API}/products", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    # Support both list and paginated dict responses
    if isinstance(data, dict):
        for key in ("products", "items", "data"):
            if key in data:
                data = data[key]
                break
    assert isinstance(data, list), f"Unexpected type: {type(data)}"
    return data


def _brand(p):
    return (p.get("brand") or "").lower()


def test_product_count_total(products):
    assert len(products) == 37, f"Expected 37 products, got {len(products)}: {[p.get('slug') for p in products]}"


def test_brand_counts(products):
    by_brand = {}
    for p in products:
        by_brand.setdefault(_brand(p), []).append(p.get("slug"))
    trost = [b for b in by_brand if "trost" in b]
    moon = [b for b in by_brand if "moon" in b]
    cann = [b for b in by_brand if "cannazo" in b or "cannoza" in b]
    n_trost = sum(len(by_brand[b]) for b in trost)
    n_moon = sum(len(by_brand[b]) for b in moon)
    n_cann = sum(len(by_brand[b]) for b in cann)
    assert n_trost == 12, f"Trost expected 12, got {n_trost}: {by_brand}"
    assert n_moon == 2, f"Moon Impact expected 2, got {n_moon}: {by_brand}"
    assert n_cann == 23, f"Cannazo expected 23, got {n_cann}: {by_brand}"


@pytest.mark.parametrize("slug,expected_price", [
    ("moon-impact-stellardust", 3300),
    ("moon-impact-mission-brief", 3000),
    ("trost-boom", 799),
    ("cannazo-uplift-citrus-lemon", 1999),
    ("cannazo-pet-oil", 1499),
    ("cannazo-berberine", 1199),
    ("cannazo-uplift-blackcurrant", 2599),
    ("cannazo-cannaronil-rso", 4500),
])
def test_spot_check_prices(slug, expected_price):
    r = requests.get(f"{API}/products/{slug}", timeout=15)
    assert r.status_code == 200, f"{slug}: {r.status_code} {r.text}"
    price = r.json().get("price")
    assert price == expected_price, f"{slug}: expected {expected_price}, got {price}"


def test_hidden_moon_drift():
    r = requests.get(f"{API}/products/moon-impact-drift", timeout=15)
    assert r.status_code == 404


def test_hidden_trost_mello_5_cola():
    r = requests.get(f"{API}/products/trost-mello-5-cola", timeout=15)
    assert r.status_code == 404


def test_trost_kosha_5_cola_present():
    r = requests.get(f"{API}/products/trost-kosha-5-cola", timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    name = data.get("name", "")
    assert "Kosha" in name and "Cola" in name, f"Unexpected name: {name}"


def test_hidden_not_in_listing(products):
    slugs = {p.get("slug") for p in products}
    assert "moon-impact-drift" not in slugs
    assert "trost-mello-5-cola" not in slugs


def test_trost_mello_blueberry_price():
    # find via listing since slug may vary
    r = requests.get(f"{API}/products", timeout=15)
    for p in r.json() if isinstance(r.json(), list) else []:
        slug = p.get("slug", "")
        name = (p.get("name") or "").lower()
        if "trost" in _brand(p) and "blueberry" in (slug + name) and ("9.26" in name or "9" in name):
            assert p.get("price") == 3999, f"Blueberry price wrong: {p.get('price')}"
            return
    pytest.skip("Trost Mello blueberry 9.26% not identifiable")


def test_admin_login_and_products():
    r = requests.post(f"{API}/auth/login",
                      json={"email": "admin@cosmoscure.in", "password": "Cosmos@2026"},
                      timeout=15)
    assert r.status_code == 200, r.text
    token = r.json().get("access_token") or r.json().get("token")
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    # Try admin products endpoint (may be same public endpoint)
    r2 = requests.get(f"{API}/admin/products", headers=headers, cookies=r.cookies, timeout=15)
    if r2.status_code == 404:
        pytest.skip("No /api/admin/products endpoint")
    assert r2.status_code == 200, r2.text

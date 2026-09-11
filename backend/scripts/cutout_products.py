"""
One-off pipeline: turn brand marketing photos into studio cutouts.

Per product: download official brand CDN image -> Gemini vision returns a tight
bounding box around ONLY the product packaging -> crop original (pixels stay
faithful) -> rembg (u2net) removes the remaining background -> keep only large
connected components (drops floating badges/decor) -> autocrop -> save a
transparent PNG to frontend/public/brand-assets/cutout/<slug>.png

Run:  python3 /app/backend/scripts/cutout_products.py
"""
import asyncio
import base64
import io
import os
import re
import urllib.request

import numpy as np
from PIL import Image
from dotenv import load_dotenv
from rembg import new_session, remove
from scipy import ndimage

load_dotenv("/app/backend/.env")

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

OUT_DIR = "/app/frontend/public/brand-assets/cutout"
TMP_DIR = "/tmp/brandimgs"
MODEL = "gemini-3.1-flash-image-preview"

SOURCES = {
    # ---- Trost ----
    "trost-mello-9-blueberry": "https://cdn.shopify.com/s/files/1/0542/5217/5555/files/Artboard1_11517f1b-6f91-48e0-b128-328f270b6e06_1000x_crop_center.png?v=1786172059&width=1200",
    "trost-mello-13-cola": "https://cdn.shopify.com/s/files/1/0542/5217/5555/files/Artboard1_1000x_crop_center.png?v=1781096759&width=1200",
    "trost-mello-9-cola": "https://cdn.shopify.com/s/files/1/0542/5217/5555/files/Artboard1_6ec3cbe9-3691-4ea3-a3c0-2530d18aca55_1000x_crop_center.png?v=1781096832&width=1200",
    "trost-kosha-9-cola": "https://cdn.shopify.com/s/files/1/0542/5217/5555/files/Artboard1_b8e74fd1-e856-4d1f-9b0b-5d63316139ab_1000x_crop_center.png?v=1781165366&width=1200",
    "trost-kosha-7-cola": "https://cdn.shopify.com/s/files/1/0542/5217/5555/files/Artboard1_39cd0993-11ce-4501-858b-70effa12c214_1000x_crop_center.png?v=1781165282&width=1200",
    "trost-kosha-5-cola": "https://cdn.shopify.com/s/files/1/0542/5217/5555/files/Artboard1_7e78fec0-01c7-4291-b7a5-c23053489ec5_1000x_crop_center.png?v=1781165122&width=1200",
    "trost-rollen-earthy": "https://cdn.shopify.com/s/files/1/0542/5217/5555/files/Artboard_1_d41e93cd-c111-46d5-b7cc-9d890dcafd5c_1000x_crop_center.jpg?v=1780646172&width=1200",
    "trost-rollen-woody": "https://cdn.shopify.com/s/files/1/0542/5217/5555/files/Artboard_1_3f63efcf-22aa-4b10-bcc4-49f1631f9808_1000x_crop_center.jpg?v=1780646236&width=1200",
    "trost-rollen-fruity": "https://cdn.shopify.com/s/files/1/0542/5217/5555/files/Artboard_1_046ec9a5-38f6-4010-8897-3a74415151b5_1000x_crop_center.jpg?v=1780646043&width=1200",
    "trost-boom": "https://cdn.shopify.com/s/files/1/0542/5217/5555/files/Artboard_1_3167e70d-a61a-4ef8-b107-9c7b10b38ac0_1000x_crop_center.jpg?v=1780645657&width=1200",
    # ---- Cannazo ----
    "cannazo-uplift-citrus-lemon": "https://cdn.shopify.com/s/files/1/0697/8922/0909/files/citruslemon.png?v=1787842076",
    "cannazo-uplift-craft-cola-250": "https://cdn.shopify.com/s/files/1/0697/8922/0909/files/34_64c3b89c-a21e-4c6f-92db-9553c106506f.png?v=1787039044",
    "cannazo-uplift-drops": "https://cdn.shopify.com/s/files/1/0697/8922/0909/files/UPLIFT_d64b91be-8b66-44e7-b7b3-fcf86fcaf8f3.png?v=1784751665",
    "cannazo-elevate-tablets": "https://cdn.shopify.com/s/files/1/0697/8922/0909/files/elevatetablets_f5060db7-05bb-4ead-99df-ca6e8dffefab.png?v=1782507963",
    "cannazo-pain-relief-combo": "https://cdn.shopify.com/s/files/1/0697/8922/0909/files/1_39acd0fb-c206-4d5d-9aba-c2f66e230b00.png?v=1780760092",
    "cannazo-uplift-unwind-kit": "https://cdn.shopify.com/s/files/1/0697/8922/0909/files/1_08a30e0a-16cf-40fb-b12d-3025c99ee375.png?v=1784752752",
    "cannazo-revive-roll-on": "https://cdn.shopify.com/s/files/1/0697/8922/0909/files/reviverollon.png?v=1773615939",
    "cannazo-mental-health-duo": "https://cdn.shopify.com/s/files/1/0697/8922/0909/files/1_6802f889-e210-469e-84c1-ac720a02d5c3.png?v=1776193860",
    "cannazo-mood-elevating-kit": "https://cdn.shopify.com/s/files/1/0697/8922/0909/files/1_15fa971d-616e-4885-ae48-80a9d2cf4332.png?v=1784753535",
    "cannazo-vijaya-amrit": "https://cdn.shopify.com/s/files/1/0697/8922/0909/files/AMRIT_0da67f06-3324-468d-8ca9-1d02f39585b3.png?v=1775576036",
    "cannazo-ambrosia-drops": "https://cdn.shopify.com/s/files/1/0697/8922/0909/files/AMBROSIA_a372907d-1bda-4919-befc-7a6c4b56f89e.png?v=1784751740",
    "cannazo-berberine": "https://cdn.shopify.com/s/files/1/0697/8922/0909/files/1_92b6952e-0a72-41bc-9b93-ba6688cd20fa.png?v=1784724973",
    "cannazo-placidiol": "https://cdn.shopify.com/s/files/1/0697/8922/0909/files/PLACIDIOL_4c06ce52-cc96-476b-b1bd-0a3f6cffd831.png?v=1775572241",
    "cannazo-pet-oil": "https://cdn.shopify.com/s/files/1/0697/8922/0909/files/PETOIL.png?v=1775596231",
    "cannazo-orthodiol-spray": "https://cdn.shopify.com/s/files/1/0697/8922/0909/files/painaid_._orthodiol_3.png?v=1780738308",
    "cannazo-elevate-capsules": "https://cdn.shopify.com/s/files/1/0697/8922/0909/files/elevate_capsules.png?v=1780738960",
    "cannazo-elevate-recovery-oil": "https://cdn.shopify.com/s/files/1/0697/8922/0909/files/ELEVATE_abcf0684-1fad-437a-b9bd-f3b7f8a79411.png?v=1784754790",
    "cannazo-cannaronil-rso": "https://cdn.shopify.com/s/files/1/0697/8922/0909/files/CANNARONIL_02428c44-47b5-4b9a-9285-44e2c4c70adf.png?v=1784751978",
    "cannazo-brain-easer": "https://cdn.shopify.com/s/files/1/0697/8922/0909/files/current_brain_easer_896cb619-ff36-49ad-9a74-6d2b62f050da.png?v=1784752117",
    "cannazo-calm-drops": "https://cdn.shopify.com/s/files/1/0697/8922/0909/files/CALM_0761c431-7bbf-4751-962d-28806644f7fa.png?v=1784754532",
}

BBOX_PROMPT = (
    "Identify the complete retail product in this image: the packaging a customer receives "
    "(pouch / box / bottle / jar / tube / and any item physically attached to or part of the product "
    "presentation, e.g. a bottle standing with its box). Reply with ONLY 4 integers: "
    "ymin,xmin,ymax,xmax on a normalized 0-1000 scale. The box must tightly bound ONLY the product - "
    "exclude all scenery, props, wooden logs, stones, plants, fruits, hands, water splashes, badges, "
    "stickers, 'as seen on' logos, stamps and any floating text or graphics."
)


def download(slug, url):
    os.makedirs(TMP_DIR, exist_ok=True)
    path = os.path.join(TMP_DIR, f"{slug}.srcimg")
    if not os.path.exists(path):
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with open(path, "wb") as f:
            f.write(urllib.request.urlopen(req, timeout=60).read())
    return path


async def detect_bbox(src_path, api_key, slug):
    im = Image.open(src_path)
    im.thumbnail((768, 768))
    buf = io.BytesIO()
    im.convert("RGB").save(buf, "JPEG", quality=85)
    b64 = base64.b64encode(buf.getvalue()).decode()
    for attempt in (1, 2):
        try:
            chat = LlmChat(api_key=api_key, session_id=f"bbox-{slug}-{attempt}",
                           system_message="You are a precise vision assistant that outputs only bounding boxes.")
            chat.with_model("gemini", MODEL)
            resp = await chat.send_message(UserMessage(text=BBOX_PROMPT, file_contents=[ImageContent(b64)]))
            nums = re.findall(r"\d+", str(resp))
            if len(nums) >= 4:
                y0, x0, y1, x1 = [int(n) for n in nums[:4]]
                if 0 <= y0 < y1 <= 1010 and 0 <= x0 < x1 <= 1010 and (y1 - y0) > 80 and (x1 - x0) > 80:
                    return y0, x0, y1, x1
            print(f"BAD  {slug} bbox attempt {attempt}: {str(resp)[:80]}", flush=True)
        except Exception as e:
            print(f"ERR  {slug} bbox attempt {attempt}: {str(e)[:140]}", flush=True)
            await asyncio.sleep(4)
    return None


def cutout(src_path, bbox_norm, session):
    im = Image.open(src_path).convert("RGB")
    W, H = im.size
    y0, x0, y1, x1 = bbox_norm
    my, mx = int((y1 - y0) * 0.035), int((x1 - x0) * 0.035)
    box = (max(0, (x0 - mx) * W // 1000), max(0, (y0 - my) * H // 1000),
           min(W, (x1 + mx) * W // 1000), min(H, (y1 + my) * H // 1000))
    crop = im.crop(box)

    out = remove(crop, session=session).convert("RGBA")
    arr = np.array(out)
    alpha = arr[..., 3]

    # keep only meaningful connected components (drop floating badges / decor fragments)
    lab, n = ndimage.label(alpha > 128)
    if n == 0:
        return None
    sizes = ndimage.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1))
    biggest = sizes.max()
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= max(biggest * 0.08, alpha.size * 0.004)])
    alpha = np.where(keep, alpha, 0).astype(np.uint8)
    arr[..., 3] = alpha
    out = Image.fromarray(arr, "RGBA")

    bbox = out.getbbox()
    if not bbox:
        return None
    pad = int(max(bbox[2] - bbox[0], bbox[3] - bbox[1]) * 0.04)
    out = out.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad),
                    min(out.width, bbox[2] + pad), min(out.height, bbox[3] + pad)))
    if max(out.size) > 1200:
        out.thumbnail((1200, 1200), Image.LANCZOS)
    return out


async def process(slug, url, api_key, session):
    src = download(slug, url)
    bb = await detect_bbox(src, api_key, slug)
    if not bb:
        return False
    out = cutout(src, bb, session)
    if out and out.width > 80 and out.height > 80:
        out.save(os.path.join(OUT_DIR, f"{slug}.png"), "PNG", optimize=True)
        print(f"OK   {slug} bbox={bb} -> {out.size}", flush=True)
        return True
    print(f"BAD  {slug}: empty cutout", flush=True)
    return False


async def main():
    api_key = os.environ["EMERGENT_LLM_KEY"]
    os.makedirs(OUT_DIR, exist_ok=True)
    session = new_session("u2net")
    failed = []
    for slug, url in SOURCES.items():
        if os.path.exists(os.path.join(OUT_DIR, f"{slug}.png")):
            print(f"SKIP {slug} (exists)", flush=True)
            continue
        if not await process(slug, url, api_key, session):
            failed.append(slug)
        await asyncio.sleep(1.5)
    print("DONE. failed:", failed if failed else "none", flush=True)


if __name__ == "__main__":
    asyncio.run(main())

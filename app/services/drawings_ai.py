"""Drawing AI pipeline: PDF text extraction (real) + element/OCR stub (shape-correct)."""
import io

from PIL import Image, ImageDraw


SAMPLE_ELEMENTS = [
    {"id": "el-1", "type": "wall", "category": "architecture",
     "bbox": {"x": 120, "y": 80, "width": 640, "height": 24, "page": 1}, "confidence": 0.97,
     "properties": {"material": "AAC block 200mm"},
     "evidenceRegion": {"page": 1, "bbox": {"x": 120, "y": 80, "width": 640, "height": 24, "page": 1}, "imageUrl": ""}},
    {"id": "el-2", "type": "column", "category": "structure",
     "bbox": {"x": 200, "y": 200, "width": 48, "height": 48, "page": 1}, "confidence": 0.95,
     "properties": {"size": "400x400", "grade": "M30"},
     "evidenceRegion": {"page": 1, "bbox": {"x": 200, "y": 200, "width": 48, "height": 48, "page": 1}, "imageUrl": ""}},
    {"id": "el-3", "type": "door", "category": "architecture",
     "bbox": {"x": 420, "y": 300, "width": 90, "height": 12, "page": 1}, "confidence": 0.91,
     "properties": {"leaf": "Flush door 900mm"},
     "evidenceRegion": {"page": 1, "bbox": {"x": 420, "y": 300, "width": 90, "height": 12, "page": 1}, "imageUrl": ""}},
]

SAMPLE_OCR = [
    {"text": "GROUND FLOOR PLAN", "bbox": {"x": 60, "y": 40, "width": 300, "height": 28, "page": 1}, "confidence": 0.99, "type": "title"},
    {"text": "GRID C-4", "bbox": {"x": 520, "y": 60, "width": 90, "height": 18, "page": 1}, "confidence": 0.72, "type": "note"},
]


def pdf_info(data: bytes) -> dict:
    """Real PDF introspection: page count + extracted text sample."""
    try:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(data))
        pages = len(reader.pages)
        texts = []
        for i, pg in enumerate(reader.pages[:3]):
            try:
                t = (pg.extract_text() or "").strip().replace("\n", " ")[:400]
                if t:
                    texts.append({"text": t, "bbox": {"x": 40, "y": 40, "width": 500, "height": 20, "page": i + 1}, "confidence": 0.9, "type": "other"})
            except Exception:
                continue
        return {"pages": max(pages, 1), "texts": texts}
    except Exception:
        return {"pages": 1, "texts": []}


def analyze_drawing(data: bytes, filename: str, options: dict | None = None) -> dict:
    """Analyze pipeline (MVP): real PDF text + deterministic element/OCR shapes.

    Swap SAMPLE_* with a CV model in `workers` when ready — the contract is stable.
    """
    info = pdf_info(data) if filename.lower().endswith(".pdf") else {"pages": 1, "texts": []}
    opts = options or {}
    elements = list(SAMPLE_ELEMENTS) if opts.get("detectElements", True) else []
    ocr = list(SAMPLE_OCR) + info["texts"] if opts.get("runOCR", True) else list(info["texts"])
    conf = round(sum(e["confidence"] for e in elements) / len(elements), 2) if elements else 0.9
    return {"elements": elements, "ocr_text": ocr, "confidence": conf, "pages": info["pages"]}


def placeholder_render(name: str, page: int = 1, scale: float = 1.0, w: int = 900, h: int = 620) -> bytes:
    """Labeled placeholder render for thumbnail/page endpoints (real rasterization later)."""
    img = Image.new("RGB", (w, h), "#ffffff")
    d = ImageDraw.Draw(img)
    d.rectangle([60, 60, w - 60, h - 60], outline="#0f172a", width=5)
    d.rectangle([120, 120, w - 120, h - 120], outline="#94a3b8", width=2)
    d.text((80, 24), f"{name} — page {page} @ {scale}x", fill="#0d9488")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

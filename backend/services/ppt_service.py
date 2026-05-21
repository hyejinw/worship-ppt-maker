import io
import os
import httpx
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.oxml.ns import qn
from lxml import etree

FONTS_DIR = Path(__file__).parent.parent / "fonts"

SLIDE_WIDTH = Inches(13.33)   # 33.87cm
SLIDE_HEIGHT = Inches(7.5)    # 19.05cm

FONT_FILES = {
    "NanumGothic": "NanumGothic.ttf",
    "NanumMyeongjo": "NanumMyeongjo.ttf",
    "NanumSquare": "NanumSquare.ttf",
    "NotoSansKR": "NotoSansKR.ttf",
}


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def _add_solid_background(slide, hex_color: str):
    r, g, b = _hex_to_rgb(hex_color)
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = RGBColor(r, g, b)


def _add_image_background(slide, image_data: bytes):
    pic_path = io.BytesIO(image_data)
    slide.shapes.add_picture(
        pic_path,
        left=0,
        top=0,
        width=SLIDE_WIDTH,
        height=SLIDE_HEIGHT,
    )


def _add_overlay(slide, opacity: float):
    if opacity <= 0:
        return
    shape = slide.shapes.add_shape(
        1,  # MSO_SHAPE_TYPE.RECTANGLE
        0, 0, SLIDE_WIDTH, SLIDE_HEIGHT,
    )
    fill = shape.fill
    fill.solid()
    fill.fore_color.rgb = RGBColor(0, 0, 0)

    # 투명도 설정 (0~100000, 100000=완전 투명)
    alpha = int((1 - opacity) * 100000)
    sp_tree = shape._element
    sp_pr = sp_tree.find(qn("p:spPr"))
    solid_fill = sp_pr.find(qn("a:solidFill"))
    if solid_fill is not None:
        srgb_clr = solid_fill.find(qn("a:srgbClr"))
        if srgb_clr is None:
            srgb_clr = etree.SubElement(solid_fill, qn("a:srgbClr"))
            srgb_clr.set("val", "000000")
        alpha_elem = etree.SubElement(srgb_clr, qn("a:alpha"))
        alpha_elem.set("val", str(100000 - alpha))

    line = shape.line
    line.fill.background()


def _add_text_box(slide, lyrics: str, font_family: str, font_size: int, x_pct: float, y_pct: float):
    line_count = len([l for l in lyrics.split("\n") if l.strip()])
    box_width = SLIDE_WIDTH * 0.85
    line_height_pt = font_size * 1.5
    box_height = Pt(line_height_pt * max(line_count, 1) + font_size)

    left = (SLIDE_WIDTH - box_width) / 2
    top_center = SLIDE_HEIGHT * (y_pct / 100) - box_height / 2
    top = max(0, min(top_center, SLIDE_HEIGHT - box_height))

    txBox = slide.shapes.add_textbox(left, top, box_width, box_height)
    tf = txBox.text_frame
    tf.word_wrap = True

    lines = lyrics.split("\n")
    for i, line in enumerate(lines):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()

        p.alignment = PP_ALIGN.CENTER
        run = p.add_run()
        run.text = line

        font = run.font
        font.size = Pt(font_size)
        font.color.rgb = RGBColor(255, 255, 255)
        font.bold = False

        font_file = FONTS_DIR / FONT_FILES.get(font_family, "NanumGothic.ttf")
        if font_file.exists():
            font.name = font_family


async def build_pptx(slides: list[dict], settings: dict) -> bytes:
    prs = Presentation()
    prs.slide_width = SLIDE_WIDTH
    prs.slide_height = SLIDE_HEIGHT

    blank_layout = prs.slide_layouts[6]

    font_family = settings.get("font_family", "NanumGothic")
    font_size = settings.get("font_size", 36)
    text_pos = settings.get("text_position", {"x": 50, "y": 75})
    x_pct = text_pos.get("x", 50)
    y_pct = text_pos.get("y", 75)
    bg_type = settings.get("bg_type", "black")
    bg_value = settings.get("bg_value")
    overlay_opacity = settings.get("overlay_opacity", 0.0)

    # 배경 이미지 데이터 미리 가져오기
    bg_image_data: bytes | None = None
    if bg_type == "image" and bg_value and bg_value.startswith("http"):
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(bg_value)
            if resp.status_code == 200:
                bg_image_data = resp.content

    for slide_data in sorted(slides, key=lambda s: s["order"]):
        slide = prs.slides.add_slide(blank_layout)

        if bg_type == "black":
            _add_solid_background(slide, "#000000")
        elif bg_type == "color" and bg_value:
            _add_solid_background(slide, bg_value)
        elif bg_type == "image" and bg_image_data:
            _add_image_background(slide, bg_image_data)
        else:
            _add_solid_background(slide, "#000000")

        if overlay_opacity > 0:
            _add_overlay(slide, overlay_opacity)

        lyrics_text = slide_data.get("lyrics", "").strip()
        if lyrics_text:
            _add_text_box(slide, lyrics_text, font_family, font_size, x_pct, y_pct)

    buf = io.BytesIO()
    prs.save(buf)
    return buf.getvalue()

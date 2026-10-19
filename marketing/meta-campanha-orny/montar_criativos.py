from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parent
LOGO = ROOT.parent.parent / "app" / "frontend" / "public" / "brand" / "orny-wordmark.png"
FONT_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")
FONT_REGULAR = Path(r"C:\Windows\Fonts\arial.ttf")
GREEN = "#20F51B"
WHITE = "#FFFFFF"


def font(size: int, bold: bool = False):
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT_REGULAR), size=size)


def cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    ratio = max(size[0] / image.width, size[1] / image.height)
    resized = image.resize((round(image.width * ratio), round(image.height * ratio)), Image.Resampling.LANCZOS)
    left = (resized.width - size[0]) // 2
    top = (resized.height - size[1]) // 2
    return resized.crop((left, top, left + size[0], top + size[1]))


def wrap(draw: ImageDraw.ImageDraw, text: str, text_font, max_width: int):
    words = text.split()
    lines, current = [], ""
    for word in words:
        trial = f"{current} {word}".strip()
        if draw.textbbox((0, 0), trial, font=text_font)[2] <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def add_logo(canvas: Image.Image, width: int, x: int, y: int):
    logo = Image.open(LOGO).convert("RGBA")
    logo.thumbnail((width, 200), Image.Resampling.LANCZOS)
    canvas.alpha_composite(logo, (x, y))


def feed(source: str, output: str, headline: str, subtitle: str, badge: str | None = None):
    canvas = cover(Image.open(ROOT / source).convert("RGB"), (1080, 1080)).convert("RGBA")
    shade = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    for x in range(760):
        alpha = int(238 * (1 - x / 800) ** 0.65)
        sd.line((x, 0, x, 1080), fill=(0, 0, 0, max(0, alpha)))
    canvas = Image.alpha_composite(canvas, shade)
    draw = ImageDraw.Draw(canvas)
    add_logo(canvas, 215, 72, 66)

    y = 242
    if badge:
        bf = font(25, True)
        box = draw.textbbox((0, 0), badge, font=bf)
        draw.rounded_rectangle((72, y, 72 + box[2] + 40, y + 52), radius=26, fill=GREEN)
        draw.text((92, y + 11), badge, font=bf, fill="#061006")
        y += 92

    hf = font(72, True)
    for line in wrap(draw, headline, hf, 520):
        draw.text((72, y), line, font=hf, fill=WHITE, stroke_width=1, stroke_fill=(0, 0, 0, 110))
        y += 79
    y += 24
    sf = font(32)
    for line in wrap(draw, subtitle, sf, 490):
        draw.text((74, y), line, font=sf, fill="#E7E7E7")
        y += 43

    cta_y = 910
    draw.rounded_rectangle((72, cta_y, 392, cta_y + 86), radius=20, fill=GREEN)
    draw.text((108, cta_y + 25), "COMEÇAR AGORA", font=font(27, True), fill="#061006")
    canvas.convert("RGB").save(ROOT / output, quality=95, optimize=True)


def story(source: str, output: str, headline: str, subtitle: str):
    canvas = cover(Image.open(ROOT / source).convert("RGB"), (1080, 1920)).convert("RGBA")
    shade = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    for y in range(1050):
        alpha = int(235 * (1 - y / 1150) ** 0.6)
        sd.line((0, y, 1080, y), fill=(0, 0, 0, max(0, alpha)))
    canvas = Image.alpha_composite(canvas, shade)
    draw = ImageDraw.Draw(canvas)
    add_logo(canvas, 255, 80, 105)
    y = 335
    hf = font(86, True)
    for line in wrap(draw, headline, hf, 860):
        draw.text((80, y), line, font=hf, fill=WHITE, stroke_width=1, stroke_fill=(0, 0, 0, 120))
        y += 96
    y += 24
    sf = font(39)
    for line in wrap(draw, subtitle, sf, 820):
        draw.text((82, y), line, font=sf, fill="#EAEAEA")
        y += 53
    draw.rounded_rectangle((80, 1645, 520, 1750), radius=24, fill=GREEN)
    draw.text((124, 1678), "CONHEÇA A ORNY", font=font(33, True), fill="#061006")
    draw.text((82, 1802), "Seu progresso começa aqui.", font=font(28, True), fill=WHITE)
    canvas.convert("RGB").save(ROOT / output, quality=95, optimize=True)


feed(
    "base-aluno-feed.png",
    "criativo-04-aluno-feed-1080x1080.jpg",
    "SEU TREINO NA PALMA DA MÃO",
    "Acompanhe exercícios, evolução e rotina em um só lugar.",
)
feed(
    "base-personal-feed.png",
    "criativo-05-personal-feed-1080x1080.jpg",
    "MENOS PLANILHA. MAIS ALUNOS.",
    "Prescreva treinos e acompanhe seus alunos com organização.",
    "ATÉ 2 ALUNOS GRÁTIS",
)
story(
    "base-aluno-stories.png",
    "criativo-06-aluno-stories-1080x1920.jpg",
    "TREINE COM DIREÇÃO",
    "Seu treino e sua evolução sempre no celular.",
)
story(
    "base-personal-stories.png",
    "criativo-07-personal-stories-1080x1920.jpg",
    "ORGANIZE SEUS ALUNOS",
    "Treinos, acompanhamento e evolução em um só sistema.",
)

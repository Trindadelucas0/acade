from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
LOGO = ROOT.parent.parent / "app" / "frontend" / "public" / "brand" / "orny-wordmark.png"
BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")
REGULAR = Path(r"C:\Windows\Fonts\arial.ttf")
GREEN = "#20F51B"
WHITE = "#FFFFFF"
MUTED = "#D5D9D6"
DOMAIN = "ornygym.avadesk.com.br"


def f(size, bold=False):
    return ImageFont.truetype(str(BOLD if bold else REGULAR), size=size)


def cover(path, size):
    image = Image.open(path).convert("RGB")
    scale = max(size[0] / image.width, size[1] / image.height)
    image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    left = (image.width - size[0]) // 2
    top = (image.height - size[1]) // 2
    return image.crop((left, top, left + size[0], top + size[1])).convert("RGBA")


def lines(draw, text, text_font, width):
    result, line = [], ""
    for word in text.split():
        candidate = f"{line} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=text_font)[2] <= width:
            line = candidate
        else:
            if line:
                result.append(line)
            line = word
    if line:
        result.append(line)
    return result


def logo(canvas, x, y, max_width):
    mark = Image.open(LOGO).convert("RGBA")
    mark.thumbnail((max_width, 160), Image.Resampling.LANCZOS)
    canvas.alpha_composite(mark, (x, y))


def pill(draw, x, y, text, active=True, size=23):
    tf = f(size, True)
    box = draw.textbbox((0, 0), text, font=tf)
    w = box[2] + 34
    fill = GREEN if active else "#1D2420"
    color = "#051005" if active else WHITE
    draw.rounded_rectangle((x, y, x + w, y + 48), radius=24, fill=fill, outline="#334039")
    draw.text((x + 17, y + 11), text, font=tf, fill=color)
    return w


def feed(source, output, audience, headline, body, features):
    canvas = cover(ROOT / source, (1080, 1080))
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for x in range(790):
        alpha = int(248 * max(0, 1 - x / 820) ** .55)
        od.line((x, 0, x, 1080), fill=(0, 0, 0, alpha))
    od.rectangle((0, 0, 1080, 1080), fill=(0, 0, 0, 28))
    canvas = Image.alpha_composite(canvas, overlay)
    draw = ImageDraw.Draw(canvas)
    logo(canvas, 64, 52, 210)
    draw.text((66, 160), audience, font=f(24, True), fill=GREEN)

    y = 235
    headline_font = f(63, True)
    for line in lines(draw, headline, headline_font, 560):
        draw.text((64, y), line, font=headline_font, fill=WHITE, stroke_width=1, stroke_fill="#000000")
        y += 69
    y += 25
    body_font = f(30)
    for line in lines(draw, body, body_font, 540):
        draw.text((66, y), line, font=body_font, fill=MUTED)
        y += 41

    y = max(y + 30, 715)
    for feature in features:
        draw.ellipse((68, y + 7, 84, y + 23), fill=GREEN)
        draw.text((102, y), feature, font=f(24, True), fill=WHITE)
        y += 48

    draw.rounded_rectangle((64, 918, 420, 1000), radius=20, fill=GREEN)
    draw.text((97, 943), "CONHECER A ORNY", font=f(27, True), fill="#051005")
    draw.text((630, 1020), DOMAIN, font=f(23, True), fill=WHITE)
    canvas.convert("RGB").save(ROOT / output, quality=95, optimize=True)


def story(source, output, audience, headline, body, features):
    canvas = cover(ROOT / source, (1080, 1920))
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for y in range(1180):
        alpha = int(247 * max(0, 1 - y / 1240) ** .52)
        od.line((0, y, 1080, y), fill=(0, 0, 0, alpha))
    od.rectangle((0, 0, 1080, 1920), fill=(0, 0, 0, 20))
    canvas = Image.alpha_composite(canvas, overlay)
    draw = ImageDraw.Draw(canvas)
    logo(canvas, 74, 94, 245)
    draw.text((78, 233), audience, font=f(27, True), fill=GREEN)

    y = 330
    headline_font = f(76, True)
    for line in lines(draw, headline, headline_font, 900):
        draw.text((76, y), line, font=headline_font, fill=WHITE, stroke_width=1, stroke_fill="#000000")
        y += 84
    y += 26
    body_font = f(35)
    for line in lines(draw, body, body_font, 875):
        draw.text((79, y), line, font=body_font, fill=MUTED)
        y += 49

    y += 35
    x = 79
    for feature in features:
        w = pill(draw, x, y, feature, active=False, size=22)
        x += w + 12
        if x > 850:
            x = 79
            y += 60

    draw.rounded_rectangle((74, 1635, 535, 1744), radius=25, fill=GREEN)
    draw.text((119, 1668), "COMEÇAR AGORA", font=f(35, True), fill="#051005")
    draw.rounded_rectangle((73, 1780, 686, 1844), radius=18, fill=(0, 0, 0, 195), outline="#344039")
    draw.text((99, 1798), DOMAIN, font=f(28, True), fill=WHITE)
    canvas.convert("RGB").save(ROOT / output, quality=95, optimize=True)


feed(
    "base-aluno-feed.png",
    "criativo-v2-01-aluno-feed-1080x1080.jpg",
    "SISTEMA DE TREINO PARA ALUNOS",
    "PARE DE TREINAR NO IMPROVISO.",
    "Veja o treino do dia, registre séries e cargas e acompanhe seu histórico.",
    ["Treino guiado", "Cargas e repetições", "Histórico e progresso"],
)

feed(
    "base-personal-feed.png",
    "criativo-v2-02-personal-feed-1080x1080.jpg",
    "SISTEMA PARA PERSONAL TRAINERS",
    "A FICHA NÃO PRECISA FICAR NO WHATSAPP.",
    "Crie treinos, acompanhe sessões recentes e responda seus alunos no mesmo sistema.",
    ["Fichas de treino", "Sessões recentes", "Mensagens e pendências"],
)

story(
    "base-aluno-stories.png",
    "criativo-v2-03-aluno-stories-1080x1920.jpg",
    "PARA QUEM TREINA",
    "TREINO NO CELULAR. SEM ADIVINHAR O PRÓXIMO PASSO.",
    "A ORNY mostra o treino, cronometra as séries e registra o que você fez.",
    ["Treino", "Cronômetro", "Histórico"],
)

story(
    "base-personal-stories.png",
    "criativo-v2-04-personal-stories-1080x1920.jpg",
    "PARA QUEM PRESCREVE TREINOS",
    "DA FICHA AO ACOMPANHAMENTO. NO MESMO SISTEMA.",
    "Prescreva exercícios, veja sessões recentes e converse com o aluno.",
    ["Fichas", "Alunos", "Atendimentos"],
)

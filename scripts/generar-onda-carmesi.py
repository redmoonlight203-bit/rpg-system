"""Genera los tres PNG originales de la Onda carmesí (Python 3, Pillow)."""
from math import cos, pi, sin
from pathlib import Path
from random import Random

from PIL import Image, ImageDraw

SIZE = 128
CENTER = (SIZE - 1) / 2
COUNT = 16
DELAY = 60
OUT = Path(__file__).resolve().parents[1] / 'public/vfx/yugen'
RNG = Random(641)
SPARKS = [(2 * pi * i / 24 + RNG.uniform(-.11, .11),
           RNG.uniform(.65, 1.15), RNG.uniform(0, .18)) for i in range(24)]


def point(angle, radius):
    return round(CENTER + cos(angle) * radius), round(CENTER + sin(angle) * radius)


def ring(draw, radius, t, variant):
    # Double concentric pressure fronts: silhouettes remain hollow over a token.
    opacity = (1 - t) ** .63
    for i in range(24):
        begin = i * pi / 12 + variant * .085
        span = .208 if i % 4 != 2 else .124
        points = []
        for j in range(9):
            a = begin + span * j / 8
            jagged = (1.7 * sin(a * 8 + .6) + 1.2 * cos(a * 15 - t * 2)
                      + max(0, 1 - abs(j - 5) / 2) * (2.8 if i % 3 == 0 else .4))
            points.append(point(a, radius + jagged))
        draw.line(points, fill=(106, 13, 34, round(197 * opacity)), width=8 if not variant else 5)
        draw.line(points, fill=(244, 44, 70, round(251 * opacity)), width=4 if not variant else 3)
        if i % 4 != 2:
            draw.line(points[1:7], fill=(255, 159, 135, round(255 * opacity)), width=2 if not variant else 1)
        if i % 5 == 0 and not variant:
            draw.line(points[3:6], fill=(255, 226, 185, round(255 * opacity)), width=1)


def frame(i):
    image = Image.new('RGBA', (SIZE, SIZE))
    if i in (0, COUNT - 1):
        return image
    draw = ImageDraw.Draw(image)
    t = (i - 1) / (COUNT - 2)
    reach = 4 + 53 * (1 - (1 - t) ** 1.48)
    for j, (a, speed, delay) in enumerate(SPARKS):
        local = (t - delay) / (1 - delay)
        if not 0 < local < .95:
            continue
        distance = min(61, 5 + 58 * speed * (1 - (1 - local) ** 1.15))
        alpha = round(230 * (1 - local) ** .74)
        tail = point(a, max(0, distance - 2 - (1 - local) * 7))
        tip = point(a, distance)
        draw.line([tail, tip], fill=(220, 38, 58, alpha), width=2)
        if j % 3 != 0:
            draw.point(tip, fill=(255, 194, 137, alpha))
    if .15 < t < .97:
        inner = (t - .15) / .85
        ring(draw, 5 + 48 * (1 - (1 - inner) ** 1.6), inner, 1)
    ring(draw, reach, t, 0)
    # Brief claw-like red flashes at the origin signal the start of the roar.
    if t < .27:
        alpha = round(240 * (1 - t / .27))
        for offset, height in [(-7, 11), (0, 14), (7, 10)]:
            x = CENTER + offset
            draw.polygon([(x - 4, CENTER + height), (x - 1, CENTER - height / 2),
                          (x + 6, CENTER - height), (x + 3, CENTER + 1)], fill=(131, 9, 39, alpha))
            draw.polygon([(x - 2, CENTER + height - 4), (x + .3, CENTER - height / 2),
                          (x + 5, CENTER - height + 1), (x + 2, CENTER)], fill=(255, 144, 112, alpha))
    return image


def main():
    frames = [frame(i) for i in range(COUNT)]
    frames[0].save(OUT / 'onda-carmesi.png', save_all=True, append_images=frames[1:],
                   duration=DELAY, loop=1, disposal=0, blend=0, optimize=True)
    frames[0].save(OUT / 'onda-carmesi-loop.png', save_all=True, append_images=frames[1:],
                   duration=[DELAY] * (COUNT - 1) + [DELAY + 240],
                   loop=0, disposal=0, blend=0, optimize=True)
    frames[8].save(OUT / 'onda-carmesi-preview.png', optimize=True)


if __name__ == '__main__':
    main()

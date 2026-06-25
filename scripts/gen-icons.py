#!/usr/bin/env python3
"""
Generates MomManager Android launcher icons — pure Python stdlib, no PIL needed.
Pink/magenta gradient (#C2185B → #E91E8C), rounded square, white heart (40%),
white "MomManager" text below heart.
"""
import struct, zlib, math, os

# ── PNG encoder ──────────────────────────────────────────────────────────────
def write_png(width, height, pixels):
    """pixels: list of (r,g,b,a) tuples, row-major."""
    def chunk(tag, data):
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', crc)

    raw = bytearray()
    for y in range(height):
        raw.append(0)           # filter: None
        for x in range(width):
            r, g, b, a = pixels[y * width + x]
            raw += bytes([r, g, b, a])

    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    return (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', ihdr)
        + chunk(b'IDAT', zlib.compress(bytes(raw), 9))
        + chunk(b'IEND', b'')
    )

# ── Math helpers ─────────────────────────────────────────────────────────────
def clamp01(v):
    return max(0.0, min(1.0, v))

def lerp_color(c1, c2, t):
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))

def sdf_rounded_rect(px, py, cx, cy, half_w, half_h, radius):
    """Returns signed distance (negative = inside)."""
    qx = abs(px - cx) - half_w + radius
    qy = abs(py - cy) - half_h + radius
    return math.sqrt(max(qx, 0)**2 + max(qy, 0)**2) - radius

def heart_sdf(px, py, cx, cy, scale):
    """Algebraic heart SDF. Negative inside."""
    nx = (px - cx) / scale
    ny = -(py - cy) / scale
    x2, y2 = nx * nx, ny * ny
    f  = (x2 + y2 - 1)
    dfdx = 6 * nx * f * f - 2 * nx * (y2 * ny)
    dfdy = 6 * ny * f * f - 3 * x2 * y2
    grad = math.sqrt(dfdx**2 + dfdy**2) + 1e-6
    sdf_val = (x2 + y2 - 1)**3 - x2 * (y2 * ny)
    return (sdf_val / grad) * scale

# ── Bitmap font (5×7, each row is a 5-bit value, MSB = left) ─────────────────
# Characters needed: M o m M a n a g e r  →  unique: M o m a n g e r
FONT_5x7 = {
    'M': [0b11011, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
    'o': [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
    'm': [0b00000, 0b11011, 0b10101, 0b10101, 0b10101, 0b10001, 0b10001],
    'a': [0b00000, 0b01110, 0b00001, 0b01111, 0b10001, 0b10011, 0b01101],
    'n': [0b00000, 0b10110, 0b11001, 0b10001, 0b10001, 0b10001, 0b10001],
    'g': [0b00000, 0b01111, 0b10001, 0b10001, 0b01111, 0b00001, 0b01110],
    'e': [0b00000, 0b01110, 0b10001, 0b11111, 0b10000, 0b10001, 0b01110],
    'r': [0b00000, 0b10110, 0b11001, 0b10000, 0b10000, 0b10000, 0b10000],
}

CHAR_W = 5
CHAR_H = 7

def render_text_mask(text, scale):
    """
    Returns a dict mapping (col, row) → True for lit pixels.
    scale: pixel size multiplier.
    """
    gap = scale  # 1-pixel gap between chars (in output pixels)
    pixels = {}
    x_cursor = 0
    for ch in text:
        glyph = FONT_5x7.get(ch)
        if glyph is None:
            x_cursor += (CHAR_W + 1) * scale
            continue
        for row_idx, row_bits in enumerate(glyph):
            for col_idx in range(CHAR_W):
                if row_bits & (1 << (CHAR_W - 1 - col_idx)):
                    for dy in range(scale):
                        for dx in range(scale):
                            pixels[(x_cursor + col_idx * scale + dx,
                                    row_idx * scale + dy)] = True
        x_cursor += (CHAR_W + 1) * scale
    total_width = x_cursor - gap
    return pixels, total_width, CHAR_H * scale

# ── Icon renderer ─────────────────────────────────────────────────────────────
COLOR_A = (194, 24, 91)    # #C2185B  — top-left
COLOR_B = (233, 30, 140)   # #E91E8C  — bottom-right
WHITE   = (255, 255, 255)

def generate_icon(size):
    pixels = []
    cx = cy = size / 2.0
    pad    = size * 0.06
    radius = size * 0.24
    half   = size / 2.0 - pad

    # Heart: 40% of icon width → scale = size * 0.20 gives ~40% visible span
    h_scale = size * 0.20
    # Shift heart upward so there is room for text below
    h_cy    = cy - size * 0.06

    aa = 1.5

    # Pre-build text mask
    text = 'MomManager'
    scale_text = max(1, size // 48)
    text_mask, text_w, text_h = render_text_mask(text, scale_text)
    text_ox = int((size - text_w) / 2)
    # Place text below heart: heart bottom ≈ h_cy + h_scale*1.1
    text_oy = int(h_cy + h_scale * 1.15)

    for row in range(size):
        for col in range(size):
            px, py = col + 0.5, row + 0.5

            # Background rounded square
            d_bg = sdf_rounded_rect(px, py, cx, cy, half, half, radius)
            if d_bg > aa:
                pixels.append((0, 0, 0, 0))
                continue

            bg_alpha = clamp01(1.0 - d_bg / aa)

            # Gradient
            t_grad = clamp01((px / size) * 0.4 + (py / size) * 0.6)
            bg_r, bg_g, bg_b = lerp_color(COLOR_A, COLOR_B, t_grad)

            # Heart
            d_heart = heart_sdf(px, py, cx, h_cy, h_scale)
            heart_blend = clamp01(-d_heart / aa + 0.5)

            # Text (pixel lookup)
            lx = col - text_ox
            ly = row - text_oy
            text_blend = 1.0 if text_mask.get((lx, ly)) else 0.0

            # Composite: gradient → heart → text (both white)
            white_blend = max(heart_blend, text_blend)

            r = int(bg_r + (WHITE[0] - bg_r) * white_blend)
            g = int(bg_g + (WHITE[1] - bg_g) * white_blend)
            b = int(bg_b + (WHITE[2] - bg_b) * white_blend)
            a = int(bg_alpha * 255)

            pixels.append((
                max(0, min(255, r)),
                max(0, min(255, g)),
                max(0, min(255, b)),
                a
            ))

    return write_png(size, size, pixels)

# ── Generate all sizes ────────────────────────────────────────────────────────
SIZES = {
    'mipmap-mdpi':    48,
    'mipmap-hdpi':    72,
    'mipmap-xhdpi':   96,
    'mipmap-xxhdpi':  144,
    'mipmap-xxxhdpi': 192,
}

res_dir = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    '..', 'android', 'app', 'src', 'main', 'res'
)

for folder, size in SIZES.items():
    data = generate_icon(size)
    for name in ('ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png'):
        path = os.path.join(res_dir, folder, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as f:
            f.write(data)
    print(f'✓ {folder}/{size}x{size}px')

print('✓ All MomManager icons generated!')

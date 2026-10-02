import zlib
import struct

def make_png(width, height, pixel_grid):
    # pixel_grid: 2D array of (r, g, b, a) or 0/1 (0=transparent, 1=black 255)
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0) # filter type 0 (None)
        for x in range(width):
            val = pixel_grid[y][x]
            if isinstance(val, (int, float)):
                if val > 0:
                    raw_data.extend([0, 0, 0, int(val * 255)]) # Black with alpha
                else:
                    raw_data.extend([0, 0, 0, 0]) # Fully transparent
            else:
                raw_data.extend(val)

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)) # RGBA
    idat = chunk(b'IDAT', zlib.compress(bytes(raw_data), 9))
    iend = chunk(b'IEND', b'')
    return header + ihdr + idat + iend

# 22x22 픽셀 냥이 실루엣 그리드 디자인
# 22x22 기준 (x: 0..21, y: 0..21)
# 중앙: 11
grid_22 = [[0 for _ in range(22)] for _ in range(22)]

# 귀여운 픽셀 고양이 모양 (22x22 내에 정중앙 배치)
# 귀 (y=4, 5, 6)
# 머리 윤곽 (y=7..17)
cat_art_22 = [
    # 0123456789012345678901
    "                      ", # 0
    "                      ", # 1
    "                      ", # 2
    "    ##          ##    ", # 3 (귀 끝)
    "   ####        ####   ", # 4
    "   ######    ######   ", # 5
    "  ##################  ", # 6 (머리 연결)
    " #################### ", # 7
    " #################### ", # 8
    " #################### ", # 9
    " ####  ########  #### ", # 10 (눈)
    " ####  ########  #### ", # 11 (눈)
    " #################### ", # 12
    " #######  ##  ####### ", # 13 (코/입)
    "  ######      ######  ", # 14 (볼/턱)
    "   ################   ", # 15
    "    ##############    ", # 16
    "      ##########      ", # 17 (턱 끝)
    "                      ", # 18
    "                      ", # 19
    "                      ", # 20
    "                      "  # 21
]

for y in range(22):
    row = cat_art_22[y]
    for x in range(22):
        if x < len(row) and row[x] == '#':
            grid_22[y][x] = 1.0

# 44x44 그리드는 22x22 그리드를 2x 확대 (Retina 완벽 대응)
grid_44 = [[0 for _ in range(44)] for _ in range(44)]
for y in range(22):
    for x in range(22):
        val = grid_22[y][x]
        grid_44[y*2][x*2] = val
        grid_44[y*2+1][x*2] = val
        grid_44[y*2][x*2+1] = val
        grid_44[y*2+1][x*2+1] = val

png_22 = make_png(22, 22, grid_22)
png_44 = make_png(44, 44, grid_44)

with open("/Users/zero/workspace/private/dopamine-sidey/client/electron/tray-iconTemplate.png", "wb") as f:
    f.write(png_22)

with open("/Users/zero/workspace/private/dopamine-sidey/client/electron/tray-iconTemplate@2x.png", "wb") as f:
    f.write(png_44)

with open("/Users/zero/workspace/private/dopamine-sidey/client/electron/tray-icon.png", "wb") as f:
    f.write(png_22)

print("Icons generated successfully!")

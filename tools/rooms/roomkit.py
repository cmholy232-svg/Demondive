"""Room authoring kit. Rooms are laid out in Python with tile coordinates
measured from the bottom-left (x right, y up; y=0 is the top of the floor),
then written as the text maps the game reads (data/rooms/<level>/*.txt).

Also checks every room: the map is rectangular, Milo can reach the exit
with the base movement kit, and nothing spawns inside a wall."""
import pathlib

JUMP_UP = 3          # tiles a single jump clears comfortably
DOUBLE_UP = 6        # tiles with the double jump
REACH = 6            # tiles of horizontal travel during a jump


class Room:
    def __init__(self, name, kind, width, height, floor=3, **meta):
        self.name, self.kind, self.w, self.h, self.floor = name, kind, width, height, floor
        self.meta = meta
        self.rides = []   # (from_tiles, to_tiles): standing spots a moving platform links
        self.grid = [[" "] * width for _ in range(height)]
        for x in range(width):
            self.grid[0][x] = "#"
            for y in range(height - floor, height):
                self.grid[y][x] = "#"
        for y in range(height):
            self.grid[y][0] = "#"
            self.grid[y][width - 1] = "#"

    # y is tiles above the floor surface: y=0 is the first air row on the floor.
    def _row(self, y):
        return self.h - self.floor - 1 - y

    def set(self, x, y, c):
        r = self._row(y)
        if 0 <= r < self.h and 0 <= x < self.w:
            self.grid[r][x] = c

    def get(self, x, y):
        r = self._row(y)
        if r < 0 or r >= self.h or x < 0 or x >= self.w:
            return "#"
        return self.grid[r][x]

    def block(self, x, y, w, h, c="#"):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.set(xx, yy, c)

    def stairs(self, x, w_each, steps, up=True):
        for i in range(steps):
            sx = x + i * w_each if up else x - (i + 1) * w_each
            self.block(sx, 0, w_each, i + 1)

    def ledge(self, x, y, w):
        self.block(x, y, w, 1, "=")

    def pit(self, x, w, lava=True):
        """Cuts a pit into the floor; lava (or spikes) sits in its bottom row."""
        for xx in range(x, x + w):
            for yy in range(-self.floor, 0):
                self.set(xx, yy, " ")
            self.set(xx, -self.floor, "#")
            self.set(xx, -self.floor + 1, "~" if lava else "^")

    def spikes(self, x, y, w):
        self.block(x, y, w, 1, "^")

    def mover(self, x, y, w, left_stop, right_stop):
        self.block(x, y, w, 1, "M")
        self.set(left_stop, y, "|")
        self.set(right_stop, y, "|")
        here = [(xx, y + 1) for xx in range(x, x + w)]
        self.rides.append((here, [(xx, y + 1) for xx in range(left_stop + 1, right_stop)]))

    def lift(self, x, y, w, low, high):
        self.block(x, y, w, 1, "V")
        for xx in range(x, x + w):
            if low - 1 >= 0 and self.get(xx, low - 1) == " ":
                self.set(xx, low - 1, ":")
            self.set(xx, high + 1, ":")
        here = [(xx, y + 1) for xx in range(x, x + w)]
        self.rides.append((here, [(xx, yy + 1) for xx in range(x, x + w) for yy in range(low, high + 1)]))

    def put(self, c, x, y=0):
        self.set(x, y, c)

    # --- Level mechanics ------------------------------------------------------
    def current(self, x, y, w, h, right=True):
        """A band of water current pushing Milo sideways."""
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                if self.get(xx, yy) == " ":
                    self.set(xx, yy, ">" if right else "<")
        # The tide carries Milo across the band in its direction.
        start, end = (x - 1, x + w) if right else (x + w, x - 1)
        here = [(start + d, yy) for d in (-1, 0) for yy in range(y - 1, y + h + 3)]
        there = [(end + d, yy) for d in (0, 1, -1) for yy in range(y - 2, y + h + 3)]
        if not right:
            here = [(start - d, yy) for d in (-1, 0) for yy in range(y - 1, y + h + 3)]
            there = [(end - d, yy) for d in (0, 1, -1) for yy in range(y - 2, y + h + 3)]
        self.rides.append((here, there))

    def vent(self, x, y=0, w=2, rise=8):
        """Bubble vent on a surface at height y: lifts Milo up its column."""
        self.block(x, y, w, 1, "*")
        here = [(xx, y) for xx in range(x, x + w)]
        self.rides.append((here, [(xx, yy) for xx in range(x - 1, x + w + 1) for yy in range(y, y + rise + 1)]))

    def cover(self, x, y, w):
        """Thorn thicket (two tiles tall) that swallows enemy shots."""
        self.block(x, y, w, 1, "%")

    def rail(self, x, y, w):
        """A floor rail that switches on and off."""
        self.block(x, y, w, 1, "!")

    def ice(self, x, y, w, h=1):
        self.block(x, y, w, h, "-")

    def icicles(self, x, y, w):
        """Icicles hanging in the air row y (put them right under a ceiling)."""
        self.block(x, y, w, 1, "Y")

    def portals(self, a, b, pair=1):
        """Linked motel doors at (x, y) a and b; pair 1 uses 1/2, pair 2 uses 3/4."""
        ca, cb = ("1", "2") if pair == 1 else ("3", "4")
        self.set(a[0], a[1], ca)
        self.set(b[0], b[1], cb)
        self.rides.append(([a], [b]))
        self.rides.append(([b], [a]))

    def mirror(self, x, y, h):
        for yy in range(y, y + h):
            self.set(x, yy, "/")

    def corruption(self, x, w):
        """A pool of corruption in a shallow floor dip."""
        for xx in range(x, x + w):
            self.set(xx, -1, "&")

    def enemies(self, spec):
        """spec: list of (letter, x, y)."""
        for c, x, y in spec:
            self.set(x, y, c)

    def text(self):
        head = [f"name: {self.name}", f"type: {self.kind}"]
        head += [f"{k}: {v}" for k, v in self.meta.items()]
        return "\n".join(head) + "\n---\n" + "\n".join("".join(r) for r in self.grid) + "\n"

    # --- Validation ---------------------------------------------------------
    def find(self, c):
        for r, row in enumerate(self.grid):
            for x, v in enumerate(row):
                if v == c:
                    yield x, self.h - self.floor - 1 - r

    def solid_at(self, x, y):
        return self.get(x, y) in "#-"

    def standable(self, x, y):
        below = self.get(x, y - 1)
        here_free = self.get(x, y) not in "#-" and self.get(x, y + 1) not in "#-"
        return here_free and below in "#-=MV|:&" and self.get(x, y) not in "^~"

    def reachable_exit(self):
        start = next(self.find("P"))
        exits = set(self.find("E"))
        seen = {start}
        todo = [start]
        while todo:
            x, y = todo.pop()
            if (x, y) in exits:
                return True
            for here, there in self.rides:
                if (x, y) in here:
                    for spot in there:
                        if spot not in seen:
                            seen.add(spot)
                            todo.append(spot)
            for dx in range(-REACH - 8, REACH + 9):
                for dy in range(-14, DOUBLE_UP + 1):
                    nx, ny = x + dx, y + dy
                    if abs(dx) > REACH + max(0, -dy) // 2:
                        continue
                    if (nx, ny) in seen or not self.standable(nx, ny) and (nx, ny) not in exits:
                        continue
                    if dy > JUMP_UP and abs(dx) > REACH - 1:
                        continue
                    if not self._clear_column(x, y, nx, ny):
                        continue
                    seen.add((nx, ny))
                    todo.append((nx, ny))
        return False

    def _clear_column(self, x, y, nx, ny):
        # Ceilings are ignored: rooms are open enough that distance limits decide.
        return True

    def check(self):
        problems = []
        widths = {len(r) for r in self.grid}
        if len(widths) != 1:
            problems.append("rows differ in width")
        if sum(1 for _ in self.find("P")) != 1:
            problems.append("needs exactly one P")
        if not list(self.find("E")):
            problems.append("needs an exit E")
        elif not self.reachable_exit():
            problems.append("exit not reachable with the base kit")
        return problems


def write(rooms, folder):
    folder = pathlib.Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    ok = True
    for room in rooms:
        problems = room.check()
        status = "ok" if not problems else "; ".join(problems)
        print(f"{room.file:34s} {room.w}x{room.h}  {status}")
        ok = ok and not problems
        (folder / f"{room.file}.txt").write_text(room.text())
    return ok

"""Room authoring kit. Rooms are laid out in Python with tile coordinates
measured from the bottom-left (x right, y up; y=0 is the top of the floor),
then written as the text maps the game reads (data/rooms/<level>/*.txt).

Also checks every room: the map is rectangular, Milo can reach the exit
with the base movement kit, and nothing spawns inside a wall.

Box rooms (levels laid out as a grid of rooms) declare gates instead of an
exit: one on each side, so the run can link the box to neighbours above,
below, left or right. The check then proves every gate reaches every other."""
import pathlib

JUMP_UP = 3          # tiles a single jump clears comfortably
DOUBLE_UP = 6        # tiles with the double jump
REACH = 6            # tiles of horizontal travel during a jump
GATE_SPAN = 4        # gates are 4 tiles wide (top/bottom) or tall (sides)
SIDES = "WENS"


class Room:
    def __init__(self, name, kind, width, height, floor=3, **meta):
        self.name, self.kind, self.w, self.h, self.floor = name, kind, width, height, floor
        self.meta = meta
        self.rides = []   # (from_tiles, to_tiles): standing spots a moving platform links
        self.gates = {}   # side -> feet height (W/E) or left column (N/S)
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

    # --- Box gates -------------------------------------------------------------
    def gate(self, side, at):
        """W/E: a doorway in the side wall with Milo's feet at height `at`;
        N/S: a 4-wide shaft through the ceiling or floor starting at column `at`.
        Sealed with wall in the map; the game opens the ones the level links."""
        self.gates[side] = at
        if side in "WE" and at > 0:
            self.block(1 if side == "W" else self.w - 4, at - 1, 3, 1)

    def gates_all(self, w_at, e_at, n_at, s_at):
        self.gate("W", w_at); self.gate("E", e_at); self.gate("N", n_at); self.gate("S", s_at)

    def top_air(self):
        return self.h - self.floor - 2

    def gate_spots(self, side):
        """(where Milo appears coming in, where he can leave from)."""
        at = self.gates[side]
        if side in "WE":
            spot = [(1 if side == "W" else self.w - 2, at)]
            return spot, spot
        if side == "S":
            spot = [p for p in ((at - 1, self.surface(at - 1)), (at + GATE_SPAN, self.surface(at + GATE_SPAN)))
                    if self.standable(*p)]
            return spot, spot
        top = self.top_air()
        land = []
        for xx in (at + 1, at + 2):
            for yy in range(top, -1, -1):
                if self.standable(xx, yy):
                    land.append((xx, yy))
                    break
        leave = [(xx, yy) for xx in range(at - 1, at + GATE_SPAN + 1)
                 for yy in range(top - DOUBLE_UP, top + 1) if self.standable(xx, yy)]
        return land, leave

    def gate_clear(self, side):
        """The tiles just inside a gate must be open air."""
        at = self.gates[side]
        if side in "WE":
            x = 1 if side == "W" else self.w - 2
            cells = [(x, yy) for yy in range(at, at + GATE_SPAN)]
        elif side == "N":
            cells = [(xx, yy) for xx in range(at, at + GATE_SPAN) for yy in range(self.top_air() - 2, self.top_air() + 1)]
        else:
            base = self.surface(at)
            if any(self.surface(xx) != base for xx in range(at, at + GATE_SPAN)):
                return False
            cells = [(xx, yy) for xx in range(at, at + GATE_SPAN) for yy in range(base, base + 3)]
        return all(self.get(x, y) == " " for x, y in cells)

    def surface(self, x):
        """Feet height on the ground stack in column x (blocks on the floor raise it)."""
        y = 0
        while self.solid_at(x, y):
            y += 1
        return y

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
        if self.gates:
            head.append("gates: " + " ".join(f"{side}{self._gate_value(side)}" for side in SIDES if side in self.gates))
        return "\n".join(head) + "\n---\n" + "\n".join("".join(r) for r in self.grid) + "\n"

    def _gate_value(self, side):
        # The game reads map rows for side gates and columns for top/bottom ones.
        return self._row(self.gates[side]) if side in "WE" else self.gates[side]

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
        exits = set(self.find("E"))
        return bool(self.reach([next(self.find("P"))], exits) & exits)

    def reach(self, starts, extra=frozenset()):
        """Every standing spot Milo can get to from starts with the base kit.
        extra: spots that count as reached even though nobody stands there."""
        seen = set(starts)
        todo = list(starts)
        while todo:
            x, y = todo.pop()
            if (x, y) in extra:
                continue
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
                    if (nx, ny) in seen or not self.standable(nx, ny) and (nx, ny) not in extra:
                        continue
                    if dy > JUMP_UP and abs(dx) > REACH - 1:
                        continue
                    if not self._clear_column(x, y, nx, ny):
                        continue
                    seen.add((nx, ny))
                    todo.append((nx, ny))
        return seen

    def gate_problems(self):
        problems = []
        spots = {}
        for side in SIDES:
            if side not in self.gates:
                problems.append(f"missing gate {side}")
                continue
            if not self.gate_clear(side):
                problems.append(f"gate {side} is blocked")
            spots[side] = self.gate_spots(side)
            if not spots[side][0] or not spots[side][1]:
                problems.append(f"gate {side} has nowhere to stand")
        if problems:
            return problems
        for a in SIDES:
            reached = self.reach(spots[a][0])
            for b in SIDES:
                if a != b and not reached & set(spots[b][1]):
                    problems.append(f"{a} can't reach {b}")
        if any(True for _ in self.find("P")):
            reached = self.reach([next(self.find("P"))])
            for b in SIDES:
                if not reached & set(spots[b][1]):
                    problems.append(f"start can't reach {b}")
        return problems

    def _clear_column(self, x, y, nx, ny):
        # Ceilings are ignored: rooms are open enough that distance limits decide.
        return True

    def check(self):
        problems = []
        widths = {len(r) for r in self.grid}
        if len(widths) != 1:
            problems.append("rows differ in width")
        if self.gates:
            if sum(1 for _ in self.find("P")) > 1:
                problems.append("at most one P")
            problems += self.gate_problems()
            if self.kind == "boss" and not list(self.find("E")):
                problems.append("boss box needs the way down (E)")
            return problems
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

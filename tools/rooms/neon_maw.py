"""Level 1, The Neon Maw. Run: python tools/rooms/neon_maw.py

Every room is a box with a gate on each side. A run links the boxes into a
different map each time (scenes/run/level_map.gd), so each one is built to
be crossed in any direction: in through the left wall, out through the
ceiling, down through the floor. The kit proves every gate reaches every
other with the base movement kit.

Gate heights are feet heights in tiles above the floor surface; N and S
gates are 4-wide shafts starting at the given column. A ledge sits under
every N gate so Milo lands on it when he drops in from the room above."""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from roomkit import Room, write

OUT = pathlib.Path(__file__).resolve().parents[2] / "data/rooms/neon_maw"
rooms = []


def room(file, *args, **kw):
    r = Room(*args, **kw)
    r.file = file
    rooms.append(r)
    return r


def ladder(r, x, y0, y1, w=6, swing=6, step=4):
    """Ledges climbing from just above y0 to y1, swinging left and right."""
    y, i = y0 + step, 0
    while y <= y1:
        r.ledge(x + (swing if i % 2 else 0), y, w)
        y, i = y + step, i + 1


def roof_gate(r, x):
    """N gate at column x with its landing ledge three tiles under the ceiling."""
    r.gate("N", x)
    r.ledge(x - 2, r.top_air() - 3, 8)


# --- Entry -------------------------------------------------------------------

# Rooftop Landing: Milo drops onto a neon rooftop street. Billboards climb to
# a skylight; a service shaft drops through the floor.
r = room("entry_rooftop_landing", "room.rooftop_landing", "entry", 78, 30)
r.put("P", 5)
r.block(14, 0, 8, 2); r.ledge(8, 4, 6); r.ledge(22, 6, 6)
r.gate("S", 30)
r.block(40, 0, 6, 3); r.ledge(36, 7, 6)
ladder(r, 46, 7, 21, swing=7)
roof_gate(r, 50)
r.block(62, 0, 15, 7); r.ledge(56, 10, 5); r.ledge(66, 11, 6)
r.gate("W", 0); r.gate("E", 7)
r.put("G", 69, 12)
r.enemies([("i", 18, 2), ("i", 25, 0), ("f", 34, 10), ("k", 43, 3),
           ("I", 10, 5), ("F", 52, 18), ("I", 66, 7)])

# Last Bite Alley: a long alley under a fire-escape grid.
r = room("entry_last_bite_alley", "room.last_bite_alley", "entry", 90, 28)
r.put("P", 4)
r.gate("W", 0)
r.ledge(10, 4, 8); r.ledge(20, 8, 8); r.ledge(10, 12, 8); r.ledge(20, 16, 8)
r.block(30, 0, 4, 3); r.pit(36, 8); r.mover(37, 3, 4, 36, 44)
r.block(46, 0, 10, 2); r.gate("S", 60)
r.ledge(46, 6, 6); r.ledge(54, 10, 6); r.ledge(44, 14, 6); r.ledge(34, 18, 8)
roof_gate(r, 38)
r.block(70, 0, 19, 4); r.ledge(66, 8, 6); r.ledge(76, 11, 7)
r.gate("E", 4)
r.enemies([("i", 24, 9), ("i", 48, 2), ("s", 56, 11), ("k", 66, 0), ("f", 40, 14),
           ("H", 50, 2), ("I", 76, 4), ("F", 22, 19)])

# --- Combat ------------------------------------------------------------------

# Neon Maw Arcade: two storeys of cabinets on a steel deck, spike gutters
# below, a lift up to the roof.
r = room("combat_neon_maw_arcade", "room.neon_maw_arcade", "combat", 96, 34)
r.gate("W", 0)
r.block(8, 0, 10, 2); r.spikes(18, 0, 6); r.block(24, 0, 10, 2)
r.ledge(4, 5, 6); r.ledge(14, 7, 6); r.ledge(26, 6, 6)
r.block(36, 10, 34, 1); r.lift(34, 1, 3, 1, 10)
r.gate("S", 46)
r.spikes(54, 0, 10)
r.ledge(40, 14, 6); r.ledge(50, 17, 8); r.ledge(62, 14, 6)
r.ledge(44, 21, 6); r.ledge(52, 24, 6)
roof_gate(r, 58)
r.block(70, 0, 3, 11); r.block(73, 0, 22, 3)
r.ledge(76, 7, 6); r.ledge(86, 10, 6); r.ledge(78, 14, 8)
r.gate("E", 3)
r.put("G", 52, 18)
r.enemies([("i", 12, 2), ("s", 28, 2), ("f", 20, 12), ("k", 44, 11), ("i", 60, 11),
           ("l", 80, 3), ("t", 66, 11),
           ("H", 30, 2), ("F", 50, 26), ("I", 80, 15), ("K", 88, 3), ("S", 46, 15), ("R", 70, 20)])

# Living Billboard Row: a trench of pink cocktail crossed on dance-floor
# platforms riding between billboards, with a catwalk overhead.
r = room("combat_living_billboard_row", "room.living_billboard_row", "combat", 104, 30)
r.gate("W", 0)
r.ledge(4, 5, 4)
r.pit(14, 22); r.mover(16, 2, 4, 14, 26); r.mover(28, 4, 4, 26, 36)
r.ledge(20, 8, 6)
r.block(36, 0, 14, 2); r.gate("S", 8)
r.ledge(38, 6, 4); r.ledge(46, 9, 6)
r.pit(50, 18); r.mover(52, 3, 4, 50, 60); r.mover(62, 5, 4, 60, 68)
r.ledge(56, 9, 6)
r.block(68, 0, 35, 3)
r.ledge(72, 7, 6); r.ledge(84, 9, 6)
r.block(14, 13, 70, 1)
ladder(r, 88, 9, 21, swing=-8)
r.ledge(64, 17, 6); r.ledge(52, 20, 6)
roof_gate(r, 54)
r.gate("E", 3)
r.enemies([("i", 5, 0), ("f", 22, 11), ("i", 42, 2), ("s", 47, 10), ("h", 74, 3),
           ("r", 30, 18), ("t", 60, 14),
           ("F", 56, 12), ("I", 72, 3), ("N", 86, 3), ("S", 92, 3), ("R", 40, 18), ("I", 30, 14)])

# The Velvet Pit: a tiered arena, two waves, spikes on the bottom steps.
r = room("combat_velvet_pit", "room.velvet_pit", "combat", 80, 34)
r.gate("W", 6); r.block(1, 0, 8, 6)
r.spikes(14, 0, 6); r.spikes(60, 0, 6)
r.gate("S", 36)
r.block(71, 0, 8, 6); r.gate("E", 6)
r.ledge(20, 4, 6); r.ledge(54, 4, 6)
r.ledge(9, 9, 8); r.ledge(63, 9, 8)
r.ledge(18, 12, 9); r.ledge(53, 12, 9)
r.ledge(30, 15, 20)
r.ledge(12, 18, 7); r.ledge(61, 18, 7)
r.ledge(22, 21, 8); r.ledge(50, 21, 8)
r.ledge(32, 24, 16); r.put("G", 39, 25)
roof_gate(r, 38)
r.enemies([("s", 10, 10), ("s", 66, 10), ("h", 30, 0), ("f", 40, 18), ("k", 50, 0),
           ("t", 38, 16), ("i", 24, 13),
           ("N", 20, 0), ("H", 56, 0), ("F", 14, 21), ("F", 64, 21), ("K", 42, 0),
           ("X", 40, 0), ("R", 60, 26)])

# Bottomless Food Court: everything moves. Dance-floor platforms over a lava
# floor, a lift to the balcony.
r = room("combat_bottomless_food_court", "room.bottomless_food_court", "combat", 92, 30)
r.block(1, 0, 12, 2); r.gate("W", 2)
r.pit(13, 26)
r.mover(15, 3, 5, 13, 26); r.mover(28, 5, 5, 26, 39)
r.block(39, 0, 12, 2); r.gate("S", 43)
r.pit(51, 22)
r.mover(53, 3, 5, 51, 62); r.mover(64, 5, 5, 62, 73)
r.block(73, 0, 18, 2); r.gate("E", 2)
r.ledge(18, 8, 6); r.ledge(32, 10, 6); r.ledge(56, 8, 6); r.ledge(68, 10, 6)
r.lift(40, 3, 3, 3, 14); r.ledge(44, 15, 8)
r.ledge(36, 19, 6); r.ledge(48, 22, 6)
roof_gate(r, 46)
r.ledge(80, 6, 6); r.ledge(22, 14, 6); r.ledge(62, 14, 6)
r.enemies([("f", 20, 11), ("f", 58, 11), ("s", 34, 11), ("s", 70, 11), ("r", 46, 19),
           ("t", 84, 2),
           ("F", 30, 16), ("F", 62, 16), ("I", 76, 2), ("I", 80, 2), ("X", 48, 2), ("R", 24, 18)])

# VIP Tower: climb the club tower; the bouncers hold the landings.
r = room("combat_vip_tower", "room.vip_tower", "combat", 60, 46)
r.gate("W", 0); r.gate("S", 28)
r.ledge(10, 4, 8); r.ledge(36, 4, 8); r.ledge(46, 7, 8)
r.ledge(20, 8, 10); r.ledge(4, 10, 8)
r.ledge(32, 11, 8); r.lift(52, 9, 3, 9, 18)
r.ledge(14, 14, 8); r.ledge(2, 17, 6)
r.ledge(24, 17, 10); r.ledge(40, 19, 8)
r.ledge(10, 21, 8); r.ledge(26, 23, 8); r.ledge(44, 25, 8)
r.block(48, 28, 11, 1); r.gate("E", 29)
r.ledge(34, 28, 8); r.ledge(20, 30, 8); r.ledge(8, 33, 8); r.ledge(24, 35, 8)
r.ledge(36, 34, 6)
roof_gate(r, 28)
r.put("G", 12, 22)
r.enemies([("i", 20, 0), ("i", 34, 0), ("s", 22, 9), ("f", 12, 16), ("h", 34, 12),
           ("t", 46, 26), ("x", 26, 18),
           ("S", 27, 18), ("F", 30, 32), ("N", 52, 29), ("I", 40, 29), ("R", 14, 36), ("K", 46, 0)])

# Soulpipe Crossing: a maze of fat pipes over a steam floor, crossed high or low.
r = room("combat_soulpipe_crossing", "room.soulpipe_crossing", "combat", 100, 32)
r.gate("W", 0)
r.block(10, 0, 4, 4); r.spikes(14, 0, 8); r.block(22, 0, 4, 4)
r.block(10, 8, 30, 2); r.ledge(4, 5, 5); r.ledge(26, 5, 6)
r.gate("S", 32)
r.spikes(38, 0, 10); r.block(48, 0, 4, 5)
r.block(44, 13, 28, 2); r.ledge(40, 10, 4)
r.ledge(54, 6, 6); r.block(60, 0, 4, 3); r.pit(64, 10); r.mover(65, 3, 4, 64, 74)
r.block(74, 0, 25, 3); r.gate("E", 3)
r.ledge(76, 8, 6); r.ledge(88, 11, 6); r.ledge(78, 15, 8)
r.ledge(66, 19, 8); r.ledge(52, 19, 6); r.ledge(38, 18, 6)
r.ledge(24, 14, 6); r.ledge(30, 22, 6)
roof_gate(r, 60)
r.put("G", 18, 11)
r.enemies([("i", 17, 10), ("k", 30, 10), ("s", 50, 15), ("f", 62, 22), ("l", 80, 3),
           ("t", 46, 15), ("h", 84, 3),
           ("I", 56, 15), ("F", 36, 24), ("H", 90, 3), ("L", 20, 10), ("R", 70, 26), ("X", 80, 3)])

# The Velvet Boiler: a furnace room. Lava channels, a central boiler
# block with ledges around it, vents of heat rising past the catwalks.
r = room("combat_velvet_boiler", "room.velvet_boiler", "combat", 84, 36)
r.gate("W", 0)
r.pit(8, 6); r.ledge(9, 4, 4)
r.block(14, 0, 8, 2)
r.pit(22, 6); r.ledge(23, 4, 4)
r.block(28, 0, 28, 12); r.gate("S", 62)
r.ledge(20, 9, 6); r.ledge(10, 12, 6)
r.ledge(30, 16, 8); r.ledge(46, 16, 8); r.ledge(38, 20, 8)
r.ledge(22, 15, 5); r.ledge(14, 19, 6); r.ledge(26, 23, 6)
r.ledge(58, 4, 6); r.ledge(66, 8, 6); r.ledge(58, 12, 6); r.ledge(66, 16, 6)
r.ledge(56, 20, 6); r.ledge(48, 24, 6)
r.pit(70, 6)
r.block(76, 0, 7, 2); r.gate("E", 2)
roof_gate(r, 40)
r.enemies([("i", 16, 2), ("s", 32, 12), ("s", 50, 12), ("f", 40, 26), ("h", 68, 0),
           ("t", 42, 12), ("l", 78, 2),
           ("I", 34, 17), ("I", 48, 17), ("F", 18, 22), ("N", 60, 0), ("X", 38, 12), ("R", 64, 22)])

# Club Gremlin Exchange: a split-level trading floor. The lower hall runs
# under a mezzanine; the upper hall is reached by lifts at either end.
r = room("combat_club_gremlin_exchange", "room.club_gremlin_exchange", "combat", 110, 32)
r.gate("W", 0)
r.block(12, 9, 86, 2)
r.lift(8, 1, 3, 1, 10); r.lift(99, 1, 3, 1, 10)
r.block(26, 0, 4, 2); r.spikes(30, 0, 6); r.block(36, 0, 4, 2)
r.gate("S", 50)
r.block(66, 0, 4, 2); r.spikes(70, 0, 6); r.block(76, 0, 4, 2)
r.ledge(16, 4, 6); r.ledge(44, 5, 6); r.ledge(58, 5, 6); r.ledge(86, 4, 6)
r.ledge(20, 15, 8); r.ledge(30, 18, 8); r.ledge(42, 21, 8); r.ledge(62, 21, 8); r.ledge(72, 18, 8); r.ledge(82, 15, 8)
roof_gate(r, 54)
r.gate("E", 0)
r.put("G", 66, 22)
r.enemies([("i", 20, 0), ("k", 46, 0), ("i", 60, 0), ("h", 90, 0), ("s", 30, 11), ("s", 80, 11),
           ("t", 55, 11), ("r", 40, 24),
           ("F", 24, 24), ("F", 86, 24), ("I", 50, 11), ("I", 64, 11), ("X", 54, 0), ("N", 70, 11), ("R", 74, 26)])

# --- Recovery ------------------------------------------------------------------

# Hollow Guest Lounge: a quiet room. Food on the bar, a ladder of ledges up.
r = room("recovery_hollow_guest_lounge", "room.hollow_guest_lounge", "recovery", 60, 28)
r.gate("W", 0); r.gate("E", 0); r.gate("S", 12)
r.ledge(22, 5, 12); r.ledge(8, 4, 6); r.ledge(44, 4, 6)
ladder(r, 36, 5, 19, swing=-8)
roof_gate(r, 32)
r.put("+", 26); r.put("o", 32); r.put("o", 28, 6)

# Afterhours Kitchen: a breather, with a tempting snack over spikes.
r = room("recovery_afterhours_kitchen", "room.afterhours_kitchen", "recovery", 62, 28)
r.gate("W", 0); r.gate("E", 0); r.gate("S", 44)
r.spikes(14, 0, 8); r.spikes(30, 0, 8)
r.ledge(16, 3, 4); r.ledge(32, 3, 4); r.ledge(22, 6, 8); r.put("+", 26, 7)
r.put("o", 26); r.put("$", 34, 1)
ladder(r, 14, 6, 19, swing=8)
roof_gate(r, 18)

# --- Mini-boss and boss ------------------------------------------------------

# Last Call Lounge: the Bartender's bar. Side ledges matter for the pour.
r = room("miniboss_last_call", "room.last_call_lounge", "miniboss", 64, 28, boss="bartender")
r.put("B", 32)
r.gate("W", 0); r.gate("E", 0); r.gate("S", 14)
r.ledge(6, 4, 7); r.ledge(48, 4, 8); r.ledge(24, 7, 16); r.ledge(4, 9, 6); r.ledge(54, 9, 6)
r.ledge(14, 13, 8); r.ledge(42, 13, 8); r.ledge(26, 17, 12)
roof_gate(r, 30)

# Belladonna's Maw: a banquet hall with room to run from the vortex. The
# way down to the next level opens behind her table.
r = room("boss_belladonnas_maw", "room.belladonnas_maw", "boss", 72, 30, boss="belladonna")
r.put("B", 36)
r.gate("W", 0); r.gate("E", 0); r.gate("S", 8)
r.ledge(8, 4, 8); r.ledge(56, 4, 8); r.ledge(18, 8, 9); r.ledge(45, 8, 9)
r.ledge(28, 11, 16); r.ledge(10, 12, 8); r.ledge(54, 12, 8)
r.ledge(18, 16, 8); r.ledge(46, 16, 8); r.ledge(28, 19, 16)
roof_gate(r, 34)
r.put("E", 62)

if __name__ == "__main__":
    for old in OUT.glob("*.txt"):
        old.unlink()
    sys.exit(0 if write(rooms, OUT) else 1)

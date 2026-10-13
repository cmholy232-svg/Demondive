"""Level 2, The Drowned Court. Run: python tools/rooms/drowned_court.py

Currents push Milo along the water lanes, bubble vents lift him between
tiers, and Nerissa's adoring crowd fills every gallery."""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from roomkit import Room, write

OUT = pathlib.Path(__file__).resolve().parents[2] / "data/rooms/drowned_court"
rooms = []


def room(file, *args, **kw):
    r = Room(*args, **kw)
    r.file = file
    rooms.append(r)
    return r


# Tidal Steps: a current carries Milo over the first brine channel, a vent
# lifts him to the cage on the balcony.
r = room("entry_tidal_steps", "room.tidal_steps", "entry", 88, 22)
r.put("P", 3)
r.block(10, 0, 6, 2); r.ledge(5, 4, 4)
r.pit(18, 14); r.current(18, 0, 14, 4, right=True); r.ledge(23, 5, 4)
r.block(32, 0, 10, 2); r.vent(37, 2, 2, 9); r.block(33, 10, 12, 1); r.put("G", 40, 11)
r.ledge(46, 5, 6); r.pit(52, 10); r.mover(53, 2, 4, 52, 62)
r.block(62, 0, 8, 3); r.ledge(66, 8, 6)
r.block(72, 0, 15, 2); r.put("E", 84, 2)
r.enemies([("i", 13, 2), ("f", 26, 9), ("s", 40, 2), ("i", 64, 3), ("d", 55, 10),
           ("I", 36, 2), ("F", 48, 12), ("S", 68, 9), ("N", 78, 2)])

# Sunken Promenade: a long walk against the tide; vents are the shortcuts.
r = room("entry_sunken_promenade", "room.sunken_promenade", "entry", 96, 20)
r.put("P", 3)
r.current(8, 0, 22, 3, right=False)
r.ledge(14, 5, 6); r.vent(22, 0, 2, 8); r.ledge(20, 9, 8)
r.pit(32, 8); r.ledge(33, 4, 6)
r.block(40, 0, 12, 2); r.put("G", 46, 2)
r.current(52, 0, 18, 3, right=False); r.ledge(56, 6, 6); r.vent(64, 0, 2, 8); r.ledge(62, 10, 8)
r.pit(72, 8); r.mover(73, 3, 4, 72, 80)
r.block(80, 0, 15, 2); r.put("E", 92, 2)
r.enemies([("i", 18, 0), ("d", 24, 12), ("l", 44, 2), ("i", 58, 0), ("f", 66, 13),
           ("D", 30, 12), ("N", 48, 2), ("K", 60, 0), ("S", 86, 2)])

# Adoration Gallery: tiers around a vent well; the crowd watches from the balconies.
r = room("combat_adoration_gallery", "room.adoration_gallery", "combat", 70, 26)
r.put("P", 3)
r.block(8, 0, 4, 2); r.block(58, 0, 4, 2)
r.ledge(6, 5, 7); r.ledge(57, 5, 7)
r.vent(33, 0, 3, 10); r.ledge(14, 8, 9); r.ledge(47, 8, 9)
r.ledge(28, 11, 13); r.put("G", 34, 12)
r.ledge(10, 14, 7); r.ledge(53, 14, 7)
r.ledge(25, 17, 20)
r.put("E", 66)
r.enemies([("s", 9, 6), ("s", 60, 6), ("k", 24, 0), ("f", 34, 15), ("n", 46, 0),
           ("N", 18, 9), ("N", 50, 9), ("F", 14, 17), ("F", 56, 17), ("K", 40, 0)])

# Bubble Shaft: climb a flooded well, vent to vent, to the exit at the top.
r = room("combat_bubble_shaft", "room.bubble_shaft", "combat", 46, 40)
r.put("P", 4)
r.vent(10, 0, 2, 8); r.ledge(6, 9, 8); r.ledge(20, 6, 8)
r.vent(32, 0, 2, 9); r.ledge(28, 10, 10)
r.vent(10, 10, 2, 8); r.ledge(8, 19, 10)
r.ledge(30, 17, 8); r.ledge(2, 15, 5)
r.vent(34, 18, 2, 9); r.ledge(28, 28, 12); r.put("G", 33, 29)
r.ledge(14, 25, 8); r.ledge(4, 30, 6); r.ledge(12, 31, 7)
r.block(22, 33, 22, 1); r.put("E", 41, 34)
r.enemies([("i", 22, 0), ("d", 28, 14), ("s", 24, 7), ("f", 10, 22), ("l", 15, 20),
           ("D", 36, 22), ("I", 31, 11), ("F", 30, 31), ("S", 20, 34), ("N", 38, 34)])

# Current Hall: alternating tides between chant pillars.
r = room("combat_current_hall", "room.current_hall", "combat", 94, 22)
r.put("P", 3)
r.block(10, 0, 3, 3); r.current(13, 0, 14, 4, right=True); r.block(27, 0, 3, 3)
r.ledge(16, 7, 8); r.vent(31, 0, 2, 8); r.ledge(30, 9, 8)
r.current(33, 0, 16, 4, right=False); r.block(49, 0, 3, 3)
r.ledge(38, 6, 6); r.ledge(52, 9, 6)
r.pit(56, 12); r.mover(57, 3, 4, 56, 68); r.current(56, 4, 12, 3, right=True)
r.block(68, 0, 3, 3); r.ledge(72, 6, 8); r.put("G", 75, 7)
r.block(82, 0, 11, 2); r.put("E", 90, 2)
r.enemies([("l", 11, 3), ("l", 28, 3), ("i", 20, 0), ("f", 40, 10), ("h", 44, 0),
           ("L", 50, 3), ("D", 60, 12), ("H", 76, 0), ("N", 86, 2), ("S", 34, 10)])

# Reef Maze: brine below, coral ledges above, eels everywhere.
r = room("combat_reef_maze", "room.reef_maze", "combat", 80, 24)
r.block(1, 0, 8, 1); r.put("P", 3, 1)
r.pit(9, 62)
r.mover(11, 2, 5, 9, 24); r.ledge(17, 6, 6); r.ledge(26, 4, 5)
r.vent(31, -2, 2, 12); r.ledge(29, 11, 8)
r.ledge(39, 6, 6); r.mover(46, 3, 5, 45, 58); r.ledge(50, 8, 6)
r.ledge(60, 5, 5); r.vent(65, -2, 2, 10); r.ledge(62, 12, 8); r.put("G", 65, 13)
r.block(71, 0, 8, 2); r.put("E", 76, 2)
r.enemies([("d", 20, 10), ("d", 52, 12), ("f", 33, 15), ("s", 40, 7), ("s", 61, 6),
           ("D", 26, 14), ("D", 46, 14), ("F", 66, 16), ("I", 73, 2), ("N", 75, 2)])

# Recovery: a grotto with a vent up to the snacks.
r = room("recovery_moon_grotto", "room.moon_grotto", "recovery", 46, 18)
r.put("P", 3); r.vent(14, 0, 2, 8); r.ledge(12, 9, 8); r.put("+", 15, 10)
r.ledge(26, 5, 6); r.put("o", 28, 6); r.put("o", 36); r.put("E", 42)

r = room("recovery_shell_lounge", "room.shell_lounge", "recovery", 50, 16)
r.put("P", 3); r.pit(14, 8); r.ledge(16, 4, 4); r.put("$", 17, 5)
r.current(24, 0, 10, 3, right=True); r.put("+", 30); r.put("o", 38); r.put("E", 46)

# The Adoration Pit: the Fan Club's floor, with vents in both corners.
r = room("miniboss_adoration_pit", "room.adoration_pit", "miniboss", 48, 20, boss="fan_club")
r.put("P", 4); r.put("B", 30)
r.vent(2, 0, 2, 9); r.vent(44, 0, 2, 9)
r.ledge(1, 10, 6); r.ledge(41, 10, 6); r.ledge(12, 5, 7); r.ledge(29, 5, 7); r.ledge(19, 9, 10)
r.put("E", 46)

# Nerissa's Grand Stage: a flooded theatre. Tides sweep the pit; vents carry
# Milo up the wings when the rain of song falls.
r = room("boss_grand_stage", "room.grand_stage", "boss", 56, 22, boss="nerissa")
r.put("P", 4); r.put("B", 30)
r.vent(2, 0, 2, 11); r.vent(52, 0, 2, 11)
r.current(10, 0, 14, 2, right=True); r.current(32, 0, 14, 2, right=False)
r.ledge(1, 12, 6); r.ledge(49, 12, 6); r.ledge(10, 6, 7); r.ledge(39, 6, 7)
r.ledge(22, 9, 12); r.ledge(14, 13, 6); r.ledge(36, 13, 6)
r.put("E", 54)

if __name__ == "__main__":
    for old in OUT.glob("*.txt"):
        old.unlink()
    sys.exit(0 if write(rooms, OUT) else 1)

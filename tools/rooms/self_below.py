"""Level 9, The Self Below. Run: python tools/rooms/self_below.py

The bottom of Hell is Milo's own head: rooms rebuilt from every level he
crossed, emptied out and gone grey. The lords return one after another,
and at the very bottom the Hollow waits wearing his face."""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from roomkit import Room, write

OUT = pathlib.Path(__file__).resolve().parents[2] / "data/rooms/self_below"
rooms = []


def room(file, *args, **kw):
    r = Room(*args, **kw)
    r.file = file
    rooms.append(r)
    return r


# Faded Club: the Neon Maw again, with the lights going out.
r = room("entry_faded_club", "room.faded_club", "entry", 92, 22)
r.put("P", 3)
r.block(10, 0, 4, 2); r.ledge(14, 5, 6); r.pit(22, 8); r.mover(23, 3, 4, 22, 30)
r.block(30, 0, 6, 3); r.ledge(34, 8, 8); r.put("G", 37, 9)
r.current(36, 0, 12, 3, right=True); r.vent(50, 0, 2, 9); r.ledge(46, 10, 10)
r.block(56, 0, 4, 3); r.rail(60, 0, 10); r.ledge(62, 6, 6)
r.ice(70, 0, 10, 1); r.block(80, 0, 11, 2); r.put("E", 88, 2)
r.enemies([("i", 18, 0), ("f", 28, 11), ("s", 32, 3), ("h", 64, 0), ("d", 44, 12),
           ("I", 40, 0), ("L", 58, 3), ("K", 74, 1), ("N", 84, 2), ("D", 66, 10)])

# Memory Lane: doors to the last places Milo stood.
r = room("entry_memory_lane", "room.memory_lane", "entry", 98, 22)
r.put("P", 3)
r.block(10, 0, 3, 2); r.ledge(14, 5, 6); r.portals((20, 0), (52, 0))
r.block(24, 0, 4, 4); r.mirror(30, 0, 4); r.ledge(32, 6, 6); r.put("G", 34, 7)
r.cover(40, 0, 6); r.icicles(44, 9, 4); r.block(42, 10, 8, 1)
r.block(54, 0, 6, 2); r.corruption(62, 8); r.ledge(62, 5, 8)
r.pit(72, 10); r.mover(73, 3, 4, 72, 82)
r.block(82, 0, 15, 2); r.put("E", 94, 2)
r.enemies([("i", 16, 6), ("s", 26, 4), ("l", 38, 0), ("d", 34, 11), ("f", 58, 10),
           ("I", 56, 2), ("H", 88, 2), ("N", 66, 0), ("S", 64, 6), ("K", 48, 0)])

# Grey Ballroom: a big empty floor; the crowd is gone and only echoes fight.
r = room("combat_grey_ballroom", "room.grey_ballroom", "combat", 76, 26)
r.put("P", 3)
r.block(8, 0, 4, 2); r.block(64, 0, 4, 2)
r.ledge(6, 5, 8); r.ledge(62, 5, 8); r.ledge(18, 6, 10); r.ledge(48, 6, 10)
r.ledge(31, 10, 14); r.put("G", 37, 11); r.mirror(30, 0, 4); r.mirror(45, 0, 4)
r.ledge(12, 12, 8); r.ledge(56, 12, 8); r.ledge(25, 16, 8); r.ledge(43, 16, 8)
r.put("E", 72)
r.enemies([("f", 22, 9), ("f", 52, 9), ("s", 9, 6), ("s", 65, 6), ("h", 36, 0),
           ("F", 38, 14), ("S", 28, 17), ("S", 46, 17), ("K", 20, 0), ("N", 56, 0)])

# Falling Thoughts: a long climb down... upward. Milo rises to wake.
r = room("combat_falling_thoughts", "room.falling_thoughts", "combat", 46, 40)
r.put("P", 4)
r.vent(10, 0, 2, 8); r.ledge(6, 9, 8); r.ledge(20, 6, 8)
r.vent(32, 0, 2, 9); r.ledge(28, 10, 10)
r.ledge(4, 14, 8); r.ledge(20, 14, 8); r.ice(34, 14, 8, 1)
r.ledge(12, 19, 8); r.ledge(28, 19, 8); r.put("G", 30, 20)
r.ledge(4, 23, 7); r.ledge(36, 23, 7)
r.ledge(6, 28, 8); r.ledge(32, 28, 8)
r.block(18, 31, 26, 1); r.put("E", 41, 32)
r.enemies([("s", 36, 6), ("f", 20, 17), ("i", 24, 7), ("d", 30, 13), ("l", 7, 15),
           ("S", 14, 21), ("L", 37, 16), ("F", 22, 27), ("N", 26, 32), ("D", 34, 30)])

# Undertow: everything Milo crossed, at once.
r = room("combat_undertow", "room.undertow", "combat", 96, 22)
r.put("P", 3)
r.current(8, 0, 14, 3, right=True); r.block(22, 0, 3, 3)
r.rail(25, 0, 10); r.ledge(26, 6, 8); r.block(35, 0, 3, 3)
r.ice(38, 0, 12, 1); r.block(40, 8, 10, 1); r.icicles(42, 7, 6)
r.vent(52, 0, 2, 9); r.ledge(48, 10, 10); r.put("G", 52, 11)
r.cover(58, 0, 6); r.portals((66, 0), (84, 0)); r.block(68, 0, 10, 5); r.ledge(70, 9, 6)
r.block(86, 0, 9, 2); r.put("E", 92, 2)
r.enemies([("i", 14, 0), ("s", 23, 3), ("l", 36, 3), ("h", 44, 1), ("d", 30, 10),
           ("F", 54, 14), ("N", 60, 0), ("S", 72, 5), ("K", 80, 0), ("D", 88, 10)])

# Empty Stands: the arena, after; drops and movers across the void.
r = room("combat_empty_stands", "room.empty_stands", "combat", 80, 22)
r.block(1, 0, 8, 1); r.put("P", 3, 1)
r.pit(9, 62, lava=False)
r.ledge(11, 3, 6); r.mover(19, 4, 4, 18, 28); r.ledge(29, 5, 6); r.mirror(33, 6, 3)
r.ledge(37, 8, 8); r.put("G", 40, 9); r.mover(46, 4, 4, 45, 55); r.ledge(56, 5, 6)
r.ledge(63, 3, 6); r.block(71, 0, 8, 2); r.put("E", 76, 2)
r.ledge(26, 12, 8); r.ledge(48, 12, 8)
r.enemies([("d", 22, 10), ("d", 52, 11), ("s", 30, 6), ("s", 64, 4), ("f", 40, 13),
           ("D", 34, 15), ("S", 57, 6), ("F", 48, 15), ("I", 74, 2), ("N", 72, 2)])

# Recovery: Milo's old bedroom, and the dream of the surface.
r = room("recovery_old_bedroom", "room.old_bedroom", "recovery", 46, 16)
r.put("P", 3); r.block(14, 0, 6, 2); r.put("+", 16, 2); r.ledge(24, 5, 6); r.put("o", 26, 6)
r.put("o", 34); r.put("E", 42)

r = room("recovery_surface_dream", "room.surface_dream", "recovery", 50, 16)
r.put("P", 3); r.pit(14, 8); r.ledge(16, 4, 4); r.put("$", 17, 5)
r.put("+", 30); r.put("o", 38); r.put("E", 46)

# The Hall of Lords: a wide arena for the rush. Every lord returns here.
r = room("miniboss_hall_of_lords", "room.hall_of_lords", "miniboss", 60, 24, boss="rush")
r.put("P", 4); r.put("B", 36)
r.ledge(2, 6, 7); r.ledge(51, 6, 7); r.ledge(12, 8, 8); r.ledge(40, 8, 8)
r.ledge(23, 11, 14); r.ledge(6, 13, 7); r.ledge(47, 13, 7); r.ledge(19, 16, 6); r.ledge(35, 16, 6)
r.put("E", 58)

# The Self Below: a mirror-floored void. The Hollow takes Milo's boons.
r = room("boss_self_below", "room.self_below", "boss", 62, 26, boss="hollow")
r.put("P", 4); r.put("B", 36)
r.ledge(2, 6, 7); r.ledge(53, 6, 7); r.ledge(12, 8, 8); r.ledge(42, 8, 8)
r.ledge(24, 11, 14); r.ledge(6, 13, 7); r.ledge(49, 13, 7); r.ledge(19, 16, 6); r.ledge(37, 16, 6)
r.ledge(27, 19, 8)
r.put("E", 60)

if __name__ == "__main__":
    for old in OUT.glob("*.txt"):
        old.unlink()
    sys.exit(0 if write(rooms, OUT) else 1)

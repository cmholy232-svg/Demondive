"""Level 3, The Thornwild. Run: python tools/rooms/thornwild.py

Thorn thickets swallow enemy shots and hide waiting hunters; ambush lanes
run under the canopy, and the best routes climb."""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from roomkit import Room, write

OUT = pathlib.Path(__file__).resolve().parents[2] / "data/rooms/thornwild"
rooms = []


def room(file, *args, **kw):
    r = Room(*args, **kw)
    r.file = file
    rooms.append(r)
    return r


# Bramble Gate: thickets to hide in on the way down the trail.
r = room("entry_bramble_gate", "room.bramble_gate", "entry", 90, 22)
r.put("P", 3)
r.cover(9, 0, 5); r.block(16, 0, 6, 2); r.ledge(13, 5, 5)
r.cover(24, 0, 6); r.spikes(31, 0, 5); r.block(36, 0, 8, 3); r.cover(38, 3, 4)
r.ledge(30, 6, 6); r.ledge(44, 8, 6); r.put("G", 46, 9)
r.cover(48, 0, 6); r.block(56, 0, 6, 2); r.pit(62, 8); r.ledge(63, 4, 5)
r.cover(72, 0, 5); r.block(78, 0, 11, 2); r.put("E", 86, 2)
r.enemies([("i", 11, 0), ("s", 19, 2), ("i", 26, 0), ("l", 40, 3), ("n", 50, 0),
           ("I", 33, 7), ("H", 58, 2), ("D", 66, 10), ("N", 74, 0), ("S", 82, 2)])

# Hunter's Trail: a long ambush lane under a ledge canopy.
r = room("entry_hunters_trail", "room.hunters_trail", "entry", 98, 20)
r.put("P", 3)
r.block(10, 6, 24, 1); r.cover(12, 0, 4); r.cover(22, 0, 4); r.cover(30, 0, 3)
r.ledge(4, 4, 5); r.ledge(14, 10, 8); r.put("G", 18, 11)
r.pit(36, 6); r.ledge(37, 4, 4)
r.block(44, 0, 6, 2); r.block(54, 6, 26, 1); r.cover(56, 0, 5); r.cover(66, 0, 5); r.cover(74, 0, 4)
r.ledge(48, 4, 5); r.ledge(60, 10, 8)
r.block(84, 0, 13, 2); r.put("E", 94, 2)
r.enemies([("i", 13, 0), ("n", 23, 0), ("s", 18, 7), ("h", 46, 2), ("i", 57, 0),
           ("I", 31, 0), ("N", 67, 0), ("S", 64, 11), ("K", 75, 0), ("D", 88, 6)])

# Canopy Climb: chase the exit up through the trees.
r = room("combat_canopy_climb", "room.canopy_climb", "combat", 52, 40)
r.put("P", 4)
r.cover(10, 0, 6); r.ledge(18, 4, 8); r.ledge(32, 5, 8); r.ledge(42, 9, 6)
r.ledge(26, 9, 8); r.cover(27, 10, 4); r.ledge(12, 8, 7)
r.ledge(4, 12, 6); r.ledge(16, 14, 10); r.cover(18, 15, 5)
r.ledge(34, 15, 8); r.ledge(44, 19, 6); r.ledge(28, 20, 8)
r.ledge(18, 22, 8); r.put("G", 21, 23); r.ledge(9, 25, 6)
r.ledge(20, 28, 10); r.cover(22, 29, 5); r.ledge(36, 27, 8)
r.block(26, 32, 25, 1); r.put("E", 48, 33)
r.enemies([("i", 22, 0), ("s", 36, 6), ("n", 13, 9), ("l", 30, 10), ("d", 24, 18),
           ("I", 19, 15), ("S", 38, 16), ("L", 31, 21), ("D", 10, 24), ("N", 40, 33)])

# Root Hollow: a sunken clearing ringed by thorns; boars charge across it.
r = room("combat_root_hollow", "room.root_hollow", "combat", 72, 24)
r.put("P", 3)
r.block(8, 0, 6, 3); r.cover(9, 3, 4); r.block(58, 0, 6, 3); r.cover(59, 3, 4)
r.spikes(15, 0, 3); r.spikes(54, 0, 3)
r.ledge(16, 6, 8); r.ledge(48, 6, 8); r.ledge(28, 9, 16); r.cover(31, 10, 10)
r.ledge(10, 12, 6); r.ledge(56, 12, 6); r.ledge(26, 15, 20); r.put("G", 35, 16)
r.put("E", 68)
r.enemies([("h", 30, 0), ("h", 42, 0), ("s", 10, 3), ("s", 60, 3), ("l", 36, 10),
           ("K", 36, 0), ("H", 20, 7), ("D", 34, 19), ("N", 50, 7), ("I", 66, 0)])

# Spore Terraces: steps of thickets; spore maws lob from behind cover.
r = room("combat_spore_terraces", "room.spore_terraces", "combat", 84, 26)
r.put("P", 3)
r.stairs(10, 6, 4)
r.cover(12, 1, 3); r.cover(18, 2, 3); r.cover(24, 3, 3)
r.ledge(30, 7, 8); r.cover(31, 8, 5); r.pit(34, 10); r.mover(35, 2, 4, 34, 44)
r.block(44, 0, 8, 4); r.cover(46, 4, 4); r.ledge(40, 11, 8); r.put("G", 43, 12)
r.stairs(70, 5, 3, up=False); r.cover(56, 0, 5)
r.block(70, 0, 13, 2); r.put("E", 80, 2)
r.enemies([("l", 19, 3), ("l", 47, 4), ("i", 28, 4), ("n", 57, 0), ("d", 40, 15),
           ("L", 25, 4), ("S", 33, 8), ("H", 62, 1), ("I", 74, 2), ("D", 60, 10)])

# Vine Gallows: hanging ledges over a thorn pit.
r = room("combat_vine_gallows", "room.vine_gallows", "combat", 78, 24)
r.block(1, 0, 8, 1); r.put("P", 3, 1)
r.pit(9, 60, lava=False)
r.ledge(11, 4, 5); r.ledge(19, 7, 5); r.ledge(27, 4, 5); r.ledge(34, 9, 6); r.cover(35, 10, 4)
r.ledge(42, 5, 5); r.mover(49, 3, 4, 48, 58); r.ledge(52, 9, 5); r.ledge(60, 6, 5)
r.ledge(26, 13, 8); r.put("G", 29, 14)
r.block(69, 0, 8, 2); r.put("E", 74, 2)
r.enemies([("d", 20, 11), ("d", 50, 13), ("s", 28, 5), ("n", 36, 10), ("s", 61, 7),
           ("D", 30, 16), ("F", 44, 14), ("I", 72, 2), ("N", 70, 2), ("L", 42, 6)])

# Recovery
r = room("recovery_mossy_den", "room.mossy_den", "recovery", 46, 16)
r.put("P", 3); r.cover(12, 0, 6); r.ledge(20, 5, 8); r.put("+", 23, 6); r.put("o", 32); r.put("E", 42)

r = room("recovery_honey_hollow", "room.honey_hollow", "recovery", 50, 16)
r.put("P", 3); r.spikes(14, 0, 8); r.ledge(16, 3, 4); r.put("$", 17, 4); r.ledge(26, 6, 6)
r.put("+", 28, 7); r.put("o", 38); r.put("E", 46)

# The Cornered Glade: Perfect Prey's clearing, cover on both flanks.
r = room("miniboss_cornered_glade", "room.cornered_glade", "miniboss", 52, 20, boss="perfect_prey")
r.put("P", 4); r.put("B", 34)
r.cover(8, 0, 4); r.cover(40, 0, 4)
r.ledge(5, 5, 7); r.ledge(40, 5, 7); r.ledge(17, 8, 18); r.cover(22, 9, 8)
r.ledge(3, 11, 5); r.ledge(44, 11, 5)
r.put("E", 50)

# Roxyne's Killing Canopy: a tall arena; the hunter owns the high ground.
r = room("boss_killing_canopy", "room.killing_canopy", "boss", 58, 26, boss="roxyne")
r.put("P", 4); r.put("B", 32)
r.cover(10, 0, 5); r.cover(43, 0, 5)
r.ledge(4, 5, 7); r.ledge(47, 5, 7); r.ledge(15, 8, 8); r.ledge(35, 8, 8)
r.ledge(23, 12, 12); r.cover(26, 13, 6); r.ledge(6, 14, 7); r.ledge(45, 14, 7)
r.ledge(18, 17, 6); r.ledge(34, 17, 6)
r.put("E", 56)

if __name__ == "__main__":
    for old in OUT.glob("*.txt"):
        old.unlink()
    sys.exit(0 if write(rooms, OUT) else 1)

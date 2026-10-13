"""Level 5, The Frozen Basilica. Run: python tools/rooms/frozen_basilica.py

A cathedral of ice. Frozen floors keep Milo sliding, icicles shiver and
drop when he passes under, and reliquaries hang over every nave."""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from roomkit import Room, write

OUT = pathlib.Path(__file__).resolve().parents[2] / "data/rooms/frozen_basilica"
rooms = []


def room(file, *args, **kw):
    r = Room(*args, **kw)
    r.file = file
    rooms.append(r)
    return r


def vault(r, x, y, w, drops):
    """A ceiling slab at height y with icicles hanging from the given columns."""
    r.block(x, y, w, 1)
    for d in drops:
        r.set(x + d, y - 1, "Y")


# Frost Narthex: the first ice floor under a row of icicles.
r = room("entry_frost_narthex", "room.frost_narthex", "entry", 88, 22)
r.put("P", 3)
r.ice(10, 0, 22, 1); vault(r, 12, 7, 18, (2, 7, 12, 16))
r.ledge(14, 4, 5); r.ledge(24, 4, 5)
r.pit(33, 8); r.mover(34, 3, 4, 33, 41)
r.block(41, 0, 9, 2); r.ledge(44, 7, 6); r.put("G", 47, 8)
r.ice(50, 0, 18, 2); vault(r, 52, 9, 14, (3, 8, 12))
r.ledge(56, 5, 6); r.block(68, 0, 4, 4)
r.block(72, 0, 15, 2); r.put("E", 84, 2)
r.enemies([("i", 18, 1), ("f", 26, 11), ("s", 44, 2), ("h", 60, 2), ("d", 36, 9),
           ("I", 28, 1), ("L", 46, 8), ("K", 62, 2), ("N", 78, 2), ("D", 58, 12)])

# Pilgrim Stair: a long glacier staircase down the nave.
r = room("entry_pilgrim_stair", "room.pilgrim_stair", "entry", 96, 24)
r.block(1, 0, 14, 8); r.put("P", 4, 8)
r.ice(15, 0, 8, 6); r.ice(23, 0, 8, 4); r.ice(31, 0, 8, 2)
r.ledge(18, 10, 6); r.ledge(30, 8, 6)
vault(r, 26, 15, 16, (3, 9, 14))
r.block(42, 0, 6, 2); r.put("G", 45, 2)
r.pit(48, 10); r.mover(49, 3, 4, 48, 58); r.ledge(52, 8, 4)
r.ice(58, 0, 20, 2); vault(r, 60, 9, 16, (2, 6, 10, 14))
r.ledge(62, 5, 5); r.ledge(71, 5, 5)
r.block(78, 0, 17, 2); r.put("E", 92, 2)
r.enemies([("i", 20, 6), ("l", 34, 2), ("f", 30, 12), ("s", 44, 2), ("d", 53, 12),
           ("H", 64, 2), ("I", 70, 2), ("S", 46, 2), ("N", 86, 2), ("D", 30, 12)])

# Choir Loft: tiers of frozen pews; the choir shards sing from above.
r = room("combat_choir_loft", "room.choir_loft", "combat", 74, 26)
r.put("P", 3)
r.ice(8, 0, 58, 1)
r.ledge(6, 5, 8); r.ledge(60, 5, 8); r.ledge(18, 6, 10); r.ledge(46, 6, 10)
r.ledge(30, 10, 14); r.put("G", 36, 11)
r.ledge(12, 12, 8); r.ledge(54, 12, 8); r.ledge(24, 16, 8); r.ledge(42, 16, 8)
vault(r, 26, 22, 22, (2, 7, 11, 15, 20))
r.put("E", 70)
r.enemies([("f", 22, 9), ("f", 50, 9), ("s", 9, 6), ("s", 63, 6), ("h", 36, 1),
           ("F", 36, 14), ("S", 27, 17), ("S", 45, 17), ("K", 20, 1), ("N", 54, 1)])

# Reliquary Well: climb an ice shaft; relics hang from every landing.
r = room("combat_reliquary_well", "room.reliquary_well", "combat", 46, 40)
r.put("P", 4)
r.ledge(8, 4, 8); r.ice(22, 4, 8, 1); r.ledge(34, 5, 8)
r.ledge(14, 9, 8); r.ledge(28, 10, 8)
r.ice(4, 13, 8, 1); r.ledge(20, 14, 8); r.ice(34, 14, 8, 1)
r.ledge(12, 19, 8); r.ledge(28, 19, 8)
vault(r, 14, 25, 18, (2, 8, 14)); r.put("G", 22, 20)
r.ledge(4, 23, 7); r.ledge(36, 23, 7)
r.ledge(6, 28, 8); r.ledge(32, 28, 8)
r.block(18, 31, 26, 1); r.put("E", 41, 32)
r.enemies([("i", 24, 6), ("f", 20, 17), ("s", 37, 6), ("d", 30, 13), ("l", 7, 15),
           ("D", 16, 22), ("L", 37, 16), ("F", 22, 27), ("I", 26, 32), ("S", 34, 32)])

# Glacier Nave: one long frozen floor and a vault full of teeth.
r = room("combat_glacier_nave", "room.glacier_nave", "combat", 92, 22)
r.put("P", 3)
r.ice(8, 0, 76, 1); vault(r, 10, 8, 72, tuple(range(3, 72, 6)))
r.block(20, 1, 3, 2); r.block(46, 1, 3, 2); r.block(70, 1, 3, 2)
r.ledge(26, 5, 6); r.ledge(52, 5, 6); r.ledge(36, 4, 6); r.put("G", 38, 5)
r.ledge(14, 12, 10); r.ledge(40, 12, 12); r.ledge(66, 12, 10)
r.put("E", 88)
r.enemies([("h", 30, 1), ("h", 60, 1), ("i", 16, 1), ("f", 44, 15), ("l", 47, 3),
           ("H", 40, 1), ("S", 70, 13), ("S", 18, 13), ("K", 56, 1), ("N", 78, 1)])

# Penitent Crypt: low tombs over a pit of frozen spikes.
r = room("combat_penitent_crypt", "room.penitent_crypt", "combat", 80, 22)
r.block(1, 0, 8, 1); r.put("P", 3, 1)
r.pit(9, 62, lava=False)
r.ice(11, 3, 6, 1); r.ledge(20, 5, 5); r.mover(27, 4, 4, 25, 36); r.ice(37, 3, 6, 1)
r.ledge(39, 8, 6); vault(r, 34, 14, 14, (3, 7, 11)); r.put("G", 41, 9)
r.ledge(46, 5, 5); r.mover(52, 4, 4, 51, 62); r.ice(63, 3, 6, 1)
r.block(71, 0, 8, 2); r.put("E", 76, 2)
r.enemies([("d", 22, 10), ("d", 56, 11), ("f", 38, 12), ("s", 13, 4), ("s", 64, 4),
           ("D", 30, 11), ("F", 48, 11), ("I", 74, 2), ("N", 72, 2), ("S", 40, 4)])

# Recovery: a warm side chapel and a bell tower.
r = room("recovery_candle_chapel", "room.candle_chapel", "recovery", 46, 16)
r.put("P", 3); r.block(14, 0, 6, 2); r.put("+", 16, 2); r.ledge(24, 5, 6); r.put("o", 26, 6)
r.put("o", 34); r.put("E", 42)

r = room("recovery_bell_tower", "room.bell_tower", "recovery", 50, 18)
r.put("P", 3); r.ice(10, 0, 14, 1); r.ledge(14, 5, 6); r.put("$", 16, 6)
vault(r, 12, 10, 10, (2, 6)); r.put("+", 30); r.put("o", 40); r.put("E", 46)

# Memory Golem's Ossuary: an ice floor and a ring of hanging relics.
r = room("miniboss_ossuary", "room.ossuary", "miniboss", 52, 22, boss="memory_golem")
r.put("P", 4); r.put("B", 34)
r.ice(8, 0, 36, 1)
r.ledge(3, 6, 6); r.ledge(43, 6, 6); r.ledge(14, 8, 7); r.ledge(31, 8, 7); r.ledge(21, 12, 10)
vault(r, 12, 18, 28, (3, 9, 15, 21, 26))
r.put("E", 50)

# Isolde's Glass Altar: a frozen sanctuary; her slide becomes Milo's too.
r = room("boss_glass_altar", "room.glass_altar", "boss", 60, 26, boss="isolde")
r.put("P", 4); r.put("B", 34)
r.ice(8, 0, 44, 1)
r.ledge(2, 6, 7); r.ledge(51, 6, 7); r.ledge(12, 8, 8); r.ledge(40, 8, 8)
r.ledge(23, 11, 14); r.ledge(6, 13, 7); r.ledge(47, 13, 7); r.ledge(18, 16, 6); r.ledge(36, 16, 6)
vault(r, 14, 21, 32, (3, 10, 16, 22, 29))
r.put("E", 58)

if __name__ == "__main__":
    for old in OUT.glob("*.txt"):
        old.unlink()
    sys.exit(0 if write(rooms, OUT) else 1)

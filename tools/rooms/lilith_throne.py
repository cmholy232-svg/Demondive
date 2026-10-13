"""Level 8, Lilith's Throne. Run: python tools/rooms/lilith_throne.py

The queen's palace remixes everything Milo has crossed: tides, vents, rails,
ice, doors and mirrors. Corruption pools pay power for health: stand in one
and hits land harder while it drains Milo."""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from roomkit import Room, write

OUT = pathlib.Path(__file__).resolve().parents[2] / "data/rooms/lilith_throne"
rooms = []


def room(file, *args, **kw):
    r = Room(*args, **kw)
    r.file = file
    rooms.append(r)
    return r


# Blood Gate: the first corruption pool, with a vent past it.
r = room("entry_blood_gate", "room.blood_gate", "entry", 92, 22)
r.put("P", 3)
r.block(10, 0, 4, 2); r.corruption(16, 8); r.ledge(16, 5, 8)
r.block(26, 0, 6, 2); r.vent(34, 0, 2, 9); r.ledge(30, 10, 10); r.put("G", 34, 11)
r.pit(42, 10); r.mover(43, 3, 4, 42, 52)
r.block(52, 0, 6, 2); r.rail(58, 0, 12); r.ledge(60, 5, 8)
r.corruption(72, 6); r.block(80, 0, 11, 2); r.put("E", 88, 2)
r.enemies([("i", 20, 6), ("f", 30, 13), ("s", 28, 2), ("h", 64, 0), ("d", 46, 9),
           ("I", 54, 2), ("L", 38, 11), ("K", 74, 0), ("N", 84, 2), ("D", 62, 10)])

# Procession: a long red carpet under the court's banners.
r = room("entry_procession", "room.procession", "entry", 98, 22)
r.put("P", 3)
r.current(8, 0, 18, 3, right=True); r.ledge(12, 6, 6)
r.block(26, 0, 4, 3); r.ice(30, 0, 14, 1); r.ledge(32, 6, 8)
r.corruption(46, 8); r.ledge(46, 5, 8); r.put("G", 49, 6)
r.portals((56, 0), (74, 0)); r.block(58, 0, 8, 4); r.mirror(68, 0, 4)
r.pit(78, 8); r.mover(79, 3, 4, 78, 86)
r.block(86, 0, 11, 2); r.put("E", 94, 2)
r.enemies([("i", 16, 0), ("s", 28, 3), ("l", 40, 1), ("d", 36, 10), ("f", 52, 9),
           ("H", 64, 4), ("S", 72, 0), ("N", 90, 2), ("K", 34, 1), ("D", 82, 9)])

# Court of Decrees: tiers over a basin of corruption.
r = room("combat_court_of_decrees", "room.court_of_decrees", "combat", 74, 26)
r.put("P", 3)
r.corruption(22, 12); r.corruption(40, 12)
r.block(8, 0, 4, 2); r.block(62, 0, 4, 2)
r.ledge(6, 5, 8); r.ledge(60, 5, 8); r.ledge(18, 6, 10); r.ledge(46, 6, 10)
r.vent(36, 0, 2, 9); r.ledge(30, 10, 14); r.put("G", 34, 11)
r.ledge(12, 12, 8); r.ledge(54, 12, 8); r.ledge(24, 16, 8); r.ledge(42, 16, 8)
r.put("E", 70)
r.enemies([("f", 22, 9), ("f", 50, 9), ("s", 9, 6), ("s", 63, 6), ("h", 30, 0),
           ("F", 36, 14), ("S", 27, 17), ("S", 45, 17), ("K", 20, 0), ("N", 54, 0)])

# Crimson Spire: climb past rails and mirrors to the throne gallery.
r = room("combat_crimson_spire", "room.crimson_spire", "combat", 46, 40)
r.put("P", 4)
r.corruption(16, 14)
r.ledge(8, 4, 8); r.ledge(22, 5, 8); r.ledge(34, 4, 8)
r.ledge(14, 9, 8); r.rail(16, 10, 4); r.ledge(28, 10, 8)
r.ledge(4, 13, 8); r.ledge(20, 14, 8); r.ice(34, 14, 8, 1); r.mirror(32, 15, 3)
r.ledge(12, 19, 8); r.ledge(28, 19, 8); r.put("G", 30, 20)
r.ledge(4, 23, 7); r.ledge(36, 23, 7)
r.ledge(6, 28, 8); r.ledge(32, 28, 8)
r.block(18, 31, 26, 1); r.put("E", 41, 32)
r.enemies([("s", 36, 6), ("f", 20, 17), ("i", 24, 6), ("d", 30, 13), ("l", 7, 15),
           ("S", 14, 21), ("L", 37, 16), ("F", 22, 27), ("N", 26, 32), ("D", 34, 30)])

# Throne Gauntlet: every trick in the palace, end to end.
r = room("combat_throne_gauntlet", "room.throne_gauntlet", "combat", 96, 22)
r.put("P", 3)
r.rail(8, 0, 10); r.block(18, 0, 4, 3); r.ledge(10, 5, 6)
r.current(22, 0, 12, 3, right=True); r.block(34, 0, 3, 3)
r.ice(37, 0, 12, 1); r.vent(50, 0, 2, 9); r.ledge(46, 10, 10); r.put("G", 50, 11)
r.corruption(54, 8); r.mirror(62, 0, 4)
r.portals((64, 0), (82, 0)); r.block(66, 0, 10, 5); r.ledge(68, 9, 6)
r.block(84, 0, 11, 2); r.put("E", 92, 2)
r.enemies([("i", 14, 0), ("s", 19, 3), ("l", 35, 3), ("h", 42, 1), ("d", 30, 10),
           ("F", 52, 14), ("N", 58, 0), ("S", 70, 5), ("K", 78, 0), ("D", 88, 10)])

# Bloodmoon Balcony: a drop to the moat; movers and pools across.
r = room("combat_bloodmoon_balcony", "room.bloodmoon_balcony", "combat", 80, 22)
r.block(1, 0, 8, 1); r.put("P", 3, 1)
r.pit(9, 62)
r.ledge(11, 3, 6); r.mover(19, 4, 4, 18, 28); r.ledge(29, 5, 6)
r.ledge(37, 8, 8); r.put("G", 40, 9); r.mover(46, 4, 4, 45, 55); r.ledge(56, 5, 6)
r.ledge(63, 3, 6); r.block(71, 0, 8, 2); r.put("E", 76, 2)
r.ledge(26, 12, 8); r.ledge(48, 12, 8)
r.enemies([("d", 22, 10), ("d", 52, 11), ("s", 30, 6), ("s", 64, 4), ("f", 40, 13),
           ("D", 34, 15), ("S", 57, 6), ("F", 48, 15), ("I", 74, 2), ("N", 72, 2)])

# Recovery: a rose garden and the queen's wine cellar.
r = room("recovery_rose_garden", "room.rose_garden", "recovery", 46, 16)
r.put("P", 3); r.block(14, 0, 6, 2); r.put("+", 16, 2); r.ledge(24, 5, 6); r.put("o", 26, 6)
r.put("o", 34); r.put("E", 42)

r = room("recovery_wine_cellar", "room.wine_cellar", "recovery", 50, 16)
r.put("P", 3); r.corruption(14, 6); r.ledge(14, 4, 6); r.put("$", 16, 5)
r.put("+", 30); r.put("o", 38); r.put("E", 46)

# The Daughters' Antechamber: three sisters, a pool between them.
r = room("miniboss_antechamber", "room.antechamber", "miniboss", 52, 20, boss="lilith_daughters")
r.put("P", 4); r.put("B", 34)
r.corruption(22, 8)
r.ledge(3, 5, 6); r.ledge(43, 5, 6); r.ledge(14, 7, 7); r.ledge(31, 7, 7); r.ledge(21, 11, 10)
r.put("E", 50)

# Lilith's Throne: the queen's hall. Pools at her feet tempt every swing.
r = room("boss_lilith_throne", "room.lilith_throne", "boss", 62, 26, boss="lilith")
r.put("P", 4); r.put("B", 36)
r.corruption(12, 6); r.corruption(44, 6)
r.ledge(2, 6, 7); r.ledge(53, 6, 7); r.ledge(12, 8, 8); r.ledge(42, 8, 8)
r.ledge(24, 11, 14); r.ledge(6, 13, 7); r.ledge(49, 13, 7); r.ledge(19, 16, 6); r.ledge(37, 16, 6)
r.ledge(27, 19, 8)
r.put("E", 60)

if __name__ == "__main__":
    for old in OUT.glob("*.txt"):
        old.unlink()
    sys.exit(0 if write(rooms, OUT) else 1)

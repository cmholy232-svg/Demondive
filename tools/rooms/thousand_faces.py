"""Level 7, The City of a Thousand Faces. Run: python tools/rooms/thousand_faces.py

A palace of mirrors and masks. Mirror panes flip every shot that hits them,
Milo's and the enemy's, so a good angle wins a fight before it starts."""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from roomkit import Room, write

OUT = pathlib.Path(__file__).resolve().parents[2] / "data/rooms/thousand_faces"
rooms = []


def room(file, *args, **kw):
    r = Room(*args, **kw)
    r.file = file
    rooms.append(r)
    return r


# Mask Foyer: the first panes, set where snipers like to stand.
r = room("entry_mask_foyer", "room.mask_foyer", "entry", 90, 22)
r.put("P", 3)
r.block(10, 0, 4, 2); r.ledge(14, 5, 6); r.mirror(22, 0, 4)
r.block(26, 0, 6, 3); r.ledge(33, 7, 7); r.mirror(42, 3, 5); r.put("G", 36, 8)
r.pit(44, 9); r.mover(45, 3, 4, 44, 53)
r.block(53, 0, 8, 2); r.mirror(62, 2, 4); r.ledge(64, 6, 6)
r.block(72, 0, 17, 2); r.put("E", 86, 2)
r.enemies([("s", 30, 3), ("i", 18, 0), ("f", 40, 11), ("h", 58, 2), ("d", 48, 9),
           ("S", 68, 7), ("I", 56, 2), ("N", 76, 2), ("L", 34, 8), ("K", 80, 2)])

# Gallery of Selves: a long portrait hall lined with panes.
r = room("entry_gallery_of_selves", "room.gallery_of_selves", "entry", 98, 20)
r.put("P", 3)
for x in (16, 34, 52, 70):
    r.mirror(x, 0, 3)
r.ledge(9, 5, 6); r.ledge(20, 6, 8); r.ledge(40, 6, 8); r.ledge(58, 6, 8); r.ledge(76, 5, 6)
r.ledge(28, 10, 8); r.ledge(48, 10, 8); r.put("G", 51, 11)
r.pit(82, 6); r.block(88, 0, 9, 2); r.put("E", 94, 2)
r.enemies([("s", 24, 7), ("s", 62, 7), ("i", 30, 0), ("f", 44, 13), ("h", 60, 0),
           ("S", 32, 11), ("N", 46, 0), ("D", 70, 9), ("L", 78, 6), ("K", 90, 2)])

# Prism Court: panes in a ring around the fountain; shots go everywhere.
r = room("combat_prism_court", "room.prism_court", "combat", 72, 24)
r.put("P", 3)
r.mirror(14, 0, 4); r.mirror(57, 0, 4); r.mirror(30, 7, 3); r.mirror(41, 7, 3)
r.ledge(6, 5, 7); r.ledge(59, 5, 7); r.ledge(18, 6, 8); r.ledge(46, 6, 8)
r.ledge(29, 10, 14); r.put("G", 35, 11)
r.ledge(10, 12, 7); r.ledge(55, 12, 7); r.ledge(22, 16, 8); r.ledge(42, 16, 8)
r.put("E", 68)
r.enemies([("s", 8, 6), ("s", 62, 6), ("f", 36, 14), ("h", 36, 0), ("l", 21, 7),
           ("S", 24, 17), ("S", 46, 17), ("D", 36, 20), ("N", 50, 0), ("K", 20, 0)])

# Mirror Spire: a climb past panes that guard every landing.
r = room("combat_mirror_spire", "room.mirror_spire", "combat", 46, 40)
r.put("P", 4)
r.ledge(8, 4, 8); r.ledge(22, 5, 8); r.ledge(34, 4, 8); r.mirror(20, 0, 3)
r.ledge(14, 9, 8); r.ledge(28, 10, 8); r.mirror(26, 11, 3)
r.ledge(4, 13, 8); r.ledge(20, 14, 8); r.ledge(34, 14, 8)
r.ledge(12, 19, 8); r.ledge(28, 19, 8); r.mirror(24, 20, 3); r.put("G", 30, 20)
r.ledge(4, 23, 7); r.ledge(36, 23, 7)
r.ledge(6, 28, 8); r.ledge(32, 28, 8)
r.block(18, 31, 26, 1); r.put("E", 41, 32)
r.enemies([("s", 36, 6), ("f", 20, 17), ("i", 24, 6), ("d", 30, 13), ("l", 7, 15),
           ("S", 14, 21), ("L", 37, 16), ("F", 22, 27), ("N", 26, 32), ("D", 34, 30)])

# Masquerade: a ballroom with dancers behind panes and masks overhead.
r = room("combat_masquerade", "room.masquerade", "combat", 90, 22)
r.put("P", 3)
r.block(8, 0, 4, 2); r.mirror(18, 0, 4); r.mirror(36, 0, 4); r.mirror(54, 0, 4); r.mirror(72, 0, 4)
r.ledge(20, 6, 8); r.ledge(38, 7, 8); r.ledge(56, 6, 8); r.ledge(28, 11, 10); r.ledge(48, 11, 10)
r.put("G", 52, 12)
r.block(78, 0, 11, 2); r.put("E", 86, 2)
r.enemies([("n", 26, 0), ("n", 62, 0), ("s", 42, 8), ("f", 30, 14), ("h", 46, 0),
           ("S", 22, 7), ("S", 60, 7), ("I", 34, 0), ("D", 50, 15), ("K", 70, 0)])

# Shattered Wing: broken floors over a drop; the panes are the cover.
r = room("combat_shattered_wing", "room.shattered_wing", "combat", 80, 22)
r.block(1, 0, 8, 1); r.put("P", 3, 1)
r.pit(9, 62, lava=False)
r.ledge(11, 3, 6); r.mover(19, 4, 4, 18, 28); r.ledge(29, 5, 6); r.mirror(33, 6, 3)
r.ledge(37, 8, 8); r.put("G", 40, 9); r.mover(46, 4, 4, 45, 55); r.ledge(56, 5, 6); r.mirror(58, 6, 3)
r.ledge(63, 3, 6); r.block(71, 0, 8, 2); r.put("E", 76, 2)
r.enemies([("d", 22, 10), ("d", 52, 11), ("s", 30, 6), ("s", 64, 4), ("f", 40, 13),
           ("D", 34, 12), ("S", 57, 6), ("F", 48, 12), ("I", 74, 2), ("N", 72, 2)])

# Recovery: a powder room and a quiet chapel of masks.
r = room("recovery_powder_room", "room.powder_room", "recovery", 46, 16)
r.put("P", 3); r.block(14, 0, 6, 2); r.put("+", 16, 2); r.ledge(24, 5, 6); r.put("o", 26, 6)
r.mirror(32, 0, 3); r.put("o", 36); r.put("E", 42)

r = room("recovery_mask_chapel", "room.mask_chapel", "recovery", 50, 16)
r.put("P", 3); r.pit(14, 8); r.ledge(16, 4, 4); r.put("$", 17, 5)
r.put("+", 30); r.put("o", 38); r.put("E", 46)

# Better Milo's Reflection Room: the copy fights in a hall of panes.
r = room("miniboss_reflection_room", "room.reflection_room", "miniboss", 52, 20, boss="better_milo")
r.put("P", 4); r.put("B", 34)
r.mirror(12, 0, 3); r.mirror(39, 0, 3)
r.ledge(3, 5, 6); r.ledge(43, 5, 6); r.ledge(14, 7, 7); r.ledge(31, 7, 7); r.ledge(21, 11, 10)
r.put("E", 50)

# Vespera's Thousand Faces: a stage of mirrors; her reflect is the trap.
r = room("boss_thousand_faces", "room.thousand_faces", "boss", 60, 24, boss="vespera")
r.put("P", 4); r.put("B", 34)
r.mirror(10, 0, 3); r.mirror(49, 0, 3)
r.ledge(2, 6, 7); r.ledge(51, 6, 7); r.ledge(12, 8, 8); r.ledge(40, 8, 8)
r.ledge(23, 11, 14); r.ledge(6, 13, 7); r.ledge(47, 13, 7); r.ledge(19, 16, 6); r.ledge(35, 16, 6)
r.put("E", 58)

if __name__ == "__main__":
    for old in OUT.glob("*.txt"):
        old.unlink()
    sys.exit(0 if write(rooms, OUT) else 1)

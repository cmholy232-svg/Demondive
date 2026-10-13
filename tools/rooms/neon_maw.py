"""Level 1, The Neon Maw. Run: python tools/rooms/neon_maw.py"""
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


# 1. Ember Alley: a street of stepped rooftops, a cocktail trench crossed by
# a club platform, and a caged goddess on the tallest roof.
r = room("entry_ember_alley", "room.ember_alley", "entry", 86, 22)
r.put("P", 3)
r.block(14, 0, 6, 2); r.block(16, 2, 4, 2)
r.ledge(8, 4, 5); r.ledge(22, 6, 6)
r.pit(30, 9); r.mover(31, 3, 4, 30, 40)
r.block(42, 0, 10, 3); r.block(45, 3, 6, 3)
r.put("G", 48, 6)
r.ledge(36, 9, 5); r.ledge(54, 8, 6); r.ledge(62, 5, 5)
r.block(70, 0, 4, 2); r.block(74, 0, 11, 4)
r.ledge(66, 11, 6)
r.put("E", 82, 4)
r.enemies([("i", 18, 4), ("i", 25, 0), ("f", 37, 12), ("i", 56, 0), ("s", 63, 6),
           ("I", 44, 3), ("F", 60, 12), ("H", 66, 0), ("I", 78, 4)])

# 2. Neon Foundry: spike gutters, a lift up to the catwalk, and a crawler lane.
r = room("combat_neon_foundry", "room.neon_foundry", "combat", 92, 24)
r.put("P", 3)
r.block(10, 0, 8, 2); r.spikes(18, 0, 6); r.block(24, 0, 8, 2)
r.ledge(6, 5, 6); r.ledge(14, 8, 6)
r.lift(34, 1, 3, 1, 9)
r.block(38, 9, 30, 1)
r.ledge(40, 13, 5); r.ledge(52, 14, 6); r.ledge(62, 12, 4)
r.put("G", 46, 10)
r.spikes(40, 0, 20)
r.block(68, 0, 3, 10)
r.pit(72, 6)
r.block(78, 0, 13, 3); r.ledge(80, 7, 6)
r.put("E", 88, 3)
r.enemies([("i", 12, 2), ("s", 27, 2), ("f", 20, 11), ("k", 50, 10), ("s", 64, 10),
           ("H", 30, 2), ("F", 55, 17), ("I", 80, 3), ("K", 84, 3)])

# 3. Billboard Row: a long trench of pink cocktail spanned by club platforms
# riding between billboards.
r = room("entry_billboard_row", "room.billboard_row", "entry", 100, 20)
r.put("P", 3)
r.ledge(8, 4, 5)
r.pit(14, 22); r.mover(16, 2, 4, 14, 26); r.mover(28, 4, 4, 26, 36)
r.ledge(20, 8, 6)
r.block(36, 0, 12, 2); r.put("G", 44, 2)
r.ledge(38, 6, 4); r.ledge(46, 9, 5)
r.pit(48, 18); r.mover(50, 3, 4, 48, 58); r.mover(60, 5, 4, 58, 66)
r.ledge(54, 9, 6)
r.block(66, 0, 10, 2); r.block(76, 0, 23, 3)
r.ledge(70, 6, 5); r.ledge(84, 8, 6)
r.put("E", 96, 3)
r.enemies([("i", 10, 0), ("f", 22, 12), ("i", 40, 2), ("s", 47, 10), ("h", 70, 2),
           ("F", 56, 12), ("I", 72, 2), ("N", 86, 3), ("S", 92, 3)])

# 4. Velvet Pit: a tiered arena. Two waves, spikes on the bottom steps.
r = room("combat_velvet_pit", "room.velvet_pit", "combat", 66, 26)
r.put("P", 3)
r.block(8, 0, 4, 2); r.spikes(14, 0, 5); r.spikes(47, 0, 5); r.block(54, 0, 4, 2)
r.ledge(6, 5, 7); r.ledge(53, 5, 7)
r.ledge(16, 8, 8); r.ledge(42, 8, 8)
r.ledge(28, 11, 10)
r.ledge(10, 14, 6); r.ledge(50, 14, 6)
r.ledge(26, 17, 14); r.put("G", 33, 18)
r.put("E", 62)
r.enemies([("s", 9, 6), ("s", 56, 6), ("h", 30, 0), ("f", 33, 14),
           ("N", 20, 0), ("H", 46, 0), ("F", 14, 17), ("F", 52, 17), ("K", 33, 0)])

# 5. Dance Floor: everything moves. Club platforms over a lava floor.
r = room("combat_dance_floor", "room.dance_floor", "combat", 82, 22)
r.block(1, 0, 10, 1)
r.put("P", 3, 1)
r.pit(11, 60)
r.mover(13, 2, 5, 11, 28); r.mover(30, 4, 5, 28, 44); r.mover(46, 2, 5, 44, 60); r.mover(62, 4, 5, 60, 71)
r.ledge(18, 7, 6); r.ledge(36, 9, 6); r.ledge(52, 7, 6); r.ledge(64, 10, 5)
r.lift(26, 6, 3, 6, 13); r.ledge(30, 14, 8); r.put("G", 34, 15)
r.block(71, 0, 10, 2)
r.put("E", 78, 2)
r.enemies([("f", 20, 11), ("f", 54, 11), ("s", 38, 10), ("s", 66, 11),
           ("F", 30, 16), ("F", 62, 15), ("I", 74, 2), ("I", 76, 2)])

# 6. VIP Tower: climb. The exit is at the top of the club tower.
r = room("combat_vip_tower", "room.vip_tower", "combat", 50, 36)
r.put("P", 4)
r.ledge(10, 4, 8); r.ledge(26, 4, 8); r.ledge(38, 6, 8)
r.ledge(18, 8, 10); r.ledge(4, 10, 8)
r.ledge(30, 11, 8); r.lift(42, 9, 3, 9, 16)
r.ledge(14, 14, 8); r.ledge(2, 17, 6)
r.ledge(24, 17, 10); r.ledge(38, 19, 8)
r.ledge(10, 21, 8); r.put("G", 13, 22)
r.ledge(26, 23, 8); r.ledge(40, 25, 8)
r.block(30, 28, 18, 1)
r.put("E", 45, 29)
r.enemies([("i", 20, 0), ("i", 30, 0), ("s", 22, 9), ("f", 12, 16), ("h", 32, 12),
           ("S", 27, 18), ("F", 30, 26), ("N", 34, 29), ("I", 40, 29)])

# Recovery rooms: a breather with food, one with a tempting snack over spikes.
r = room("recovery_back_bar", "room.back_bar", "recovery", 46, 16)
r.put("P", 3); r.ledge(16, 5, 10); r.ledge(6, 3, 4); r.ledge(34, 3, 4)
r.put("+", 20); r.put("o", 26); r.put("E", 42)

r = room("recovery_coat_check", "room.coat_check", "recovery", 50, 16)
r.put("P", 3); r.spikes(12, 0, 8); r.spikes(30, 0, 8)
r.ledge(14, 3, 4); r.ledge(32, 3, 4); r.ledge(20, 6, 8); r.put("+", 24, 7)
r.put("o", 25); r.put("$", 34, 1); r.put("E", 46)

# Last Call Lounge: the Bartender's bar. Two side ledges that matter for the pour.
r = room("miniboss_last_call", "room.last_call_lounge", "miniboss", 44, 18, boss="bartender")
r.put("P", 4); r.put("B", 20)
r.ledge(6, 4, 7); r.ledge(31, 4, 7); r.ledge(17, 7, 10); r.ledge(3, 9, 5); r.ledge(36, 9, 5)
r.put("E", 41)

# Belladonna's Maw: a banquet hall with room to run from the vortex.
r = room("boss_belladonnas_maw", "room.belladonnas_maw", "boss", 52, 20, boss="belladonna")
r.put("P", 4); r.put("B", 21)
r.ledge(6, 4, 6); r.ledge(40, 4, 6); r.ledge(15, 7, 7); r.ledge(30, 7, 7)
r.ledge(21, 10, 10); r.ledge(4, 11, 6); r.ledge(42, 11, 6)
r.put("E", 49)

if __name__ == "__main__":
    for old in OUT.glob("*.txt"):
        old.unlink()
    sys.exit(0 if write(rooms, OUT) else 1)

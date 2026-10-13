"""Level 6, The Forever Motel. Run: python tools/rooms/forever_motel.py

A motel that never lets you check out. Room doors are linked in pairs, so
Milo steps through one and out of another down the hall; some nights the
same room comes round twice."""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from roomkit import Room, write

OUT = pathlib.Path(__file__).resolve().parents[2] / "data/rooms/forever_motel"
rooms = []


def room(file, *args, **kw):
    r = Room(*args, **kw)
    r.file = file
    rooms.append(r)
    return r


# Vacancy Sign: a two-storey motel front; door 1 on the ground skips the
# broken stairs up to door 2 on the balcony.
r = room("entry_vacancy_sign", "room.vacancy_sign", "entry", 90, 24)
r.put("P", 3)
r.block(12, 0, 4, 2); r.ledge(8, 5, 6)
r.portals((20, 0), (40, 11)); r.block(24, 0, 6, 3)
r.block(30, 10, 28, 1); r.ledge(32, 5, 6); r.put("G", 50, 11)
r.pit(30, 10); r.mover(31, 2, 4, 30, 40)
r.block(40, 0, 18, 2)
r.portals((56, 11), (64, 0), pair=2)
r.block(58, 0, 4, 4); r.ledge(66, 5, 6); r.block(72, 0, 17, 2); r.put("E", 86, 2)
r.enemies([("i", 14, 2), ("f", 26, 8), ("s", 44, 11), ("h", 48, 2), ("d", 36, 8),
           ("I", 52, 11), ("L", 60, 4), ("K", 46, 2), ("N", 80, 2), ("D", 68, 10)])

# Ice Machine Hall: a corridor that loops. Doors carry Milo back and ahead.
r = room("entry_ice_machine_hall", "room.ice_machine_hall", "entry", 96, 20)
r.put("P", 3)
r.block(10, 0, 3, 2); r.ledge(14, 5, 6)
r.portals((22, 0), (52, 0))
r.block(26, 0, 4, 4); r.ledge(31, 6, 6); r.block(38, 0, 4, 4); r.put("G", 34, 7)
r.pit(43, 8); r.mover(44, 3, 4, 43, 51)
r.block(54, 0, 6, 2); r.ledge(60, 6, 8); r.portals((62, 7), (84, 0), pair=2)
r.pit(68, 12); r.mover(69, 3, 4, 68, 80)
r.block(80, 0, 15, 2); r.put("E", 92, 2)
r.enemies([("i", 16, 6), ("s", 28, 4), ("l", 40, 4), ("d", 34, 11), ("f", 58, 10),
           ("I", 56, 2), ("H", 86, 2), ("N", 30, 4), ("S", 64, 7), ("K", 18, 0)])

# Room 6B: a stack of guest rooms; the doors are the stairs.
r = room("combat_room_six_b", "room.room_six_b", "combat", 50, 36)
r.put("P", 4)
r.block(1, 8, 20, 1); r.block(29, 8, 20, 1)
r.block(1, 16, 20, 1); r.block(29, 16, 20, 1)
r.block(1, 24, 20, 1); r.block(29, 24, 20, 1)
r.portals((14, 0), (36, 9)); r.portals((10, 9), (40, 17), pair=2)
r.ledge(22, 4, 6); r.ledge(22, 12, 6); r.ledge(22, 20, 6); r.ledge(22, 28, 6)
r.put("G", 6, 25); r.put("E", 46, 25)
r.enemies([("i", 30, 0), ("s", 4, 9), ("h", 44, 9), ("f", 24, 15), ("l", 46, 17),
           ("D", 24, 23), ("S", 4, 17), ("N", 30, 17), ("K", 32, 25), ("I", 16, 25)])

# Pool Deck: a drained pool; the diving board door drops into the deep end.
r = room("combat_pool_deck", "room.pool_deck", "combat", 84, 22)
r.put("P", 3)
r.block(8, 0, 4, 2); r.ledge(13, 5, 6)
r.pit(20, 40, lava=False); r.block(20, -2, 40, 1)
r.ledge(22, 3, 6); r.ledge(31, 6, 8); r.ledge(42, 3, 6); r.ledge(50, 6, 7)
r.portals((24, 4), (66, 0)); r.put("G", 34, 7)
r.block(60, 0, 6, 2); r.ledge(66, 6, 8); r.ledge(30, 12, 22)
r.block(74, 0, 9, 2); r.put("E", 80, 2)
r.enemies([("d", 28, 10), ("d", 52, 10), ("h", 66, 0), ("s", 10, 2), ("f", 40, 15),
           ("D", 40, 9), ("L", 62, 2), ("N", 70, 0), ("S", 44, 13), ("I", 36, 13)])

# Endless Corridor: doors on both walls; one set skips the hall entirely.
r = room("combat_endless_corridor", "room.endless_corridor", "combat", 94, 20)
r.put("P", 3)
for x in (12, 28, 44, 60, 76):
    r.block(x, 0, 3, 3)
r.ledge(16, 6, 8); r.ledge(48, 6, 8); r.ledge(32, 9, 10); r.ledge(64, 9, 10)
r.portals((20, 0), (70, 0)); r.portals((36, 10), (8, 0), pair=2); r.put("G", 52, 7)
r.put("E", 90)
r.enemies([("i", 24, 0), ("i", 56, 0), ("s", 13, 3), ("s", 77, 3), ("f", 40, 13),
           ("H", 48, 0), ("L", 29, 3), ("N", 66, 0), ("D", 54, 12), ("K", 84, 0)])

# Laundry Room: dryers spin, the doors don't go where they say.
r = room("combat_laundry_room", "room.laundry_room", "combat", 72, 26)
r.put("P", 3)
r.block(8, 0, 6, 3); r.block(58, 0, 6, 3)
r.ledge(16, 6, 8); r.ledge(48, 6, 8); r.ledge(28, 9, 16); r.put("G", 35, 10)
r.portals((10, 3), (60, 14)); r.portals((62, 3), (12, 14), pair=2)
r.ledge(8, 13, 8); r.ledge(56, 13, 8); r.ledge(22, 17, 10); r.ledge(40, 17, 10)
r.put("E", 68)
r.enemies([("s", 20, 7), ("s", 52, 7), ("h", 36, 0), ("l", 10, 3), ("d", 34, 13),
           ("N", 12, 14), ("N", 58, 14), ("F", 36, 20), ("K", 26, 0), ("I", 46, 0)])

# Recovery: a room with the TV left on, and the vending alcove.
r = room("recovery_room_service", "room.room_service", "recovery", 46, 16)
r.put("P", 3); r.block(14, 0, 6, 2); r.put("+", 16, 2); r.ledge(24, 5, 6); r.put("o", 26, 6)
r.put("o", 34); r.put("E", 42)

r = room("recovery_vending_alcove", "room.vending_alcove", "recovery", 50, 16)
r.put("P", 3); r.portals((12, 0), (22, 5)); r.ledge(20, 4, 6); r.put("$", 24, 5)
r.put("+", 32); r.put("o", 40); r.put("E", 46)

# Dream Girl's Honeymoon Suite: doors in every corner of the bed.
r = room("miniboss_honeymoon_suite", "room.honeymoon_suite", "miniboss", 52, 20, boss="dream_girl")
r.put("P", 4); r.put("B", 34)
r.ledge(3, 6, 6); r.ledge(43, 6, 6); r.ledge(14, 8, 7); r.ledge(31, 8, 7); r.ledge(21, 12, 10)
r.portals((2, 0), (46, 7)); r.portals((49, 0), (5, 7), pair=2)
r.put("E", 50)

# Somnia's Lobby: the front desk at the end of every night.
r = room("boss_endless_lobby", "room.endless_lobby", "boss", 60, 24, boss="somnia")
r.put("P", 4); r.put("B", 34)
r.ledge(2, 6, 7); r.ledge(51, 6, 7); r.ledge(12, 9, 8); r.ledge(40, 9, 8)
r.ledge(23, 12, 14); r.ledge(6, 14, 7); r.ledge(47, 14, 7)
r.portals((1 + 1, 0), (54, 7)); r.portals((57, 0), (5, 7), pair=2)
r.put("E", 58)

if __name__ == "__main__":
    for old in OUT.glob("*.txt"):
        old.unlink()
    sys.exit(0 if write(rooms, OUT) else 1)

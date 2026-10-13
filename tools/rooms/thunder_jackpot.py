"""Level 4, The Thunder Jackpot. Run: python tools/rooms/thunder_jackpot.py

A storm-lit casino. Floor rails switch on and off to the beat, so Milo
reads the lights and hops between them; every fight rolls a house rule."""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from roomkit import Room, write

OUT = pathlib.Path(__file__).resolve().parents[2] / "data/rooms/thunder_jackpot"
rooms = []


def room(file, *args, **kw):
    r = Room(*args, **kw)
    r.file = file
    rooms.append(r)
    return r


# Lightning Lobby: the first rails, with chip stacks to wait on.
r = room("entry_lightning_lobby", "room.lightning_lobby", "entry", 90, 22)
r.put("P", 3)
r.rail(10, 0, 8); r.block(18, 0, 3, 2); r.ledge(12, 5, 5)
r.rail(21, 0, 10); r.ledge(23, 6, 6); r.block(31, 0, 4, 3)
r.pit(35, 9); r.mover(36, 3, 4, 35, 44)
r.block(44, 0, 10, 2); r.ledge(46, 7, 7); r.put("G", 49, 8)
r.rail(54, 0, 12); r.ledge(56, 4, 4); r.ledge(62, 6, 4)
r.block(66, 0, 4, 3); r.rail(70, 0, 8); r.ledge(71, 6, 6)
r.block(78, 0, 11, 2); r.put("E", 86, 2)
r.enemies([("i", 24, 7), ("f", 30, 9), ("s", 47, 2), ("h", 60, 0), ("d", 40, 9),
           ("I", 50, 2), ("L", 67, 3), ("K", 74, 0), ("N", 82, 2), ("D", 58, 10)])

# Croupier Row: a strip of tables over a live floor.
r = room("entry_croupier_row", "room.croupier_row", "entry", 96, 20)
r.put("P", 3)
r.rail(8, 0, 30)
for x in (9, 17, 25, 33):
    r.block(x, 0, 3, 2)
r.ledge(13, 5, 5); r.ledge(21, 6, 5); r.ledge(29, 5, 5)
r.block(38, 0, 8, 2); r.put("G", 42, 2)
r.pit(46, 12); r.mover(47, 3, 4, 46, 58); r.ledge(50, 7, 4)
r.block(58, 0, 6, 2); r.rail(64, 0, 16); r.ledge(66, 5, 6); r.ledge(74, 5, 6)
r.block(80, 0, 15, 2); r.put("E", 92, 2)
r.enemies([("s", 10, 2), ("s", 34, 2), ("l", 26, 2), ("d", 22, 10), ("h", 60, 2),
           ("N", 18, 2), ("L", 42, 2), ("D", 54, 11), ("H", 72, 0), ("S", 86, 2)])

# High Roller Floor: a wide floor of rails; the tables are the safe ground.
r = room("combat_high_roller_floor", "room.high_roller_floor", "combat", 78, 24)
r.put("P", 3)
r.rail(7, 0, 64)
for x in (12, 26, 40, 54, 66):
    r.block(x, 0, 4, 2)
r.ledge(17, 6, 7); r.ledge(33, 7, 6); r.ledge(47, 6, 7); r.ledge(60, 7, 5)
r.ledge(24, 12, 10); r.ledge(42, 12, 10); r.put("G", 46, 13)
r.ledge(33, 16, 8)
r.put("E", 74)
r.enemies([("s", 13, 2), ("s", 67, 2), ("h", 34, 0), ("f", 38, 15), ("l", 27, 2),
           ("D", 22, 14), ("D", 56, 14), ("N", 41, 2), ("K", 50, 0), ("S", 36, 17)])

# Slot Tower: climb the reels; movers ride between the payout lines.
r = room("combat_slot_tower", "room.slot_tower", "combat", 48, 40)
r.put("P", 4)
r.rail(10, 0, 28)
r.ledge(6, 5, 8); r.ledge(20, 4, 8); r.ledge(34, 5, 8)
r.ledge(14, 9, 6); r.ledge(28, 9, 6)
r.lift(22, 10, 4, 10, 16); r.ledge(8, 14, 8); r.ledge(34, 14, 8)
r.ledge(18, 19, 12); r.rail(20, 20, 8); r.put("G", 19, 20)
r.ledge(6, 22, 7); r.ledge(36, 22, 7)
r.ledge(14, 26, 7); r.ledge(28, 27, 7)
r.block(20, 31, 26, 1); r.put("E", 44, 32)
r.enemies([("i", 24, 5), ("f", 12, 17), ("s", 37, 6), ("d", 30, 12), ("l", 9, 15),
           ("D", 18, 24), ("L", 38, 15), ("F", 32, 30), ("I", 30, 32), ("S", 26, 32)])

# Roulette Ring: a round pit; the wheel's spokes are rails that take turns.
r = room("combat_roulette_ring", "room.roulette_ring", "combat", 72, 24)
r.put("P", 3)
r.block(8, 0, 4, 2); r.block(60, 0, 4, 2)
r.rail(12, 0, 12); r.block(24, 0, 2, 1); r.rail(26, 0, 20); r.block(46, 0, 2, 1); r.rail(48, 0, 12)
r.ledge(14, 5, 7); r.ledge(51, 5, 7)
r.mover(26, 6, 5, 24, 46); r.ledge(30, 11, 12); r.put("G", 35, 12)
r.ledge(10, 12, 7); r.ledge(55, 12, 7); r.ledge(22, 16, 8); r.ledge(42, 16, 8)
r.put("E", 68)
r.enemies([("h", 30, 0), ("s", 9, 2), ("s", 61, 2), ("f", 36, 15), ("d", 18, 9),
           ("H", 40, 0), ("N", 34, 12), ("L", 25, 1), ("D", 52, 9), ("K", 47, 1)])

# Storm Vault: a bank vault under the lightning; the rails guard the loot.
r = room("combat_storm_vault", "room.storm_vault", "combat", 88, 22)
r.put("P", 3)
r.block(9, 0, 6, 3); r.rail(15, 0, 10); r.ledge(16, 5, 8)
r.pit(25, 10); r.mover(26, 4, 4, 25, 35); r.ledge(28, 9, 5)
r.block(35, 0, 8, 2); r.rail(43, 0, 12); r.ledge(44, 6, 10); r.rail(46, 7, 6)
r.ledge(41, 12, 7); r.ledge(53, 11, 7); r.put("$", 50, 13)
r.block(55, 0, 4, 3); r.rail(59, 0, 10); r.ledge(61, 6, 6); r.put("G", 63, 7)
r.block(69, 0, 18, 2); r.put("E", 85, 2)
r.enemies([("l", 11, 3), ("i", 20, 0), ("d", 30, 12), ("s", 38, 2), ("f", 48, 15),
           ("K", 46, 0), ("I", 56, 3), ("H", 64, 0), ("N", 76, 2), ("S", 58, 11)])

# Recovery: the comp lounge and the coat check with a single live strip.
r = room("recovery_comp_lounge", "room.comp_lounge", "recovery", 46, 16)
r.put("P", 3); r.block(14, 0, 6, 2); r.put("+", 16, 2); r.ledge(24, 5, 6); r.put("o", 26, 6)
r.put("o", 34); r.put("E", 42)

r = room("recovery_cashier_cage", "room.cashier_cage", "recovery", 50, 16)
r.put("P", 3); r.rail(12, 0, 10); r.ledge(14, 4, 6); r.put("$", 16, 5)
r.put("+", 28); r.block(32, 0, 4, 2); r.put("o", 40); r.put("E", 46)

# Lady Luckless' Table: the felt is live in stripes; chips stack for footing.
r = room("miniboss_luckless_table", "room.luckless_table", "miniboss", 52, 20, boss="lady_luckless")
r.put("P", 4); r.put("B", 34)
r.rail(9, 0, 10); r.rail(33, 0, 10)
r.ledge(3, 5, 6); r.ledge(43, 5, 6); r.ledge(14, 7, 7); r.ledge(31, 7, 7); r.ledge(21, 11, 10)
r.put("E", 50)

# Calyptra's Jackpot Stage: a giant wheel behind her; every lane can light.
r = room("boss_jackpot_stage", "room.jackpot_stage", "boss", 60, 24, boss="calyptra")
r.put("P", 4); r.put("B", 34)
r.rail(10, 0, 12); r.rail(38, 0, 12)
r.ledge(2, 6, 7); r.ledge(51, 6, 7); r.ledge(12, 8, 8); r.ledge(40, 8, 8)
r.ledge(23, 11, 14); r.ledge(6, 13, 7); r.ledge(47, 13, 7); r.ledge(19, 16, 6); r.ledge(35, 16, 6)
r.put("E", 58)

if __name__ == "__main__":
    for old in OUT.glob("*.txt"):
        old.unlink()
    sys.exit(0 if write(rooms, OUT) else 1)

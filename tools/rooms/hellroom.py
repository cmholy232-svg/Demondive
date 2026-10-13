"""Milo's Hellroom, the hub. Run: python tools/rooms/hellroom.py
Stations: A summoning altar, D Milo's desk (upgrades), W wardrobe, E the dive."""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from roomkit import Room, write

OUT = pathlib.Path(__file__).resolve().parents[2] / "data/rooms/hub"

r = Room("room.hellroom", "hub", 50, 16, music="hub")
r.file = "hellroom"
r.put("P", 10)
# The bed is a low block Milo can stand on; a bookshelf loft above it.
r.block(1, 0, 7, 1)
r.ledge(1, 5, 8)
r.put("A", 14)
r.put("D", 23)
# A short step and a loft between the desk and the wardrobe for jump practice.
r.ledge(27, 3, 4); r.ledge(31, 6, 5); r.ledge(37, 3, 3)
r.put("W", 33)
r.put("E", 45)
write([r], OUT)

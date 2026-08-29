"""
fake_db.py
----------
A drop-in "fake MongoDB" for local development/demo. It mimics the small
slice of the pymongo/motor API this project needs (find_one, find,
insert_one, update_one) so that swapping in real MongoDB later only means
replacing FakeCollection with an AsyncIOMotorCollection — the calling code
in main.py does not need to change.

To go live: `pip install motor`, then in main.py replace
    from fake_db import db
with
    from motor.motor_asyncio import AsyncIOMotorClient
    db = AsyncIOMotorClient(MONGO_URL)["ivr_procurement"]
"""
import itertools
from typing import Any, Optional


class FakeCollection:
    def __init__(self, seed: dict):
        # keyed by _id, like a real Mongo collection
        self._data: dict[str, dict] = seed

    async def find_one(self, query: dict) -> Optional[dict]:
        _id = query.get("_id")
        if _id is not None:
            doc = self._data.get(_id)
            return {**doc, "_id": _id} if doc else None
        for _id, doc in self._data.items():
            if all(doc.get(k) == v for k, v in query.items()):
                return {**doc, "_id": _id}
        return None

    async def find(self, query: dict) -> list[dict]:
        out = []
        for _id, doc in self._data.items():
            if all(doc.get(k) == v for k, v in query.items()):
                out.append({**doc, "_id": _id})
        return out

    async def insert_one(self, doc: dict):
        _id = doc.pop("_id")
        self._data[_id] = doc
        return _id

    async def update_one(self, query: dict, update: dict):
        found = await self.find_one(query)
        if not found:
            return False
        _id = found["_id"]
        self._data[_id].update(update.get("$set", {}))
        if "$inc" in update:
            for k, v in update["$inc"].items():
                self._data[_id][k] = self._data[_id].get(k, 0) + v
        return True


class FakeDB:
    def __init__(self):
        self.farmers = FakeCollection({
            "101101": {"name": "S. Murugan",  "district": "Thanjavur",  "lang": "ta", "phone": "9876543210"},
            "101102": {"name": "K. Lakshmi",  "district": "Thanjavur",  "lang": "ta", "phone": "9876543211"},
            "202201": {"name": "R. Suresh",   "district": "Coimbatore", "lang": "en", "phone": "9876543212"},
            "202202": {"name": "Priya Anand", "district": "Coimbatore", "lang": "en", "phone": "9876543213"},
            "303301": {"name": "Suresh Kumar Yadav", "district": "Meerut", "lang": "hi", "phone": "9876543214"},
            "303302": {"name": "Anita Sharma",       "district": "Meerut", "lang": "hi", "phone": "9876543215"},
        })

        self.locations = FakeCollection({
            "THJ-01": {"name": "Thanjavur Main PDS Yard",       "district": "Thanjavur",  "km": 2.3},
            "THJ-02": {"name": "Orathanadu Procurement Centre", "district": "Thanjavur",  "km": 5.1},
            "THJ-03": {"name": "Kumbakonam Regulated Market",   "district": "Thanjavur",  "km": 8.7},
            "THJ-04": {"name": "Pattukkottai Collection Point", "district": "Thanjavur",  "km": 11.4},
            "CBE-01": {"name": "Coimbatore North APMC Yard",    "district": "Coimbatore", "km": 3.0},
            "CBE-02": {"name": "Sulur Procurement Centre",      "district": "Coimbatore", "km": 6.2},
            "CBE-03": {"name": "Pollachi Regulated Market",     "district": "Coimbatore", "km": 14.5},
            "MRT-01": {"name": "Meerut Sadar Mandi",             "district": "Meerut", "km": 1.8},
            "MRT-02": {"name": "Kharkhauda Procurement Centre",  "district": "Meerut", "km": 9.3},
            "MRT-03": {"name": "Mawana Collection Yard",         "district": "Meerut", "km": 12.1},
            "MRT-04": {"name": "Sardhana Regulated Market",      "district": "Meerut", "km": 15.6},
        })

        self.bookings = FakeCollection({
            "202201": {"token": 47, "date": "29 Aug 2026", "time": "10:30 AM",
                       "location_id": "CBE-02", "location_name": "Sulur Procurement Centre"},
        })

        self.queue = FakeCollection({
            "THJ-01": {"people_ahead": 12, "avg_minutes": 4}, "THJ-02": {"people_ahead": 4, "avg_minutes": 5},
            "THJ-03": {"people_ahead": 7,  "avg_minutes": 3}, "THJ-04": {"people_ahead": 2, "avg_minutes": 6},
            "CBE-01": {"people_ahead": 9,  "avg_minutes": 4}, "CBE-02": {"people_ahead": 5, "avg_minutes": 4},
            "CBE-03": {"people_ahead": 3,  "avg_minutes": 5},
            "MRT-01": {"people_ahead": 15, "avg_minutes": 3}, "MRT-02": {"people_ahead": 6, "avg_minutes": 4},
            "MRT-03": {"people_ahead": 1,  "avg_minutes": 5}, "MRT-04": {"people_ahead": 8, "avg_minutes": 4},
        })

        self._token_counter = itertools.count(48)

    def next_token(self) -> int:
        return next(self._token_counter)


db = FakeDB()

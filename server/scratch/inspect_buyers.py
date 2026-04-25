import os
from pymongo import MongoClient

uri = "mongodb+srv://freshWay:I1CnwUuOKYw5vxnn@cluster0.jzyvdea.mongodb.net/freshway_db?appName=Cluster0"
print(f"Connecting to MongoDB...")

client = MongoClient(uri)
db = client.get_database("freshway_db")

buyers = list(db.users.find({"role": "buyer"}))
print(f"Found {len(buyers)} buyers")

for b in buyers:
    print(f"Buyer: {b.get('name', 'Unknown')}, Email: {b.get('email')}")
    print(f"Keys: {list(b.keys())}")
    print("---")

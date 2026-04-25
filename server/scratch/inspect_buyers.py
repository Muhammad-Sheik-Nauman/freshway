import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

uri = os.environ.get("MONGODB_URI")
if not uri:
    # Try looking in the parent directory or specific path if needed
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
    uri = os.environ.get("MONGODB_URI")

if not uri:
    print("Error: MONGODB_URI not found in environment variables.")
    exit(1)

uri = uri.strip('"').strip("'")
print(f"Connecting to MongoDB...")

client = MongoClient(uri)
db = client.get_database("freshway_db")

buyers = list(db.users.find({"role": "buyer"}))
print(f"Found {len(buyers)} buyers")

for b in buyers:
    print(f"Buyer: {b.get('name', 'Unknown')}, Email: {b.get('email')}")
    print(f"Keys: {list(b.keys())}")
    print("---")

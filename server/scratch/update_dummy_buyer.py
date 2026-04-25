import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("c:\\Users\\DELL\\Documents\\freshway\\server\\.env")

uri = os.environ.get("MONGODB_URI")
if uri:
    uri = uri.strip('"').strip("'")
    client = MongoClient(uri)
    db = client.get_database("freshway_db")
    
    # Update the Mumbai buyer to Bangalore
    result = db.users.update_one(
        {"email": "export@mumbaiseafood.com"},
        {"$set": {
            "name": "Bangalore Seafood Exporters",
            "businessName": "Bangalore Seafood Exporters",
            "location": "Bangalore",
            "email": "export@bangaloreseafood.com"
        }}
    )
    
    print(f"Matched {result.matched_count} documents and modified {result.modified_count} documents.")
else:
    print("Error: MONGODB_URI not found.")

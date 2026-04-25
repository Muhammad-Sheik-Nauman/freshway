import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("c:\\Users\\DELL\\Documents\\freshway\\server\\.env")

uri = os.environ.get("MONGODB_URI")
if uri:
    uri = uri.strip('"').strip("'")
    client = MongoClient(uri)
    db = client.get_database("freshway_db")
    
    dummy_buyers = [
        # Highly Fresh (Sushi / Premium)
        {
            "name": "Oceanic Sushi & Premium Seafood",
            "email": "contact@oceanicsushi.com",
            "role": "buyer",
            "businessName": "Oceanic Sushi & Premium Seafood",
            "businessType": "Premium Sushi Restaurant",
            "location": "Bangalore"
        },
        {
            "name": "Mumbai Seafood Exporters",
            "email": "export@mumbaiseafood.com",
            "role": "buyer",
            "businessName": "Mumbai Seafood Exporters",
            "businessType": "Export",
            "location": "Mumbai"
        },
        # Fresh (Supermarket / Retail)
        {
            "name": "Coastal Fresh Supermarket",
            "email": "purchasing@coastalfresh.com",
            "role": "buyer",
            "businessName": "Coastal Fresh Supermarket",
            "businessType": "Supermarket",
            "location": "Mysore"
        },
        {
            "name": "Udupi Local Retailers",
            "email": "info@udupiretail.com",
            "role": "buyer",
            "businessName": "Udupi Local Retail",
            "businessType": "Retail",
            "location": "Udupi"
        },
        # Not Fresh (Fish Meal / Fertilizer)
        {
            "name": "Mangaluru Fish Meal Plant",
            "email": "rawmaterials@mangalurufishmeal.com",
            "role": "buyer",
            "businessName": "Mangaluru Fish Meal Plant",
            "businessType": "Fish Meal",
            "location": "Mangaluru"
        },
        {
            "name": "AgriFeed Fertilizers",
            "email": "supply@agrifeed.com",
            "role": "buyer",
            "businessName": "AgriFeed Fertilizers",
            "businessType": "Fertilizer Plant",
            "location": "Mangaluru"
        }
    ]
    
    # Optional: Delete previous dummy buyers to prevent duplicates
    db.users.delete_many({"email": {"$in": [b["email"] for b in dummy_buyers]}})
    
    # Insert new
    result = db.users.insert_many(dummy_buyers)
    print(f"Inserted {len(result.inserted_ids)} dummy buyers into MongoDB!")
else:
    print("Error: MONGODB_URI not found.")

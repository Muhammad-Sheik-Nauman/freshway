import os
import random
import math
from pymongo import MongoClient
from geopy.geocoders import Nominatim

_db = None
_geolocator = Nominatim(user_agent="freshway_app")
_geocode_cache = {}

def get_lat_lon(location_string):
    if not location_string:
        return None
    if location_string in _geocode_cache:
        return _geocode_cache[location_string]
    try:
        location = _geolocator.geocode(location_string, timeout=3)
        if location:
            coords = (location.latitude, location.longitude)
            _geocode_cache[location_string] = coords
            return coords
    except Exception as e:
        print(f"Geocode error: {e}")
    return None

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2) * math.sin(dlat/2) + math.cos(math.radians(lat1)) \
        * math.cos(math.radians(lat2)) * math.sin(dlon/2) * math.sin(dlon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def get_db():
    global _db
    if _db is None:
        uri = os.environ.get("MONGODB_URI")
        if uri:
            try:
                # Clean up quotes if present
                uri = uri.strip('"').strip("'")
                client = MongoClient(uri)
                _db = client.get_database("freshway_db")
            except Exception as e:
                print(f"MongoDB connection error: {e}")
    return _db

def route_market(freshness_label):
    """Route fish to market based on freshness label."""
    if freshness_label == "Highly Fresh":
        return "Long-distance market (e.g., Bangalore)"
    elif freshness_label == "Fresh":
        return "Medium-distance market (e.g., Mysore)"
    elif freshness_label == "Not Fresh":
        return "Local market or reject"
    elif freshness_label == "Uncertain":
        return "Request better image"
    else:
        return "Invalid label"

def get_ice_recommendation(freshness_label):
    """Provide ice/storage recommendations based on freshness."""
    if freshness_label == "Highly Fresh":
        return "Add 0.5kg ice per 1kg of fish. It will stay fresh for up to 48 hours."
    elif freshness_label == "Fresh":
        return "Add 1kg ice per 1kg of fish. It will stay fresh for up to 24 hours."
    elif freshness_label == "Not Fresh":
        return "Must be stored at -18°C immediately. Not recommended for human consumption if odor is strong."
    else:
        return "Cannot provide recommendation for uncertain quality."

def get_recommended_buyers(freshness_label, seller_lat=None, seller_lon=None):
    """Return real live buyers matching business types, sorted by distance."""
    if freshness_label == "Uncertain":
        return []
        
    db = get_db()
    if db is None:
        return []

    if freshness_label == "Highly Fresh":
        target_types = ["premium", "sushi", "restaurant", "export", "hotel"]
        price = "Premium"
        distance_hint = "Long-distance OK"
    elif freshness_label == "Fresh":
        target_types = ["retail", "supermarket", "market", "vendor", "local"]
        price = "Standard"
        distance_hint = "Mid/Local"
    elif freshness_label == "Not Fresh":
        target_types = ["fertilizer", "meal", "feed", "agriculture", "plant"]
        price = "Low"
        distance_hint = "Immediate Local"
    else:
        return []

    try:
        buyers = list(db.users.find({"role": "buyer"}))
        
        results = []
        for b in buyers:
            btype = str(b.get("businessType", "")).lower()
            
            # Check if this buyer's business type matches what we need
            is_match = False
            if btype:
                for t in target_types:
                    if t in btype:
                        is_match = True
                        break
            
            # If matched, add them to the list!
            if is_match:
                name = b.get("businessName") or b.get("name") or "Verified Buyer"
                loc_string = b.get("location")
                
                # Calculate real distance if we have Seller GPS and Buyer Location String
                distance_str = distance_hint
                exact_distance = 999999 # sorting fallback
                
                if seller_lat and seller_lon and loc_string:
                    buyer_coords = get_lat_lon(loc_string)
                    if buyer_coords:
                        dist_km = haversine(float(seller_lat), float(seller_lon), buyer_coords[0], buyer_coords[1])
                        exact_distance = dist_km
                        distance_str = f"{round(dist_km)} km away ({loc_string})"
                    else:
                        distance_str = loc_string
                elif loc_string:
                    distance_str = loc_string
                
                results.append({
                    "email": b.get("email", ""),
                    "name": name,
                    "type": b.get("businessType") or target_types[0].title(),
                    "distance": distance_str,
                    "exact_distance": exact_distance,
                    "price": price
                })
        
        # Sort buyers by exact distance if we calculated it
        results.sort(key=lambda x: x["exact_distance"])
        
        # Remove the exact_distance internal key before returning
        for r in results:
            del r["exact_distance"]
            
        return results
    except Exception as e:
        print(f"Error fetching buyers: {e}")
        return []

def get_buyer_suggestion(freshness_label):
    """Return a generic suggestion when no live buyers are found."""
    if freshness_label == "Highly Fresh":
        return "Recommendation: Best suited for Sushi Restaurants, Luxury Hotels, and Exporters. Safe for long-distance transit to premium markets."
    elif freshness_label == "Fresh":
        return "Recommendation: Best suited for Local Supermarkets, Fish Markets, and Mid-distance Retailers."
    elif freshness_label == "Not Fresh":
        return "Recommendation: Do not sell for human consumption. Sell immediately to local Fish Meal Plants, Animal Feed, or Fertilizer factories."
    return ""

# Business logic for market routing and confidence gating

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

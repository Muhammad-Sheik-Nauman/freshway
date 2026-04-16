import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "../../../lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Get all users with role=seller
    const sellers = await db
      .collection("users")
      .find(
        { role: "seller" },
        {
          projection: {
            _id: 1,
            name: 1,
            email: 1,
            image: 1,
            displayName: 1,
            phone: 1,
            location: 1,
            businessName: 1,
            businessType: 1,
            bio: 1,
            fishTypes: 1,
            priceRange: 1,
            minPrice: 1,
            maxPrice: 1,
            rating: 1,
            totalDeliveries: 1,
            profileComplete: 1,
            createdAt: 1,
          },
        }
      )
      .toArray();

    return NextResponse.json(sellers);
  } catch (error) {
    console.error("Error fetching sellers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

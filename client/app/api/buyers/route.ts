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

    // Get all users with role=buyer
    const buyers = await db
      .collection("users")
      .find(
        { role: "buyer" },
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
            profileComplete: 1,
            createdAt: 1,
          },
        }
      )
      .toArray();

    return NextResponse.json(buyers);
  } catch (error) {
    console.error("Error fetching buyers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

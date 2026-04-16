import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "../../../../lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const client = await clientPromise;
    const db = client.db();

    await db.collection("users").updateOne(
      { email: session.user.email },
      {
        $set: {
          fishTypes: body.fishTypes || [],
          priceRange: body.priceRange || "",
          minPrice: body.minPrice || 0,
          maxPrice: body.maxPrice || 0,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving seller details:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

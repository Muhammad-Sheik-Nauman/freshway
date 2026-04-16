import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "../../../../lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await req.json();
    const client = await clientPromise;
    const db = client.db();

    await db.collection("users").updateOne(
      { email: session.user.email },
      {
        $set: {
          displayName: profile.displayName,
          phone: profile.phone,
          location: profile.location,
          businessName: profile.businessName,
          businessType: profile.businessType,
          bio: profile.bio,
          profileComplete: true,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();
    const user = await db.collection("users").findOne(
      { email: session.user.email },
      { projection: { _id: 0, name: 1, email: 1, image: 1, displayName: 1, phone: 1, location: 1, businessName: 1, businessType: 1, bio: 1, role: 1, profileComplete: 1 } }
    );

    return NextResponse.json(user || {});
  } catch (error) {
    console.error("Error getting profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

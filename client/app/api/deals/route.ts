import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

// Create a deal / order request
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const client = await clientPromise;
    const db = client.db();

    const deal = {
      buyerEmail: session.user.email,
      buyerName: session.user.name,
      sellerEmail: body.sellerEmail,
      sellerName: body.sellerName,
      fishType: body.fishType,
      quantity: body.quantity,
      unit: body.unit || "kg",
      pricePerUnit: body.pricePerUnit,
      totalPrice: body.quantity * body.pricePerUnit,
      deliveryDate: body.deliveryDate,
      deliveryLocation: body.deliveryLocation,
      notes: body.notes || "",
      status: "pending", // pending, accepted, rejected, completed, cancelled
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("deals").insertOne(deal);

    return NextResponse.json({ success: true, dealId: result.insertedId });
  } catch (error) {
    console.error("Error creating deal:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Get deals 
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    const deals = await db
      .collection("deals")
      .find({
        $or: [
          { buyerEmail: session.user.email },
          { sellerEmail: session.user.email },
        ],
      })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(deals);
  } catch (error) {
    console.error("Error fetching deals:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Update deal status
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dealId, status } = await req.json();
    if (!dealId || !status) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const validStatuses = ["accepted", "rejected", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    await db.collection("deals").updateOne(
      { _id: new ObjectId(dealId) },
      { $set: { status, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating deal:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

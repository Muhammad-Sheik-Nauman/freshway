import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

// Create a new fish listing (seller only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const client = await clientPromise;
    const db = client.db();

    // Verify user is a seller
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user || user.role !== "seller") {
      return NextResponse.json({ error: "Only sellers can post fish listings" }, { status: 403 });
    }

    const listing = {
      sellerEmail: session.user.email,
      sellerName: user.displayName || user.name || session.user.name,
      sellerImage: user.image || session.user.image || null,
      businessName: user.businessName || "",
      location: user.location || "",
      fishName: body.fishName,
      description: body.description || "",
      imageUrl: body.imageUrl || null,
      pricePerKg: body.pricePerKg || 0,
      availableQuantity: body.availableQuantity || 0,
      unit: body.unit || "kg",
      freshness: body.freshness || "Fresh",
      availability: body.availability || "Available Today",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("fish_listings").insertOne(listing);

    return NextResponse.json({ success: true, listingId: result.insertedId });
  } catch (error) {
    console.error("Error creating fish listing:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Get fish listings
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sellerOnly = searchParams.get("mine");

    const client = await clientPromise;
    const db = client.db();

    let filter: any = { isActive: true };

    if (sellerOnly === "true") {
      // Seller wants to see only their own listings
      filter = { sellerEmail: session.user.email };
    }

    const listings = await db
      .collection("fish_listings")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(listings);
  } catch (error) {
    console.error("Error fetching fish listings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Update a fish listing (toggle active, edit, etc.)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { listingId, ...updates } = body;

    if (!listingId) {
      return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Ensure the seller owns this listing
    const listing = await db.collection("fish_listings").findOne({
      _id: new ObjectId(listingId),
      sellerEmail: session.user.email,
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found or unauthorized" }, { status: 404 });
    }

    await db.collection("fish_listings").updateOne(
      { _id: new ObjectId(listingId) },
      { $set: { ...updates, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating fish listing:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Delete a fish listing
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const listingId = searchParams.get("id");

    if (!listingId) {
      return NextResponse.json({ error: "Missing listing id" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    await db.collection("fish_listings").deleteOne({
      _id: new ObjectId(listingId),
      sellerEmail: session.user.email,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting fish listing:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sellerEmail, fishName, rating, comment } = body;

    if (!sellerEmail || !rating) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db("freshway_db");

    const query = {
      buyerEmail: session.user.email,
      sellerEmail,
      fishName: fishName || "General"
    };

    const existingReview = await db.collection("reviews").findOne(query);

    if (existingReview) {
      await client.close();
      return NextResponse.json({ error: "You have already reviewed this fish." }, { status: 400 });
    }

    const review = {
      ...query,
      buyerName: session.user.name || "Anonymous Buyer",
      rating: Number(rating),
      comment: comment || "",
      createdAt: new Date(),
    };

    const result = await db.collection("reviews").insertOne(review);
    await client.close();

    return NextResponse.json({ success: true, _id: result.insertedId, ...review });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sellerEmail = searchParams.get("sellerEmail");

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db("freshway_db");

    const query = sellerEmail ? { sellerEmail } : {};
    
    const reviews = await db.collection("reviews")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    await client.close();
    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

// Send a message
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipientEmail, content, dealId } = await req.json();
    if (!recipientEmail || !content) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const message = {
      senderEmail: session.user.email,
      senderName: session.user.name,
      recipientEmail,
      content,
      dealId: dealId || null,
      read: false,
      createdAt: new Date(),
    };

    await db.collection("messages").insertOne(message);

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Get conversations
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const withUser = searchParams.get("with");

    const client = await clientPromise;
    const db = client.db();

    if (withUser) {
      // Get conversation with specific user
      const messages = await db
        .collection("messages")
        .find({
          $or: [
            { senderEmail: session.user.email, recipientEmail: withUser },
            { senderEmail: withUser, recipientEmail: session.user.email },
          ],
        })
        .sort({ createdAt: 1 })
        .toArray();

      // Mark messages as read
      await db.collection("messages").updateMany(
        { senderEmail: withUser, recipientEmail: session.user.email, read: false },
        { $set: { read: true } }
      );

      return NextResponse.json(messages);
    } else {
      // Get all unique conversations
      const messages = await db
        .collection("messages")
        .find({
          $or: [
            { senderEmail: session.user.email },
            { recipientEmail: session.user.email },
          ],
        })
        .sort({ createdAt: -1 })
        .toArray();

      // Group by conversation partner
      const conversationMap = new Map();
      for (const msg of messages) {
        const partner =
          msg.senderEmail === session.user.email
            ? msg.recipientEmail
            : msg.senderEmail;
        if (!conversationMap.has(partner)) {
          const partnerUser = await db.collection("users").findOne(
            { email: partner },
            { projection: { name: 1, image: 1, displayName: 1, businessName: 1, role: 1 } }
          );
          const unreadCount = await db.collection("messages").countDocuments({
            senderEmail: partner,
            recipientEmail: session.user.email,
            read: false,
          });
          conversationMap.set(partner, {
            partnerEmail: partner,
            partnerName: partnerUser?.displayName || partnerUser?.name || partner,
            partnerImage: partnerUser?.image,
            partnerBusiness: partnerUser?.businessName,
            partnerRole: partnerUser?.role,
            lastMessage: msg.content,
            lastMessageAt: msg.createdAt,
            unreadCount,
          });
        }
      }

      return NextResponse.json(Array.from(conversationMap.values()));
    }
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

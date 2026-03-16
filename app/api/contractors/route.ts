import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data-source";
import { User } from "@/lib/entities/User";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyName = searchParams.get("companyName");

    if (!companyName) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    const dataSource = await getDataSource();
    const userRepository = dataSource.getRepository(User);
    
    // We only expose id, name, and contractorNumber for the login selection
    // We do NOT expose passwords, emails, or reset tokens.
    const contractors = await userRepository.find({
      select: ["id", "name", "contractorNumber"],
      where: { 
        type: "contractor"
      },
      order: { name: "ASC" }
    });

    return NextResponse.json(contractors);
  } catch (error) {
    console.error("Fetch contractors error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contractors" },
      { status: 500 }
    );
  }
}

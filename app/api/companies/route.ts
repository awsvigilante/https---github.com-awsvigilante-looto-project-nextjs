import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data-source";
import { Company } from "@/lib/entities/Company";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let dataSource = await getDataSource();
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    const repo = dataSource.getRepository(Company);
    const companies = await repo.find({ 
      where: { isActive: true },
      order: { name: "ASC" }
    });
    return NextResponse.json(companies);
  } catch (error: any) {
    console.error("Error fetching companies:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    let dataSource = await getDataSource();
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    const repo = dataSource.getRepository(Company);
    
    // Check if exists
    const existing = await repo.findOne({ where: { name: name.trim() } });
    if (existing) {
      return NextResponse.json({ error: "Company already exists" }, { status: 400 });
    }

    const company = repo.create({ name: name.trim(), isActive: true });
    await repo.save(company);

    return NextResponse.json(company, { status: 201 });
  } catch (error: any) {
    console.error("Error creating company:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

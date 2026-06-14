import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const district = searchParams.get("district");

    let query = supabase
      .from("fire_time_series")
      .select("date, district, fire_count, avg_frp")
      .order("date", { ascending: true });

    // 添加日期范围筛选
    if (startDate) {
      query = query.gte("date", startDate);
    }
    if (endDate) {
      query = query.lte("date", endDate);
    }
    if (district) {
      query = query.ilike("district", `%${district}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("Time API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch time series data" },
      { status: 500 }
    );
  }
}

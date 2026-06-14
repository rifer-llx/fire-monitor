import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minLng = searchParams.get("minLng");
    const minLat = searchParams.get("minLat");
    const maxLng = searchParams.get("maxLng");
    const maxLat = searchParams.get("maxLat");
    const date = searchParams.get("date");

    if (!minLng || !minLat || !maxLng || !maxLat) {
      return NextResponse.json(
        { success: false, error: "Missing bounds parameters" },
        { status: 400 }
      );
    }

    // 直接查询 beijing_ndvi 表
    let query = supabase
      .from("beijing_ndvi")
      .select("longitude, latitude, ndvi, acq_date")
      .gte("longitude", parseFloat(minLng))
      .lte("longitude", parseFloat(maxLng))
      .gte("latitude", parseFloat(minLat))
      .lte("latitude", parseFloat(maxLat));

    if (date) {
      query = query.eq("acq_date", date);
    }

    const { data, error } = await query.limit(10000);

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("Heat API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch heat map data" },
      { status: 500 }
    );
  }
}

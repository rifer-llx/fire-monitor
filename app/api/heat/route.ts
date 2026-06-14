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

    // 调用数据库函数获取 NDVI 数据
    const { data, error } = await supabase.rpc("get_ndvi_by_bounds", {
      min_lon: parseFloat(minLng),
      min_lat: parseFloat(minLat),
      max_lon: parseFloat(maxLng),
      max_lat: parseFloat(maxLat),
      filter_date: date || null,
    });

    if (error) {
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

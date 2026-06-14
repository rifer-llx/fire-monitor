import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radius = searchParams.get("radius");
    const date = searchParams.get("date");
    const district = searchParams.get("district");
    const confidence = searchParams.get("confidence");

    // 如果提供了经纬度和半径，使用附近火点查询
    if (lat && lng && radius) {
      const { data, error } = await supabase.rpc("find_nearby_fires", {
        longitude: parseFloat(lng),
        latitude: parseFloat(lat),
        radius_km: parseFloat(radius),
      });

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        data: data || [],
      });
    }

    // 否则使用常规查询
    let query = supabase
      .from("fire_points")
      .select(
        "id, location, frp, confidence, bright_ti4, bright_ti5, acq_date, acq_time, satellite, daynight, ndvi, district"
      )
      .order("acq_date", { ascending: false })
      .order("acq_time", { ascending: false });

    // 添加筛选条件
    if (date) {
      query = query.eq("acq_date", date);
    }
    if (district) {
      query = query.ilike("district", `%${district}%`);
    }
    if (confidence) {
      query = query.eq("confidence", confidence);
    }

    const { data, error } = await query.limit(1000);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("Map API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch fire points data" },
      { status: 500 }
    );
  }
}

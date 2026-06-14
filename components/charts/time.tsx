"use client";

import React, { useEffect, useState } from "react";
import { BASE_URL } from "@/lib/api";
import { Scatter } from "@ant-design/plots";

interface ApiDataItem {
  date: string;
  fire_count: number;
  avg_frp: number;
  district: string;
}

interface ScatterDataItem {
  datetime: number;
  bright: number;
}

const TimeScatter: React.FC = () => {
  const [data, setData] = useState<ScatterDataItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/time`);
        if (!res.ok) throw new Error("Network Error");
        const jsonData = await res.json();

        // API 返回 { success: true, data: [...] }
        const dataArray = jsonData.data || [];

        const scatterData = dataArray.map((item: ApiDataItem) => ({
          datetime: new Date(item.date).getTime(),
          bright: item.avg_frp || 0,
        }));

        setData(scatterData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  if (data.length === 0) {
    return <div>加载中...</div>;
  }

  const config = {
    data,
    xField: "datetime",
    yField: "bright",
    colorField: "bright",
    shapeField: "circle",
    sizeField: 5,
    theme: "dark",
    tooltip: {
      title: () => "火灾发生时间与火点亮温",
      items: [
        {
          channel: "x",
          valueFormatter: (value: number) => {
            const date = new Date(value);
            return `${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
          },
        },
        { channel: "y", valueFormatter: (value: number) => `${value} K` },
      ],
    },
    axis: {
      x: {
        title: "火灾发生时间（全球标准时间 GMT)",
        labelFormatter: (value: number) => {
          const date = new Date(value);
          return `${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
        },
      },

      y: { title: "火点亮温（开尔文）" },
    },
  };

  return (
    <div className="h-96 w-full md:h-[40rem] md:w-3/4">
      <Scatter {...config} />
    </div>
  );
};

export default TimeScatter;

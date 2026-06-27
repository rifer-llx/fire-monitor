"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import AMapLoader from "@amap/amap-jsapi-loader";
import { motion, AnimatePresence } from "framer-motion";
import { throttle } from "lodash";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import "@/app/styles/bg.css";

// 高德地图类型定义
interface AMapBounds {
  southWest: { lat: number; lng: number };
  northEast: { lat: number; lng: number };
}

interface AMapInstance {
  getBounds: () => AMapBounds;
  addControl: (control: AMapControl) => void;
  removeControl: (control: AMapControl) => void;
  add: (overlay: AMapOverlay) => void;
  remove: (overlay: AMapOverlay) => void;
  clearMap: () => void;
  on: (event: string, callback: () => void) => void;
  off: (event: string, callback: () => void) => void;
  setZoomAndCenter: (zoom: number, center: [number, number]) => void;
  setMapStyle: (style: string) => void;
  destroy: () => void;
}

type AMapControl = object;
type AMapPixel = object;

interface AMapOverlay {
  getPosition: () => [number, number];
}

interface AMapMarker extends AMapOverlay {
  on: (event: string, callback: () => void) => void;
}

interface AMapInfoWindow {
  open: (map: AMapInstance, position: [number, number]) => void;
}

interface AMapGeocoderResult {
  regeocode: {
    addressComponent: {
      country: string;
      province: string;
      city: string;
      district: string;
    };
  };
}

interface AMapStatic {
  Map: new (
    container: HTMLElement | string,
    options: {
      viewMode: string;
      zoom: number;
      center: [number, number];
      mapStyle: string;
    }
  ) => AMapInstance;
  Scale: new () => AMapControl;
  ToolBar: new (options?: { position: { top: string; right: string } }) => AMapControl;
  Geolocation: new (options: {
    enableHighAccuracy: boolean;
    timeout: number;
    position: string;
    offset: [number, number];
    zoomToAccuracy: boolean;
  }) => AMapControl;
  Marker: new (options: {
    position: [number, number];
    offset: AMapPixel;
    content: string;
  }) => AMapMarker;
  Pixel: new (x: number, y: number) => AMapPixel;
  InfoWindow: new (options: { content: string; offset: AMapPixel }) => AMapInfoWindow;
  Geocoder: new (options: { radius: number; extensions: string }) => {
    getAddress: (
      coords: number[],
      callback: (status: string, result: AMapGeocoderResult) => void
    ) => void;
  };
}

interface FirePointData {
  longitude: number;
  latitude: number;
  bright_ti4: number;
  bright_ti5: number;
  frp: number;
  acq_date: string;
  acq_time: number;
  confidence: string;
  satellite: string;
  daynight: string;
  ndvi: number;
}

interface GeoJsonFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: FirePointData;
}

interface FirePoint {
  loc: number[];
  district: string;
  confidence: string;
  frp: number;
  bright_ti4: number;
  bright_ti5: number;
  daynight: boolean;
  dateTime: string;
  satellite: string;
  ndvi: number;
}

interface MapState {
  isMapLoaded: boolean;
  showWindLayer: boolean;
}

// 声明 window 扩展
declare global {
  interface Window {
    firelens: {
      mapFlyTo: (data: { latitude: number; longitude: number; frp: number }) => void;
    };
  }
}

const Map = () => {
  const t = useTranslations("map");
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<AMapInstance | null>(null);
  const AMapRef = useRef<AMapStatic | null>(null);
  const markersRef = useRef<AMapMarker[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(true);
  const [mapState, setMapState] = useState<MapState>({
    isMapLoaded: false,
    showWindLayer: false,
  });
  const [firePoint, setFirePoint] = useState<FirePoint | null>(null);
  const [showFirePointId, setShowFirePointId] = useState<string | null>(null);

  // 初始化高德地图
  useEffect(() => {
    if (!mapContainer.current) return;

    AMapLoader.load({
      key: process.env.NEXT_PUBLIC_AMAP_KEY!,
      version: "2.0",
      plugins: [
        "AMap.Scale",
        "AMap.ToolBar",
        "AMap.Geolocation",
        "AMap.Marker",
        "AMap.InfoWindow",
        "AMap.Geocoder",
      ],
    })
      .then((AMap: AMapStatic) => {
        AMapRef.current = AMap;

        mapInstance.current = new AMap.Map(mapContainer.current!, {
          viewMode: "2D",
          zoom: 5,
          center: [116.27, 40],
          mapStyle: "amap://styles/normal", // 标准样式
        });

        // 添加控件
        mapInstance.current.addControl(new AMap.Scale());
        mapInstance.current.addControl(
          new AMap.ToolBar({
            position: {
              top: "110px",
              right: "40px",
            },
          })
        );

        // 添加定位控件
        const geolocation = new AMap.Geolocation({
          enableHighAccuracy: true,
          timeout: 10000,
          position: "RB",
          offset: [10, 20],
          zoomToAccuracy: true,
        });
        mapInstance.current.addControl(geolocation);

        setMapState((prev) => ({ ...prev, isMapLoaded: true }));
        setIsDataLoaded(false);

        console.log("高德地图加载成功");
      })
      .catch((e) => {
        console.error("高德地图加载失败:", e);
      });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy();
      }
    };
  }, []);

  // 加载火点数据
  const fetchData = useCallback(async () => {
    if (!mapInstance.current) return null;

    setIsDataLoaded(true);

    try {
      const bounds = mapInstance.current.getBounds();
      const params = {
        minLat: bounds.southWest.lat,
        maxLat: bounds.northEast.lat,
        minLon: bounds.southWest.lng,
        maxLon: bounds.northEast.lng,
      };

      const response = await fetch(
        `/api/heat?minLng=${params.minLon}&minLat=${params.minLat}&maxLng=${params.maxLon}&maxLat=${params.maxLat}`
      );
      const result = await response.json();

      if (result.success) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.error("获取火点数据失败:", error);
      return null;
    }
  }, []);

  // 渲染火点数据
  const renderData = useCallback(async () => {
    if (!mapInstance.current || !AMapRef.current) return;

    const data = await fetchData();
    if (!data) {
      console.log("No data received");
      return;
    }

    // 清除旧标记
    markersRef.current.forEach((marker) => {
      mapInstance.current!.remove(marker);
    });
    markersRef.current = [];

    // 转换数据格式
    const geojsonData = {
      type: "FeatureCollection",
      features: data.map((point: FirePointData) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [point.longitude, point.latitude],
        },
        properties: point,
      })),
    };

    // 添加火点标记
    geojsonData.features.forEach((feature: GeoJsonFeature) => {
      const properties = feature.properties;
      const coordinates: [number, number] = feature.geometry.coordinates;

      // 创建自定义图标
      const marker = new AMapRef.current!.Marker({
        position: coordinates,
        offset: new AMapRef.current!.Pixel(-10, -10),
        content: `<div style="
          width: 20px;
          height: 20px;
          background: radial-gradient(circle, #ea580c 0%, #c2410c 70%, transparent 100%);
          border-radius: 50%;
          box-shadow: 0 0 10px #ea580c;
          animation: pulse 1.5s ease-in-out infinite;
        "></div>`,
      });

      // 信息窗口
      let dateTime = "N/A";
      try {
        const acqDate = new Date(properties.acq_date);
        if (acqDate instanceof Date && !isNaN(acqDate.getTime()) && properties.acq_time) {
          const hours = Math.floor(properties.acq_time / 100);
          const minutes = properties.acq_time % 100;
          if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            acqDate.setUTCHours(hours, minutes);
            dateTime = format(acqDate, "yyyy-MM-dd HH:mm:ss");
          }
        }
      } catch {
        console.warn("Invalid date format:", properties.acq_date, properties.acq_time);
      }

      const infoContent = `
        <div style="padding: 15px; max-width: 300px;">
          <h3 style="margin-bottom: 10px; font-weight: bold;"> 火点信息</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div><strong>亮温 TI4:</strong></div><div>${properties.bright_ti4}K</div>
            <div><strong>亮温 TI5:</strong></div><div>${properties.bright_ti5}K</div>
            <div><strong>FRP:</strong></div><div>${properties.frp}MW</div>
            <div><strong>置信度:</strong></div><div>${properties.confidence}</div>
            <div><strong>卫星:</strong></div><div>${properties.satellite}</div>
            <div><strong>时间:</strong></div><div>${dateTime}</div>
            <div><strong>NDVI:</strong></div><div>${(properties.ndvi / 10000).toFixed(2)}</div>
          </div>
        </div>
      `;

      const infoWindow = new AMapRef.current!.InfoWindow({
        content: infoContent,
        offset: new AMapRef.current!.Pixel(0, -30),
      });

      marker.on("click", () => {
        infoWindow.open(mapInstance.current!, marker.getPosition());

        // 更新火点状态
        setFirePoint({
          loc: coordinates,
          district: "",
          confidence: properties.confidence,
          frp: properties.frp,
          bright_ti4: properties.bright_ti4,
          bright_ti5: properties.bright_ti5,
          daynight: properties.daynight === "D",
          dateTime: dateTime,
          satellite: properties.satellite,
          ndvi: properties.ndvi / 10000,
        });
        setShowFirePointId(String(properties.bright_ti4));

        // 飞到该点
        mapInstance.current!.setZoomAndCenter(9, coordinates);
      });

      markersRef.current.push(marker);
      mapInstance.current!.add(marker);
    });

    setIsDataLoaded(false);
  }, [fetchData]);

  // throttle 函数用 useRef 存储
  const throttledRenderDataRef = useRef<ReturnType<typeof throttle> | null>(null);

  useEffect(() => {
    throttledRenderDataRef.current = throttle(() => {
      renderData();
    }, 500);
  }, [renderData]);

  const updateOnMove = useCallback(() => {
    throttledRenderDataRef.current?.();
  }, []);

  // 地图加载后挂载渲染火点逻辑
  useEffect(() => {
    if (!mapInstance.current) return;
    renderData();
    mapInstance.current.on("moveend", updateOnMove);
    mapInstance.current.on("zoomend", updateOnMove);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.off("moveend", updateOnMove);
        mapInstance.current.off("zoomend", updateOnMove);
      }
    };
  }, [mapState.isMapLoaded, renderData, updateOnMove]);

  // 逆向地理编码
  useEffect(() => {
    if (!firePoint?.loc || !AMapRef.current) return;

    const getDistrict = async () => {
      try {
        const geocoder = new AMapRef.current!.Geocoder({
          radius: 1000,
          extensions: "all",
        });

        geocoder.getAddress(firePoint.loc, (status: string, result: AMapGeocoderResult) => {
          if (status === "complete" && result.regeocode) {
            const addressComponent = result.regeocode.addressComponent;
            const district = `${addressComponent.country || ""} ${addressComponent.province || ""} ${addressComponent.city || ""} ${addressComponent.district || ""}`;

            setFirePoint((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                district: district.trim(),
              };
            });
          }
        });
      } catch (error) {
        console.error("逆地理编码错误:", error);
      }
    };

    getDistrict();
  }, [firePoint?.loc]);

  // 监听图表点击事件
  useEffect(() => {
    const handleChartFlyTo = (
      event: CustomEvent<{ latitude: number; longitude: number; frp: number }>
    ) => {
      if (!mapInstance.current) return;
      const { latitude, longitude, frp } = event.detail;

      const zoom = frp > 30 ? 12 : frp > 15 ? 10 : 9;

      mapInstance.current.setZoomAndCenter(zoom, [longitude, latitude]);
    };

    window.addEventListener("firelens:map-fly-to", handleChartFlyTo as EventListener);
    return () => {
      window.removeEventListener("firelens:map-fly-to", handleChartFlyTo as EventListener);
    };
  }, []);

  // 底图切换
  useEffect(() => {
    if (!mapInstance.current || !mapState.isMapLoaded) return;

    if (mapState.showWindLayer) {
      mapInstance.current.setMapStyle("amap://styles/dark");
    } else {
      mapInstance.current.setMapStyle("amap://styles/normal");
    }
  }, [mapState.showWindLayer, mapState.isMapLoaded]);

  return (
    <>
      {/* 地图容器 */}
      <div ref={mapContainer} className="left-0 h-screen w-screen" />

      {/* 底图切换按钮 */}
      <button
        className="absolute left-0 top-32 z-50 h-24 w-24 cursor-pointer"
        onClick={() =>
          setMapState((prev) => ({
            ...prev,
            showWindLayer: !prev.showWindLayer,
          }))
        }
      >
        <div className="h-full w-full rounded-r-full bg-gradient-to-r from-slate-900/90 via-gray-800 to-slate-700/80 backdrop-blur-sm transition-all duration-300 hover:from-slate-800 hover:to-slate-600">
          <div className="flex h-full w-full items-center justify-center">
            {mapState.showWindLayer ? (
              <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="5" fill="#fcd34d" />
                <circle cx="12" cy="12" r="3" fill="#fbbf24" />
              </svg>
            ) : (
              <svg className="h-12 w-12 text-slate-300" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="5" fill="#1e3a5f" />
                <circle cx="12" cy="12" r="3" fill="#0c4a6e" />
              </svg>
            )}
          </div>
        </div>
      </button>

      {/* 火点详情弹窗 */}
      <AnimatePresence>
        {showFirePointId && firePoint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed bottom-20 right-4 z-40 max-w-sm rounded-xl bg-white/90 p-6 shadow-2xl backdrop-blur-md dark:bg-gray-900/90 md:right-8"
          >
            <motion.div className="space-y-3">
              <motion.h3
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-lg font-bold text-orange-600"
              >
                <span className="text-2xl">🔥</span>
                {t("firePoint.title")}
              </motion.h3>

              <motion.ul
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.08 } },
                }}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="mt-2 space-y-1.5 font-semibold text-gray-950 dark:text-gray-400"
              >
                {[
                  `${t("firePoint.district")}：${firePoint.district}`,
                  `${t("firePoint.coordinates")}：${firePoint.loc.map((c) => c.toFixed(2)).join(", ")}`,
                  `${t("firePoint.confidence")}：${firePoint.confidence}`,
                  `${t("firePoint.brightTi4")}：${firePoint.bright_ti4}`,
                  `${t("firePoint.brightTi5")}：${firePoint.bright_ti5}`,
                  `${t("firePoint.frp")}：${firePoint.frp}`,
                  `${t("firePoint.ndvi")}：${firePoint.ndvi}`,
                  `${t("firePoint.dateTime")}：${firePoint.dateTime}`,
                  `${t("firePoint.dayNight")}：${firePoint.daynight ? t("firePoint.day") : t("firePoint.night")}`,
                  `${t("firePoint.satellite")}：${firePoint.satellite}`,
                  `${t("firePoint.dataSource")}：${t("firePoint.dataSourceValue")}`,
                ].map((item, index) => (
                  <motion.li
                    key={index}
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      visible: { opacity: 1, x: 0 },
                      exit: { opacity: 0, x: -10 },
                    }}
                    transition={{ duration: 0.25 }}
                  >
                    {item}
                  </motion.li>
                ))}
              </motion.ul>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFirePointId(null)}
                className="mt-4 w-full rounded-lg bg-gradient-to-r from-orange-600 to-red-700 py-2 font-bold text-white shadow-lg transition-all hover:from-orange-500 hover:to-red-600"
              >
                {t("firePoint.close")}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 加载指示器 */}
      {isDataLoaded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50">
          <div
            style={{
              borderTopColor: "transparent",
            }}
            className="h-12 w-12 animate-spin rounded-full border-4 border-orange-700/80"
          />
        </div>
      )}
    </>
  );
};

export default Map;

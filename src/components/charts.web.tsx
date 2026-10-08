import { useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { C, Txt } from "./ui";

function useChartLayout() {
  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => subscription.remove();
  }, []);
  return {
    width,
    reduceMotion,
    onLayout: (event: import("react-native").LayoutChangeEvent) =>
      setWidth(Math.floor(event.nativeEvent.layout.width)),
  };
}

const tooltipStyle = {
  border: `1px solid ${C.line}`,
  borderRadius: 14,
  backgroundColor: C.white,
  boxShadow: "0 8px 28px rgba(52, 60, 53, 0.12)",
  fontFamily: "Nunito_600SemiBold",
  fontSize: 12,
};

export function CalorieDonut({
  value,
  target,
  size = 172,
}: {
  value: number;
  target: number;
  size?: number;
}) {
  const { reduceMotion } = useChartLayout();
  const safeTarget = Math.max(1, target);
  const percent = Math.min(100, Math.round((value / safeTarget) * 100));
  const consumed = Math.min(value, safeTarget);
  const remaining = Math.max(0, safeTarget - consumed);
  const over = value > safeTarget;
  const data = [
    { name: "Dikonsumsi", value: Math.max(consumed, 0.01) },
    { name: "Tersisa", value: Math.max(remaining, 0.01) },
  ];

  return (
    <View style={{ alignItems: "center", paddingVertical: 4 }}>
      <View
        accessibilityLabel={`${Math.round(value)} dari ${target} kilokalori`}
        style={{
          width: size,
          height: size,
          position: "relative",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
          <PieChart width={size} height={size}>
            <defs>
              <linearGradient id="calorieProgress" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={over ? "#D59099" : "#77A081"} />
                <stop offset="100%" stopColor={over ? C.rose : C.green} />
              </linearGradient>
            </defs>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              startAngle={90}
              endAngle={-270}
              innerRadius={size * 0.37}
              outerRadius={size * 0.47}
              paddingAngle={1.5}
              cornerRadius={11}
              stroke="none"
              isAnimationActive={!reduceMotion}
              animationDuration={250}
              animationEasing="ease-out"
            >
              <Cell fill="url(#calorieProgress)" />
              <Cell fill="#EDF0E8" />
            </Pie>
          </PieChart>
        </div>
        <View
          pointerEvents="none"
          style={{ alignItems: "center", justifyContent: "center", gap: 2 }}
        >
          <Txt bold size={30} style={{ fontVariant: ["tabular-nums"] }}>
            {Math.round(value).toLocaleString("id-ID")}
          </Txt>
          <Txt size={12} color={C.muted}>
            kkal tercatat
          </Txt>
          <View
            style={{
              marginTop: 4,
              borderRadius: 99,
              paddingHorizontal: 10,
              paddingVertical: 3,
              backgroundColor: over ? C.pink : C.mint,
            }}
          >
            <Txt size={11} bold color={over ? C.rose : C.green}>
              {over ? "TERLEWATI" : `${percent}%`}
            </Txt>
          </View>
        </View>
      </View>
    </View>
  );
}

export function CaloriesBarChart({
  values,
  labels,
  target,
}: {
  values: (number | null)[];
  labels: string[];
  target: number;
}) {
  const { width: chartWidth, onLayout, reduceMotion } = useChartLayout();
  const data = useMemo(
    () =>
      values.map((value, index) => ({
        label: labels[index],
        value,
        fill:
          index === values.length - 1
            ? C.green
            : value !== null && value > target
              ? C.rose
              : "#B9CCB1",
      })),
    [labels, target, values],
  );

  return (
    <View onLayout={onLayout} style={{ width: "100%", height: 190 }}>
      {chartWidth > 0 && (
        <BarChart
          width={chartWidth}
          height={190}
          data={data}
          margin={{ top: 12, right: 4, left: -28, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="#ECECE4"
            strokeDasharray="4 5"
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            tick={{
              fill: C.muted,
              fontSize: 11,
              fontFamily: "Nunito_600SemiBold",
            }}
          />
          <YAxis
            domain={[
              0,
              Math.ceil(
                Math.max(target, ...values.map((value) => value ?? 0), 1) / 200,
              ) * 200,
            ]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: C.muted, fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: "rgba(66,108,80,0.06)", radius: 8 }}
            contentStyle={tooltipStyle}
            formatter={(amount) => [
              `${Math.round(Number(amount)).toLocaleString("id-ID")} kkal`,
              "Kalori",
            ]}
          />
          <ReferenceLine
            y={target}
            stroke="#9EAA97"
            strokeDasharray="5 5"
            label={{
              value: "Target",
              fill: C.green,
              fontSize: 11,
              position: "insideTopRight",
            }}
          />
          <Bar
            dataKey="value"
            radius={[6, 6, 0, 0]}
            maxBarSize={28}
            isAnimationActive={!reduceMotion}
            animationDuration={250}
          >
            {data.map((item, index) => (
              <Cell key={index} fill={item.fill} />
            ))}
          </Bar>
        </BarChart>
      )}
    </View>
  );
}

export function WeightLineChart({
  values,
  labels,
  target,
}: {
  values: number[];
  labels: string[];
  target: number;
}) {
  const { width: chartWidth, onLayout, reduceMotion } = useChartLayout();
  const data = values.map((value, index) => ({
    label: labels[index],
    value,
  }));
  const minimum = Math.min(target, ...values) - 1;
  const maximum = Math.max(target, ...values) + 1;

  return (
    <View onLayout={onLayout} style={{ width: "100%", height: 190 }}>
      {chartWidth > 0 && (
        <AreaChart
          width={chartWidth}
          height={190}
          data={data}
          margin={{ top: 14, right: 8, left: -25, bottom: 0 }}
        >
          <defs>
            <linearGradient id="weightArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#82A789" stopOpacity={0.42} />
              <stop offset="100%" stopColor="#82A789" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="#E7ECE3"
            strokeDasharray="4 5"
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            padding={{ left: 8, right: 16 }}
            interval="preserveStartEnd"
            tick={{
              fill: C.muted,
              fontSize: 11,
              fontFamily: "Nunito_600SemiBold",
            }}
          />
          <YAxis
            domain={[minimum, maximum]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: C.muted, fontSize: 11 }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(amount) => [`${Number(amount).toFixed(1)} kg`, "Berat"]}
          />
          <ReferenceLine
            y={target}
            stroke="#91A484"
            strokeDasharray="5 5"
            label={{ value: "Target", fill: C.green, fontSize: 11 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="none"
            fill="url(#weightArea)"
            isAnimationActive={!reduceMotion}
            animationDuration={250}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={C.green}
            strokeWidth={3}
            dot={{ fill: C.white, stroke: C.green, strokeWidth: 3, r: 4 }}
            activeDot={{ fill: C.green, stroke: C.white, strokeWidth: 3, r: 6 }}
            isAnimationActive={!reduceMotion}
            animationDuration={250}
          />
        </AreaChart>
      )}
    </View>
  );
}

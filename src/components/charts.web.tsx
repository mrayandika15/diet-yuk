import { useMemo } from "react";
import { useWindowDimensions, View } from "react-native";
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
}: {
  value: number;
  target: number;
}) {
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
          width: 222,
          height: 222,
          position: "relative",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
          <PieChart width={222} height={222}>
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
              innerRadius={78}
              outerRadius={101}
              paddingAngle={1.5}
              cornerRadius={11}
              stroke="none"
              isAnimationActive
              animationDuration={700}
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
          <Txt bold size={38}>
            {Math.round(value).toLocaleString("id-ID")}
          </Txt>
          <Txt size={11} color={C.muted}>
            dari {target.toLocaleString("id-ID")} kkal
          </Txt>
          <View
            style={{
              marginTop: 8,
              borderRadius: 99,
              paddingHorizontal: 10,
              paddingVertical: 5,
              backgroundColor: over ? C.pink : C.mint,
            }}
          >
            <Txt size={10} bold color={over ? C.rose : C.green}>
              {over ? "TARGET TERLEWATI" : `${percent}% TARGET`}
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
  values: number[];
  labels: string[];
  target: number;
}) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(260, Math.min(width - 92, 520));
  const data = useMemo(
    () =>
      values.map((value, index) => ({
        label: labels[index],
        value,
        fill:
          index === values.length - 1
            ? C.green
            : value > target
              ? C.rose
              : "#B9CCB1",
      })),
    [labels, target, values],
  );

  return (
    <View style={{ width: "100%", height: 190 }}>
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
          tick={{
            fill: C.muted,
            fontSize: 10,
            fontFamily: "Nunito_600SemiBold",
          }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: C.muted, fontSize: 9 }}
        />
        <Tooltip
          cursor={{ fill: "rgba(66,108,80,0.06)", radius: 8 }}
          contentStyle={tooltipStyle}
          formatter={(amount) => [
            `${Math.round(Number(amount)).toLocaleString("id-ID")} kkal`,
            "Kalori",
          ]}
        />
        <ReferenceLine y={target} stroke="#9EAA97" strokeDasharray="5 5" />
        <Bar dataKey="value" radius={[8, 8, 8, 8]} maxBarSize={28}>
          {data.map((item) => (
            <Cell key={item.label} fill={item.fill} />
          ))}
        </Bar>
      </BarChart>
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
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(260, Math.min(width - 92, 520));
  const data = values.map((value, index) => ({
    label: labels[index],
    value,
  }));
  const minimum = Math.min(target, ...values) - 1;
  const maximum = Math.max(target, ...values) + 1;

  return (
    <View style={{ width: "100%", height: 190 }}>
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
          tick={{
            fill: C.muted,
            fontSize: 10,
            fontFamily: "Nunito_600SemiBold",
          }}
        />
        <YAxis
          domain={[minimum, maximum]}
          axisLine={false}
          tickLine={false}
          tick={{ fill: C.muted, fontSize: 9 }}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(amount) => [`${Number(amount).toFixed(1)} kg`, "Berat"]}
        />
        <ReferenceLine
          y={target}
          stroke="#91A484"
          strokeDasharray="5 5"
          label={{ value: "Target", fill: C.green, fontSize: 10 }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="none"
          fill="url(#weightArea)"
          isAnimationActive
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={C.green}
          strokeWidth={3}
          dot={{ fill: C.white, stroke: C.green, strokeWidth: 3, r: 4 }}
          activeDot={{ fill: C.green, stroke: C.white, strokeWidth: 3, r: 6 }}
          isAnimationActive
        />
      </AreaChart>
    </View>
  );
}

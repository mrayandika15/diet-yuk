import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../../src/state/AppContext";
import {
  dayKey,
  countdown,
  total,
  mealTypes,
  mealLabels,
  streak,
} from "../../src/lib/domain";
import {
  Page,
  Card,
  Txt,
  Row,
  C,
  Icon,
  Button,
  Notice,
} from "../../src/components/ui";
import { CalorieDonut } from "../../src/components/charts";
import { companionName } from "../../src/lib/personal";

export default function Home() {
  const app = useApp();
  const partnerName = app.partner?.name || companionName(app.profile.name);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const todays = app.meals.filter((m) => m.date === dayKey());
  const totals = total(todays.flatMap((m) => m.items));
  const days = countdown(app.partner?.weddingDate ?? app.profile.weddingDate);
  const remaining = app.profile.calorieTarget - totals.calories;
  const macros = [
    {
      label: "Protein",
      value: totals.protein_g,
      target: app.profile.targetWeight * 1.6,
      color: "#6B8CAF",
    },
    {
      label: "Karbo",
      value: totals.carbs_g,
      target: Math.max(
        1,
        (app.profile.calorieTarget * 0.75 -
          app.profile.targetWeight * 1.6 * 4) /
          4,
      ),
      color: "#B88A4E",
    },
    {
      label: "Lemak",
      value: totals.fat_g,
      target: (app.profile.calorieTarget * 0.25) / 9,
      color: "#A287AC",
    },
  ];
  async function cheer(emoji: string) {
    if (sending) return;
    setSending(true);
    try {
      await app.sendCheer(emoji);
      setMessage("Semangat terkirim " + emoji);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSending(false);
    }
  }
  return (
    <Page refresh={() => app.reload().catch(() => {})} tabs>
      <Row>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt size={12} color={C.muted}>
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "Asia/Jakarta",
            })}
          </Txt>
          <Txt size={28} bold accessibilityRole="header">
            Halo, {app.profile.name} ☀️
          </Txt>
        </View>
        <View
          accessibilityLabel={`${streak(app.meals)} hari berturut-turut`}
          style={{
            backgroundColor: C.peach,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 16,
          }}
        >
          <Txt bold size={14}>
            🔥 {streak(app.meals)}
          </Txt>
        </View>
      </Row>
      <Notice text={app.error} error />
      <Card>
        <Row>
          <Txt size={18} bold>
            Kalori hari ini
          </Txt>
          <Txt size={12} color={C.muted}>
            Estimasi
          </Txt>
        </Row>
        <Row style={{ gap: 10 }}>
          <CalorieDonut
            value={totals.calories}
            target={app.profile.calorieTarget}
            size={164}
          />
          <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
            <View style={{ gap: 2 }}>
              <Txt size={13} color={C.muted}>
                {remaining >= 0 ? "Sisa hari ini" : "Di atas target"}
              </Txt>
              <Txt
                size={26}
                bold
                color={remaining >= 0 ? C.green : C.rose}
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {Math.round(Math.abs(remaining)).toLocaleString("id-ID")}
              </Txt>
              <Txt size={12} color={C.muted}>
                kkal
              </Txt>
            </View>
            <View style={{ gap: 2 }}>
              <Txt size={12} color={C.muted}>
                Target harian
              </Txt>
              <Txt size={14} bold>
                {app.profile.calorieTarget.toLocaleString("id-ID")} kkal
              </Txt>
            </View>
          </View>
        </Row>
        {remaining < 0 && (
          <Txt size={13} color={C.rose}>
            Tetap catat dengan tenang. Target ini panduan awalmu.
          </Txt>
        )}
        <Row
          style={{
            gap: 14,
            borderTopWidth: 1,
            borderTopColor: C.line,
            paddingTop: 14,
          }}
        >
          {macros.map((m) => (
            <View key={m.label} style={{ flex: 1, minWidth: 0, gap: 6 }}>
              <Txt size={12} color={C.muted}>
                {m.label}
              </Txt>
              <Txt bold size={15}>
                {Math.round(m.value)}{" "}
                <Txt size={12} color={C.muted}>
                  g
                </Txt>
              </Txt>
              <View
                style={{
                  height: 5,
                  backgroundColor: C.line,
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 5,
                    backgroundColor: m.color,
                    width: `${Math.min(100, (m.value / m.target) * 100)}%`,
                  }}
                />
              </View>
            </View>
          ))}
        </Row>
      </Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Foto makanan untuk dicatat"
        onPress={() => router.push("/add-meal?photoOnly=1")}
        style={({ pressed }) => ({
          borderRadius: 20,
          backgroundColor: C.green,
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          opacity: pressed ? 0.82 : 1,
        })}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: "rgba(255,253,252,.14)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="camera" color={C.white} size={25} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt size={17} bold color={C.white}>
            Foto makananmu
          </Txt>
          <Txt size={13} color="#E7EFDF">
            Foto, cek porsi, lalu simpan.
          </Txt>
        </View>
        <Icon name="next" color={C.white} size={18} />
      </Pressable>
      <Row style={{ justifyContent: "center", gap: 6 }}>
        <Icon name="heart" color={C.rose} size={16} />
        <Txt size={13} color={C.muted}>
          {Math.max(0, days)} hari menuju hari kita
        </Txt>
      </Row>
      <View style={{ gap: 12 }}>
        <Row>
          <Txt size={20} bold>
            Makan hari ini
          </Txt>
          <Txt size={12} color={C.muted}>
            {todays.length} catatan
          </Txt>
        </Row>
        <Card style={{ paddingVertical: 4 }}>
          {mealTypes.map((type, index) => {
            const meals = todays.filter((m) => m.type === type);
            return (
              <View
                key={type}
                style={{
                  paddingVertical: 14,
                  gap: 6,
                  ...(index
                    ? { borderTopWidth: 1, borderTopColor: C.line }
                    : {}),
                }}
              >
                <Row style={{ gap: 12 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: [C.peach, C.mint, C.pink, "#EFEAF4"][
                        index
                      ],
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Txt size={21}>{["🍳", "🥗", "🍲", "🍎"][index]}</Txt>
                  </View>
                  <Txt bold style={{ flex: 1 }} size={15}>
                    {mealLabels[type]}
                  </Txt>
                  <Txt size={13} color={C.muted}>
                    {meals.length
                      ? `${Math.round(total(meals.flatMap((m) => m.items)).calories)} kkal`
                      : "Belum dicatat"}
                  </Txt>
                </Row>
                {meals.map((meal) => (
                  <Pressable
                    key={meal.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${mealLabels[type]}: ${meal.items.map((item) => item.name).join(", ")}`}
                    onPress={() =>
                      router.push({
                        pathname: "/add-meal",
                        params: { id: meal.id },
                      })
                    }
                    style={({ pressed }) => ({
                      minHeight: 44,
                      justifyContent: "center",
                      paddingLeft: 50,
                      opacity: pressed ? 0.65 : 1,
                    })}
                  >
                    <Row>
                      <Txt
                        size={13}
                        color={C.muted}
                        style={{ flex: 1 }}
                        numberOfLines={2}
                      >
                        {meal.items.map((item) => item.name).join(" · ")}
                      </Txt>
                      <Icon name="next" size={16} />
                    </Row>
                  </Pressable>
                ))}
              </View>
            );
          })}
        </Card>
      </View>
      <Card color={C.pink}>
        <Row>
          <View style={{ flex: 1, gap: 3 }}>
            <Txt size={12} bold color={C.rose}>
              KITA BERDUA
            </Txt>
            <Txt size={20} bold>
              {partnerName}
            </Txt>
            <Txt size={13} color={C.rose}>
              {app.partner?.name && app.partner.ready !== false
                ? `${Math.round(app.partner.calories).toLocaleString("id-ID")} dari ${app.partner.target.toLocaleString("id-ID")} kkal hari ini`
                : `${partnerName} terhubung otomatis. Progresnya muncul setelah profil selesai.`}
            </Txt>
          </View>
          <Icon name="heart" color={C.rose} size={30} />
        </Row>
        {app.partner?.name && app.partner.ready !== false ? (
          <Row>
            {["❤️", "💪", "🥗", "🔥"].map((emoji) => (
              <Pressable
                key={emoji}
                accessibilityRole="button"
                accessibilityLabel={"Kirim semangat " + emoji}
                disabled={sending}
                onPress={() => void cheer(emoji)}
                style={({ pressed }) => ({
                  minHeight: 48,
                  backgroundColor: C.white,
                  borderRadius: 14,
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: sending ? 0.5 : pressed ? 0.7 : 1,
                })}
              >
                <Txt size={23}>{emoji}</Txt>
              </Pressable>
            ))}
          </Row>
        ) : null}
        {!!app.cheer && (
          <Txt size={13}>Semangat dari pasangan: {app.cheer}</Txt>
        )}
        <Notice text={message} />
      </Card>
    </Page>
  );
}

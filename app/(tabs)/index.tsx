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
  const todays = app.meals.filter((m) => m.date === dayKey());
  const totals = total(todays.flatMap((m) => m.items));
  const days = countdown(app.partner?.weddingDate ?? app.profile.weddingDate);
  const macros = [
    {
      label: "Protein",
      value: totals.protein_g,
      target: app.profile.targetWeight * 1.6,
      color: "#789EC0",
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
      color: "#CDA66E",
    },
    {
      label: "Lemak",
      value: totals.fat_g,
      target: (app.profile.calorieTarget * 0.25) / 9,
      color: "#B69DBB",
    },
  ];
  return (
    <Page refresh={() => app.reload().catch(() => {})} bottom={132}>
      <Row>
        <View>
          <Txt size={11} bold color={C.muted} style={{ letterSpacing: 1.5 }}>
            {new Date()
              .toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: "Asia/Jakarta",
              })
              .toUpperCase()}
          </Txt>
          <Txt size={29} bold>
            Halo, {app.profile.name} <Txt size={25}>☀️</Txt>
          </Txt>
        </View>
        <View
          style={{ backgroundColor: C.peach, padding: 12, borderRadius: 18 }}
        >
          <Txt bold size={13}>
            🔥 {streak(app.meals)}
          </Txt>
        </View>
      </Row>
      <Notice text={app.error} error />
      <Card color={C.mint} style={{ padding: 16 }}>
        <Row>
          <View style={{ flex: 1, gap: 5 }}>
            <Txt size={10} bold color={C.green} style={{ letterSpacing: 1.7 }}>
              RAKA & ANGGUN
            </Txt>
            <Txt size={23} bold>
              {days} <Txt size={14}>hari menuju hari kita</Txt>
            </Txt>
            <Txt size={12} color={C.green}>
              Sehat bareng, satu hari sekaligus.
            </Txt>
          </View>
        </Row>
      </Card>
      <Card>
        <Row>
          <Txt size={18} bold>
            Kalori hari ini
          </Txt>
        </Row>
        <CalorieDonut
          value={totals.calories}
          target={app.profile.calorieTarget}
        />
        <Txt size={13} color={C.muted} style={{ textAlign: "center" }}>
          {totals.calories <= app.profile.calorieTarget
            ? `${Math.round(app.profile.calorieTarget - totals.calories).toLocaleString("id-ID")} kkal menuju target hari ini`
            : "Target hari ini terlewati. Besok kita lanjut lagi 🌷"}
        </Txt>
        <Row style={{ marginTop: 9 }}>
          {macros.map((m) => (
            <View key={m.label} style={{ flex: 1, gap: 6 }}>
              <Txt size={12} color={C.muted}>
                {m.label}
              </Txt>
              <Txt bold size={15}>
                {Math.round(m.value)}{" "}
                <Txt color={C.muted} size={11}>
                  / {Math.round(m.target)} g
                </Txt>
              </Txt>
              <View
                style={{
                  height: 5,
                  backgroundColor: C.line,
                  borderRadius: 10,
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
        onPress={() => router.push("/add-meal?camera=1")}
        style={({ pressed }) => ({
          borderRadius: 22,
          backgroundColor: C.green,
          padding: 18,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: pressed ? 0.82 : 1,
        })}
      >
        <View style={{ gap: 3 }}>
          <Txt size={11} bold color="#DDEADB" style={{ letterSpacing: 1.2 }}>
            CATAT MAKAN
          </Txt>
          <Txt size={18} bold color={C.white}>
            Foto piringmu
          </Txt>
          <Txt size={12} color="#DDEADB">
            Foto → cek hasil → simpan
          </Txt>
        </View>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 17,
            backgroundColor: "rgba(255,255,255,0.16)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="camera" color={C.white} size={25} />
        </View>
      </Pressable>
      <View style={{ gap: 12 }}>
        <Row>
          <Txt size={21} bold>
            Menu hari ini
          </Txt>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/add-meal")}
            style={{ padding: 8 }}
          >
            <Txt color={C.green} bold size={13}>
              + Tambah
            </Txt>
          </Pressable>
        </Row>
        {mealTypes.map((type, i) => {
          const list = todays.filter((m) => m.type === type);
          return (
            <Card key={type} style={{ padding: 16, borderRadius: 20 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: "/add-meal", params: { type } })
                }
              >
                <Row>
                  <Row>
                    <View
                      style={{
                        padding: 11,
                        borderRadius: 15,
                        backgroundColor: [C.peach, C.mint, C.pink, "#EFEAF4"][
                          i
                        ],
                      }}
                    >
                      <Txt size={21}>{["🍳", "🥗", "🍲", "🍎"][i]}</Txt>
                    </View>
                    <View>
                      <Txt bold>{mealLabels[type]}</Txt>
                      <Txt size={12} color={C.muted}>
                        {list.length
                          ? `${Math.round(total(list.flatMap((m) => m.items)).calories)} kkal`
                          : "Belum dicatat"}
                      </Txt>
                    </View>
                  </Row>
                  <Icon name="plus" size={19} />
                </Row>
              </Pressable>
              {list.map((m) => (
                <Pressable
                  accessibilityRole="button"
                  key={m.id}
                  onPress={() =>
                    router.push({ pathname: "/add-meal", params: { id: m.id } })
                  }
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: C.line,
                    paddingTop: 10,
                  }}
                >
                  <Row>
                    <Txt size={13} style={{ flex: 1 }} numberOfLines={2}>
                      {m.items.map((i) => i.name).join(" · ")}
                    </Txt>
                    <Txt size={12} color={C.muted}>
                      {Math.round(total(m.items).calories)} →
                    </Txt>
                  </Row>
                </Pressable>
              ))}
            </Card>
          );
        })}
      </View>
      <Card color={C.pink}>
        <Row>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt size={11} bold color={C.rose}>
              KITA BERDUA
            </Txt>
            <Txt size={20} bold>
              {partnerName}
            </Txt>
            <Txt size={13} color={C.rose}>
              {app.partner?.name
                ? `${Math.round(app.partner.calories)} / ${app.partner.target} kkal hari ini`
                : `Hubungkan akun untuk melihat kabar ${partnerName}.`}
            </Txt>
          </View>
          <Icon name="heart" color={C.rose} size={34} />
        </Row>
        {app.partner?.name ? (
          <Row>
            {["❤️", "💪", "🥗", "🔥"].map((emoji) => (
              <Pressable
                key={emoji}
                accessibilityRole="button"
                accessibilityLabel={"Kirim semangat " + emoji}
                onPress={() =>
                  void app
                    .sendCheer(emoji)
                    .then(() => setMessage("Semangat terkirim " + emoji))
                    .catch((e) => setMessage(e.message))
                }
                style={{
                  backgroundColor: "#FFF6F6",
                  padding: 12,
                  borderRadius: 15,
                  flex: 1,
                  alignItems: "center",
                }}
              >
                <Txt size={23}>{emoji}</Txt>
              </Pressable>
            ))}
          </Row>
        ) : (
          <Button
            title={`Hubungkan dengan ${partnerName}`}
            onPress={() => router.push("/(tabs)/settings")}
            variant="ghost"
          />
        )}
        {!!app.cheer && (
          <Txt size={13}>Semangat terbaru dari pasangan: {app.cheer}</Txt>
        )}
        <Notice text={message} />
      </Card>
      <Txt size={12} color={C.muted} style={{ textAlign: "center" }}>
        Raka & Anggun ♡
      </Txt>
    </Page>
  );
}

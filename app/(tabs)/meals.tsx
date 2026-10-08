import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../../src/state/AppContext";
import { dayKey, mealLabels, total } from "../../src/lib/domain";
import {
  C,
  Card,
  Empty,
  Field,
  Heading,
  Icon,
  Page,
  Row,
  Txt,
} from "../../src/components/ui";

export default function Meals() {
  const app = useApp();
  const [query, setQuery] = useState("");
  const meals = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("id-ID");
    return [...app.meals]
      .filter(
        (meal) =>
          !needle ||
          meal.items.some((item) =>
            item.name.toLocaleLowerCase("id-ID").includes(needle),
          ),
      )
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          b.createdAt.localeCompare(a.createdAt),
      );
  }, [app.meals, query]);

  const today = app.meals.filter((meal) => meal.date === dayKey());
  const todayTotal = total(today.flatMap((meal) => meal.items));

  return (
    <Page refresh={() => app.reload().catch(() => {})} bottom={132}>
      <Heading
        eyebrow="Semua yang sudah dicatat"
        title="Catatan makan."
        subtitle="Cari, buka kembali, lalu sesuaikan kapan saja."
      />

      <Card color={C.mint}>
        <Row>
          <View style={{ gap: 3 }}>
            <Txt size={11} bold color={C.green} style={{ letterSpacing: 1.3 }}>
              HARI INI
            </Txt>
            <Txt size={30} bold>
              {Math.round(todayTotal.calories)} <Txt size={14}>kkal</Txt>
            </Txt>
            <Txt size={12} color={C.green}>
              {today.length} catatan ·{" "}
              {today.flatMap((meal) => meal.items).length} item
            </Txt>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tambah makanan"
            onPress={() => router.push("/add-meal")}
            style={({ pressed }) => ({
              width: 52,
              height: 52,
              borderRadius: 18,
              backgroundColor: C.green,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Icon name="plus" color={C.white} size={25} />
          </Pressable>
        </Row>
      </Card>

      <Field
        label="Cari di catatan"
        placeholder="Contoh: nasi, ayam, kopi…"
        value={query}
        onChangeText={setQuery}
      />

      <View style={{ gap: 11 }}>
        {meals.length ? (
          meals.map((meal) => {
            const mealTotal = total(meal.items);
            return (
              <Pressable
                key={meal.id}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: "/add-meal",
                    params: { id: meal.id },
                  })
                }
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Card style={{ padding: 16, borderRadius: 20 }}>
                  <Row>
                    <View
                      style={{
                        width: 45,
                        height: 45,
                        borderRadius: 15,
                        backgroundColor:
                          meal.date === dayKey() ? C.peach : C.mint,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Txt size={21}>
                        {
                          {
                            breakfast: "🍳",
                            lunch: "🥗",
                            dinner: "🍲",
                            snack: "🍎",
                          }[meal.type]
                        }
                      </Txt>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Row>
                        <Txt bold>{mealLabels[meal.type]}</Txt>
                        <Txt size={12} color={C.muted}>
                          {meal.date === dayKey() ? "Hari ini" : meal.date}
                        </Txt>
                      </Row>
                      <Txt size={13} color={C.muted} numberOfLines={2}>
                        {meal.items.map((item) => item.name).join(" · ")}
                      </Txt>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Txt bold>{Math.round(mealTotal.calories)}</Txt>
                      <Txt size={10} color={C.muted}>
                        kkal
                      </Txt>
                    </View>
                  </Row>
                </Card>
              </Pressable>
            );
          })
        ) : (
          <Card>
            <Empty
              icon={query ? "🔎" : "🥣"}
              title={query ? "Belum ketemu" : "Catatanmu masih kosong"}
              body={
                query
                  ? "Coba kata yang lebih singkat atau nama makanan lain."
                  : "Tekan tombol tambah di bawah untuk membuat catatan pertama."
              }
            />
          </Card>
        )}
      </View>
    </Page>
  );
}

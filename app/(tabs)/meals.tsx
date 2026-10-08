import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../../src/state/AppContext";
import { FoodImage } from "../../src/components/FoodImage";
import { dayKey, daysAgo, mealLabels, total } from "../../src/lib/domain";
import {
  Button,
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

function dateLabel(date: string) {
  if (date === dayKey()) return "Hari ini";
  if (date === daysAgo(1)) return "Kemarin";
  return new Date(date + "T12:00:00+07:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}
export default function Meals() {
  const app = useApp();
  const [query, setQuery] = useState("");
  const groups = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("id-ID");
    const meals = [...app.meals]
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
    const result: { date: string; meals: typeof meals }[] = [];
    for (const meal of meals) {
      let group = result.at(-1);
      if (!group || group.date !== meal.date) {
        group = { date: meal.date, meals: [] };
        result.push(group);
      }
      group.meals.push(meal);
    }
    return result;
  }, [app.meals, query]);
  const today = app.meals.filter((meal) => meal.date === dayKey());
  const todayTotal = total(today.flatMap((meal) => meal.items));
  return (
    <Page refresh={() => app.reload().catch(() => {})} tabs>
      <Heading
        eyebrow="Piring demi piring"
        title="Catatan makan"
        subtitle="Temukan dan sesuaikan makanan yang sudah dicatat."
      />
      <Row
        style={{
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: C.line,
        }}
      >
        <View style={{ gap: 3, flex: 1 }}>
          <Txt size={13} color={C.muted}>
            Hari ini · {today.length} catatan
          </Txt>
          <Txt size={25} bold>
            {Math.round(todayTotal.calories).toLocaleString("id-ID")}{" "}
            <Txt size={14} color={C.muted}>
              kkal
            </Txt>
          </Txt>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tambah catatan makanan"
          onPress={() => router.push("/add-meal")}
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: 16,
            backgroundColor: C.mint,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Icon name="plus" size={24} />
        </Pressable>
      </Row>
      <Row style={{ alignItems: "flex-end", gap: 8 }}>
        <Field
          label="Cari makanan"
          placeholder="Nasi, ayam, kopi…"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
        />
        {!!query && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hapus pencarian"
            onPress={() => setQuery("")}
            style={{
              width: 44,
              height: 52,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Txt size={24} color={C.muted}>
              ×
            </Txt>
          </Pressable>
        )}
      </Row>
      {groups.length ? (
        groups.map((group) => (
          <View key={group.date} style={{ gap: 10 }}>
            <Row>
              <Txt size={16} bold>
                {dateLabel(group.date)}
              </Txt>
              <Txt size={13} color={C.muted}>
                {Math.round(
                  total(group.meals.flatMap((meal) => meal.items)).calories,
                ).toLocaleString("id-ID")}{" "}
                kkal
              </Txt>
            </Row>
            <Card style={{ paddingVertical: 0 }}>
              {group.meals.map((meal, index) => (
                <Pressable
                  key={meal.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${mealLabels[meal.type]}, ${dateLabel(meal.date)}`}
                  onPress={() =>
                    router.push({
                      pathname: "/add-meal",
                      params: { id: meal.id },
                    })
                  }
                  style={({ pressed }) => ({
                    paddingVertical: 16,
                    minHeight: 76,
                    borderTopWidth: index ? 1 : 0,
                    borderTopColor: C.line,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Row style={{ gap: 10 }}>
                    <FoodImage
                      name={meal.items[0].name}
                      imageUrl={meal.items[0].image_url}
                      fallbackUri={meal.photo}
                      size={48}
                    />
                    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                      <Txt bold size={15}>
                        {mealLabels[meal.type]}
                      </Txt>
                      <Txt size={13} color={C.muted} numberOfLines={2}>
                        {meal.items.map((item) => item.name).join(" · ")}
                      </Txt>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 1 }}>
                      <Txt size={15} bold>
                        {Math.round(total(meal.items).calories)}
                      </Txt>
                      <Txt size={12} color={C.muted}>
                        kkal
                      </Txt>
                    </View>
                    <Icon name="next" size={16} color={C.muted} />
                  </Row>
                </Pressable>
              ))}
            </Card>
          </View>
        ))
      ) : (
        <View style={{ gap: 16, paddingTop: 12 }}>
          <Empty
            icon={query ? "🔎" : "🥣"}
            title={query ? "Belum ketemu" : "Piring pertama, yuk"}
            body={
              query
                ? "Coba nama makanan lain atau hapus pencarian."
                : "Ambil foto makanan. Kamu bisa memeriksa porsinya sebelum menyimpan."
            }
          />
          <Button
            title={query ? "Hapus pencarian" : "Foto makanan pertama"}
            variant="soft"
            onPress={() =>
              query ? setQuery("") : router.push("/add-meal?photoOnly=1")
            }
          />
        </View>
      )}
    </Page>
  );
}

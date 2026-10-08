import { useState } from "react";
import { View } from "react-native";
import { useApp } from "../../src/state/AppContext";
import { dayKey, daysAgo, total, streak, badges } from "../../src/lib/domain";
import {
  Page,
  Heading,
  Card,
  Row,
  Txt,
  C,
  Chip,
  Field,
  Button,
  Notice,
  Empty,
} from "../../src/components/ui";
import { CaloriesBarChart, WeightLineChart } from "../../src/components/charts";
export default function Progress() {
  const app = useApp();
  const [range, setRange] = useState(7);
  const [weight, setWeight] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const weights = [...app.weights].sort((a, b) => a.date.localeCompare(b.date));
  const last = weights.at(-1)?.weight ?? app.profile.weight;
  const dates = Array.from({ length: range }, (_, i) => daysAgo(range - 1 - i));
  const values = dates.map((date) => {
    const meals = app.meals.filter((meal) => meal.date === date);
    return meals.length
      ? total(meals.flatMap((meal) => meal.items)).calories
      : null;
  });
  const recordedValues = values.filter(
    (value): value is number => value !== null,
  );
  const average = recordedValues.length
    ? Math.round(
        recordedValues.reduce((sum, value) => sum + value, 0) /
          recordedValues.length,
      )
    : null;
  const recent = weights.slice(-15);
  const dateLabels = dates.map((date) =>
    new Date(date + "T12:00:00").toLocaleDateString(
      "id-ID",
      range === 7 ? { weekday: "short" } : { day: "numeric", month: "numeric" },
    ),
  );
  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await app.saveWeight({
        date: dayKey(),
        weight: Number(weight.replace(",", ".")),
      });
      setWeight("");
      setMessage("Check-in hari ini tersimpan 🌷");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page refresh={() => app.reload().catch(() => {})} tabs>
      <Heading
        eyebrow="Sedikit demi sedikit"
        title="Perjalananmu"
        subtitle="Lihat ritme makan dan perubahan beratmu."
      />
      <Row>
        <Chip
          title="7 hari"
          selected={range === 7}
          onPress={() => setRange(7)}
        />
        <Chip
          title="30 hari"
          selected={range === 30}
          onPress={() => setRange(30)}
        />
        <Txt color={C.muted} size={12}>
          🔥 {streak(app.meals)} hari
        </Txt>
      </Row>
      <Card>
        <Row>
          <Txt size={18} bold>
            Ritme makanmu
          </Txt>
          <Txt size={13} color={C.muted}>
            kkal / hari
          </Txt>
        </Row>
        <CaloriesBarChart
          values={values}
          labels={dateLabels}
          target={app.profile.calorieTarget}
        />
        <Txt size={13} color={C.muted}>
          {average === null
            ? "Belum ada makanan tercatat pada periode ini."
            : `Rata-rata ${average.toLocaleString("id-ID")} kkal dari ${recordedValues.length} hari tercatat.`}{" "}
          Garis putus-putus menunjukkan target harian.
        </Txt>
      </Card>
      <Card color={C.mint}>
        <Row>
          <View>
            <Txt size={12} color={C.green}>
              BERAT TERAKHIR
            </Txt>
            <Txt bold size={34}>
              {last} <Txt size={15}>kg</Txt>
            </Txt>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Txt size={12} color={C.green}>
              TUJUANMU
            </Txt>
            <Txt bold size={25}>
              {app.profile.targetWeight} <Txt size={13}>kg</Txt>
            </Txt>
          </View>
        </Row>
        {recent.length ? (
          <WeightLineChart
            values={recent.map((entry) => entry.weight)}
            labels={recent.map((entry) => entry.date.slice(5))}
            target={app.profile.targetWeight}
          />
        ) : (
          <Txt size={13} color={C.green}>
            Catat berat pertama untuk mulai melihat trenmu.
          </Txt>
        )}
        <Row>
          <Field
            label="Check-in hari ini · kg"
            placeholder="Contoh: 68.5"
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
            editable={!busy}
            onSubmitEditing={() => {
              if (weight.trim() && !busy) void save();
            }}
          />
          <View style={{ paddingTop: 22 }}>
            <Button
              title="Simpan"
              onPress={save}
              loading={busy}
              disabled={!weight.trim()}
            />
          </View>
        </Row>
        <Notice text={error} error />
        <Notice text={message} />
      </Card>
      <Txt size={20} bold>
        Hal kecil, patut dirayakan
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {badges(app.meals, app.weights, app.profile).map((b) => (
          <Card
            key={b.code}
            color={b.earned ? C.peach : "#F0F0E9"}
            style={{
              width: "48%",
              flexGrow: 1,
              alignItems: "center",
              padding: 15,
              opacity: b.earned ? 1 : 0.6,
            }}
          >
            <Txt size={30}>{b.earned ? b.icon : "🔒"}</Txt>
            <Txt size={12} bold style={{ textAlign: "center" }}>
              {b.name}
            </Txt>
          </Card>
        ))}
      </View>
      <Txt size={13} color={C.muted}>
        Streak dihitung saat kamu mencatat setidaknya 2 kali makan per hari.
        Hari ini masih punya kesempatan.
      </Txt>
      <Card>
        <Txt size={18} bold>
          Catatan sebelumnya
        </Txt>
        {app.meals.length ? (
          app.meals.slice(0, 30).map((m) => (
            <Row key={m.id}>
              <View style={{ flex: 1 }}>
                <Txt size={13} numberOfLines={1}>
                  {m.items.map((i) => i.name).join(", ")}
                </Txt>
                <Txt size={13} color={C.muted}>
                  {m.date}
                </Txt>
              </View>
              <Txt size={13} bold>
                {Math.round(total(m.items).calories)} kkal
              </Txt>
            </Row>
          ))
        ) : (
          <Empty
            title="Masih halaman pertama"
            body="Setiap makanan yang dicatat akan jadi bagian perjalananmu."
          />
        )}
      </Card>
    </Page>
  );
}

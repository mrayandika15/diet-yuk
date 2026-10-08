import { useEffect, useRef, useState } from "react";
import { Image, Keyboard, Pressable, ScrollView, View } from "react-native";
import { Food, resizeFood } from "../lib/domain";
import {
  MenuResult,
  Preparation,
  preparationLabels,
  searchMenus,
} from "../lib/food-search";
import { estimateMenu } from "../lib/managed-ai";
import { Button, C, Chip, Field, Icon, Row, Txt } from "./ui";
import { FoodImageCredit } from "./FoodImage";

function MenuRow({
  menu,
  onSelect,
  onImageError,
}: {
  menu: MenuResult;
  onSelect: () => void;
  onImageError: () => void;
}) {
  const [ready, setReady] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={"Pilih " + menu.name}
      accessibilityState={{ disabled: !ready }}
      disabled={!ready}
      onPress={onSelect}
      style={({ pressed }) => ({
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: C.line,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Row style={{ gap: 12 }}>
        <View
          style={{
            width: 58,
            height: 58,
            borderRadius: 14,
            overflow: "hidden",
            backgroundColor: C.mint,
          }}
        >
          <Image
            source={{ uri: menu.imageUrl }}
            accessibilityLabel={"Gambar " + menu.name}
            onLoad={() => setReady(true)}
            onError={onImageError}
            resizeMode={menu.kind === "meal" ? "cover" : "contain"}
            style={{ width: 58, height: 58 }}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Txt bold size={15} numberOfLines={2}>
            {menu.name}
          </Txt>
          <Txt size={12} color={C.muted}>
            {menu.subtitle}
          </Txt>
        </View>
        <Icon name="next" size={17} color={C.green} />
      </Row>
    </Pressable>
  );
}

export function FoodSearch({
  active,
  keyboard,
  onAdd,
  onManual,
  onPhoto,
}: {
  active: boolean;
  keyboard: boolean;
  onAdd: (food: Food) => void;
  onManual: () => void;
  onPhoto: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MenuResult[]>([]);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [partial, setPartial] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<MenuResult>();
  const [preparation, setPreparation] = useState<Preparation>("as_listed");
  const [grams, setGrams] = useState("100");
  const [estimated, setEstimated] = useState<Food>();
  const [notes, setNotes] = useState("");
  const [estimating, setEstimating] = useState(false);
  const estimateRequest = useRef<AbortController | undefined>(undefined);
  const detailScroll = useRef<ScrollView>(null);

  useEffect(() => {
    if (!active) {
      estimateRequest.current?.abort();
      setSelected(undefined);
      setEstimating(false);
      return;
    }
    const request = new AbortController();
    let timedOut = false;
    setLoading(true);
    setError("");
    setPartial(false);
    setResults([]);
    setFailedImages(new Set());
    const timeout = setTimeout(() => {
      timedOut = true;
      request.abort();
      setLoading(false);
      setError("Pencarian terlalu lama. Periksa koneksi dan coba lagi.");
    }, 15000);
    const debounce = setTimeout(
      () => {
        searchMenus(query, request.signal)
          .then((data) => {
            if (!request.signal.aborted) {
              setResults(data.items);
              setPartial(data.partial);
            }
          })
          .catch((reason) => {
            if (!request.signal.aborted && !timedOut)
              setError((reason as Error).message);
          })
          .finally(() => {
            if (!request.signal.aborted) setLoading(false);
            clearTimeout(timeout);
          });
      },
      query.trim() ? 350 : 0,
    );
    return () => {
      request.abort();
      clearTimeout(debounce);
      clearTimeout(timeout);
    };
  }, [query, retry, active]);
  useEffect(() => () => estimateRequest.current?.abort(), []);

  function choose(menu: MenuResult) {
    Keyboard.dismiss();
    setSelected(menu);
    setEstimated(undefined);
    setNotes("");
    setError("");
    setGrams("100");
    setPreparation(
      menu.kind === "meal"
        ? "as_listed"
        : /goreng|ceplok/i.test(query)
          ? "fried"
          : /rebus/i.test(query) || /telur|nasi/i.test(menu.name)
            ? "boiled"
            : "raw",
    );
  }
  function goBack() {
    estimateRequest.current?.abort();
    setEstimating(false);
    setSelected(undefined);
    setError("");
  }
  async function calculate() {
    if (!selected || estimating) return;
    Keyboard.dismiss();
    setEstimating(true);
    setError("");
    const request = new AbortController();
    estimateRequest.current = request;
    try {
      const result = await estimateMenu(selected, preparation, request.signal);
      if (request.signal.aborted) return;
      setEstimated(result.food);
      setNotes(result.notes);
    } catch (reason) {
      if (!request.signal.aborted) setError((reason as Error).message);
    } finally {
      if (!request.signal.aborted) setEstimating(false);
    }
  }
  const amount = Number(grams.replace(",", "."));
  const validAmount = Number.isFinite(amount) && amount > 0 && amount <= 10000;
  const portion =
    estimated && validAmount ? resizeFood(estimated, amount) : undefined;
  const shown = results.filter((m) => !failedImages.has(m.kind + m.id));

  if (selected)
    return (
      <View style={{ gap: 12, flexShrink: 1, minHeight: 0 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali ke hasil pencarian"
          onPress={goBack}
          style={{
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
          }}
        >
          <Icon name="back" size={16} />
          <Txt bold size={14} color={C.green}>
            Hasil pencarian
          </Txt>
        </Pressable>
        <ScrollView
          ref={detailScroll}
          onContentSizeChange={() => {
            if (estimated)
              detailScroll.current?.scrollToEnd({ animated: false });
          }}
          style={{ flexShrink: 1, maxHeight: keyboard ? 220 : 430 }}
          contentContainerStyle={{ gap: 16, paddingBottom: 8 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View
            style={{
              height: 130,
              borderRadius: 18,
              overflow: "hidden",
              backgroundColor: C.mint,
            }}
          >
            <Image
              source={{ uri: selected.imageUrl }}
              accessibilityLabel={"Gambar " + selected.name}
              resizeMode={selected.kind === "meal" ? "cover" : "contain"}
              style={{ width: "100%", height: "100%" }}
            />
          </View>
          <View style={{ gap: 3 }}>
            <Txt size={20} bold>
              {selected.name}
            </Txt>
            <Txt size={12} color={C.muted}>
              Gambar & menu dari TheMealDB
            </Txt>
          </View>
          {selected.kind === "ingredient" && (
            <View style={{ gap: 8 }}>
              <Txt bold size={13} color={C.muted}>
                Cara masak
              </Txt>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
                {(
                  [
                    "boiled",
                    "fried",
                    "grilled",
                    "steamed",
                    "raw",
                  ] as Preparation[]
                ).map((value) => (
                  <Chip
                    key={value}
                    title={preparationLabels[value]}
                    selected={preparation === value}
                    onPress={() => {
                      if (!estimating) {
                        setPreparation(value);
                        setEstimated(undefined);
                        setNotes("");
                      }
                    }}
                  />
                ))}
              </View>
            </View>
          )}
          <Field
            label="Porsi yang dimakan (gram)"
            value={grams}
            onChangeText={setGrams}
            keyboardType="decimal-pad"
            maxLength={7}
            containerStyle={{ flexGrow: 0, flexShrink: 0, flexBasis: "auto" }}
          />
          {!validAmount && (
            <Txt size={13} color={C.rose}>
              Isi porsi antara 1–10.000 gram.
            </Txt>
          )}
          {portion ? (
            <View
              style={{
                backgroundColor: C.mint,
                padding: 15,
                borderRadius: 16,
                gap: 7,
              }}
            >
              <Row>
                <Txt bold color={C.green}>
                  Estimasi porsi ini
                </Txt>
                <Txt bold size={22} color={C.green}>
                  {Math.round(portion.calories)} kkal
                </Txt>
              </Row>
              <Txt size={13} color={C.muted}>
                Protein {Math.round(portion.protein_g)} g · Karbo{" "}
                {Math.round(portion.carbs_g)} g · Lemak{" "}
                {Math.round(portion.fat_g)} g
              </Txt>
              <Txt size={12} color={C.muted}>
                {notes}
              </Txt>
            </View>
          ) : (
            <Txt size={13} color={C.muted}>
              {estimating
                ? "AI sedang menyiapkan estimasi nutrisi untuk pilihanmu…"
                : "AI menghitung estimasi berdasarkan bahan dan cara masak. Periksa hasilnya sebelum menambahkan."}
            </Txt>
          )}
          {!!error && (
            <View
              accessibilityRole="alert"
              style={{ padding: 12, backgroundColor: C.pink, borderRadius: 13 }}
            >
              <Txt size={13} color={C.rose}>
                {error}
              </Txt>
            </View>
          )}
        </ScrollView>
        <Button
          title={estimated ? "Tambahkan ke hasil" : "Lihat estimasi nutrisi"}
          loading={estimating}
          disabled={!validAmount}
          onPress={() => {
            if (portion) onAdd(portion);
            else void calculate();
          }}
        />
      </View>
    );

  return (
    <View style={{ gap: 12, minHeight: 0, flexShrink: 1 }}>
      <Field
        label="Cari menu atau bahan"
        placeholder="Telur, nasi, rendang…"
        value={query}
        onChangeText={setQuery}
        maxLength={80}
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={() => setRetry((n) => n + 1)}
        containerStyle={{ flexGrow: 0, flexShrink: 0, flexBasis: "auto" }}
      />
      <Row style={{ gap: 8 }}>
        <Txt size={12} color={C.muted} style={{ flex: 1 }}>
          {query
            ? "Hasil dari katalog online"
            : "Bahan populer & menu Indonesia"}
        </Txt>
        {!!query && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hapus pencarian menu"
            onPress={() => setQuery("")}
            style={{
              minHeight: 44,
              justifyContent: "center",
              paddingHorizontal: 8,
            }}
          >
            <Txt bold size={13} color={C.green}>
              Hapus
            </Txt>
          </Pressable>
        )}
      </Row>
      <ScrollView
        style={{ minHeight: 0, maxHeight: keyboard ? 180 : 335, flexShrink: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: 4 }}
      >
        {loading ? (
          <View
            accessibilityLabel="Sedang mencari menu"
            accessibilityLiveRegion="polite"
            style={{ gap: 12 }}
          >
            {[0, 1, 2].map((n) => (
              <Row key={n} style={{ gap: 12, paddingVertical: 8 }}>
                <View
                  style={{
                    width: 58,
                    height: 58,
                    backgroundColor: C.mint,
                    borderRadius: 14,
                  }}
                />
                <View style={{ flex: 1, gap: 9 }}>
                  <View
                    style={{
                      height: 15,
                      width: "70%",
                      borderRadius: 6,
                      backgroundColor: C.line,
                    }}
                  />
                  <View
                    style={{
                      height: 11,
                      width: "45%",
                      borderRadius: 5,
                      backgroundColor: C.line,
                    }}
                  />
                </View>
              </Row>
            ))}
            <Txt size={13} color={C.muted}>
              Mencari menu dan gambarnya…
            </Txt>
          </View>
        ) : error ? (
          <View
            accessibilityRole="alert"
            style={{ gap: 12, paddingVertical: 18 }}
          >
            <Txt bold>Menu belum bisa dimuat</Txt>
            <Txt size={13} color={C.muted}>
              {error}
            </Txt>
            <Button
              title="Coba pencarian lagi"
              variant="soft"
              onPress={() => setRetry((n) => n + 1)}
            />
          </View>
        ) : shown.length ? (
          <>
            {partial && (
              <Txt size={12} color={C.rose}>
                Sebagian hasil belum tersedia. Coba pencarian lagi jika
                diperlukan.
              </Txt>
            )}
            {shown.map((menu) => (
              <MenuRow
                key={menu.kind + menu.id}
                menu={menu}
                onSelect={() => choose(menu)}
                onImageError={() =>
                  setFailedImages(
                    (current) => new Set([...current, menu.kind + menu.id]),
                  )
                }
              />
            ))}
            <FoodImageCredit />
          </>
        ) : (
          <View style={{ gap: 10, paddingVertical: 18 }}>
            <Txt bold>Belum menemukan menu bergambar</Txt>
            <Txt size={13} color={C.muted}>
              Coba nama bahan, misalnya “telur” atau “ayam”, atau gunakan foto
              makananmu.
            </Txt>
            <Button
              title="Gunakan foto makanan"
              variant="soft"
              onPress={onPhoto}
            />
          </View>
        )}
      </ScrollView>
      <Button title="Isi makanan sendiri" variant="ghost" onPress={onManual} />
    </View>
  );
}

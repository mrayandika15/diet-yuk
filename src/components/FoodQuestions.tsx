import { Pressable, View } from "react-native";
import { Food, FoodQuestion } from "../lib/domain";
import { FoodImage } from "./FoodImage";
import { C, Row, Txt } from "./ui";

export function FoodQuestions({
  questions,
  items,
  answers,
  onAnswer,
  disabled,
  photo,
}: {
  questions: FoodQuestion[];
  items: Food[];
  answers: Record<string, string>;
  onAnswer: (id: string, option: string) => void;
  disabled: boolean;
  photo?: string;
}) {
  return (
    <View style={{ gap: 14 }}>
      <View
        style={{
          backgroundColor: C.mint,
          borderRadius: 18,
          padding: 14,
          gap: 4,
        }}
      >
        <Txt bold color={C.green}>
          Bantu AI mengenali detailnya
        </Txt>
        <Txt size={13} color={C.muted}>
          Foto belum menjelaskan semuanya. Jawab yang kamu tahu; sisanya boleh
          dilewati.
        </Txt>
      </View>
      {questions.map((q, index) => (
        <View
          key={q.id}
          style={{
            backgroundColor: C.white,
            borderColor: C.line,
            borderWidth: 1,
            borderRadius: 20,
            padding: 15,
            gap: 12,
          }}
        >
          <Row style={{ justifyContent: "flex-start", gap: 10 }}>
            <FoodImage
              name={items[q.item_index].name}
              imageUrl={items[q.item_index].image_url}
              fallbackUri={photo}
              size={44}
            />
            <View style={{ flex: 1 }}>
              <Txt size={11} color={C.muted}>
                {index + 1} DARI {questions.length} · {items[q.item_index].name}
              </Txt>
              <Txt bold size={16}>
                {q.text}
              </Txt>
            </View>
          </Row>
          <View style={{ gap: 8 }}>
            {[
              ...q.options,
              { id: "__unknown", label: "Tidak tahu / lewati" },
            ].map((option) => {
              const selected = answers[q.id] === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityLabel={q.text + ": " + option.label}
                  accessibilityState={{ checked: selected, disabled }}
                  disabled={disabled}
                  onPress={() => onAnswer(q.id, option.id)}
                  style={{
                    minHeight: 48,
                    borderWidth: 1,
                    borderColor: selected ? C.green : C.line,
                    backgroundColor: selected ? C.mint : C.white,
                    borderRadius: 13,
                    paddingHorizontal: 13,
                    paddingVertical: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: selected ? 6 : 1,
                      borderColor: selected ? C.green : C.muted,
                    }}
                  />
                  <Txt size={14} style={{ flex: 1 }}>
                    {option.label}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
          {q.kind === "egg_type" && (
            <Txt size={12} color={C.muted}>
              Jenis omega tidak bisa dipastikan dari foto. Kalori tetap estimasi
              tanpa label gizi.
            </Txt>
          )}
        </View>
      ))}
    </View>
  );
}

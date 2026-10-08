import { useEffect, useState } from "react";
import { Image, Linking, Platform, Pressable, View } from "react-native";
import { foodImage } from "../lib/food-images";
import { C, Icon, Txt } from "./ui";

export function FoodImage({
  name,
  size = 52,
  fallbackUri,
  imageUrl,
}: {
  name: string;
  size?: number;
  fallbackUri?: string;
  imageUrl?: string;
}) {
  const cachedIllustration = foodImage(name, Platform.OS !== "web");
  const [failed, setFailed] = useState<string[]>([]);
  useEffect(() => setFailed([]), [imageUrl, cachedIllustration, fallbackUri]);
  const uri = [imageUrl, cachedIllustration, fallbackUri].find(
    (value) => value && !failed.includes(value),
  );
  const illustration = uri !== fallbackUri;
  return (
    <View
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 13,
        backgroundColor: C.mint,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          accessibilityLabel={
            illustration ? "Ilustrasi " + name : "Foto makananmu"
          }
          resizeMode={
            imageUrl?.includes("/media/meals/") ||
            (!illustration && fallbackUri)
              ? "cover"
              : "contain"
          }
          onError={() => setFailed((current) => [...current, uri])}
          style={{ width: size, height: size }}
        />
      ) : (
        <Icon name="image" size={24} color={C.green} />
      )}
    </View>
  );
}

export function FoodImageCredit() {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Sumber ilustrasi makanan: TheMealDB"
      onPress={() => void Linking.openURL("https://www.themealdb.com/api.php")}
      style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}
    >
      <Txt size={11} color={C.muted}>
        Ilustrasi bahan/menu · TheMealDB ↗
      </Txt>
    </Pressable>
  );
}

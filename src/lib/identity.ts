import { createHash } from "node:crypto";

const adjectives = [
  "Amber",
  "Arctic",
  "Atlas",
  "Bright",
  "Cinder",
  "Cloud",
  "Copper",
  "Echo",
  "Golden",
  "Harbor",
  "Indigo",
  "Juniper",
  "Lunar",
  "Mellow",
  "Nova",
  "River",
  "Silver",
  "Solar",
  "Velvet",
  "Willow",
];

const animals = [
  "Otter",
  "Fox",
  "Panda",
  "Falcon",
  "Koala",
  "Wolf",
  "Heron",
  "Tiger",
  "Dolphin",
  "Lynx",
  "Seal",
  "Raven",
  "Badger",
  "Whale",
  "Leopard",
  "Fennec",
  "Owl",
  "Penguin",
  "Cheetah",
  "Sparrow",
];

export function getClientIp(source: Headers | Request["headers"]) {
  const forwardedFor = source.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "local";
  }

  return (
    source.get("x-real-ip") ||
    source.get("cf-connecting-ip") ||
    source.get("fly-client-ip") ||
    "local"
  );
}

export function getSenderIdentity(ipAddress: string) {
  const hash = createHash("sha256").update(ipAddress).digest("hex");
  const adjectiveIndex = parseInt(hash.slice(0, 8), 16) % adjectives.length;
  const animalIndex = parseInt(hash.slice(8, 16), 16) % animals.length;

  return {
    senderId: hash.slice(0, 16),
    codename: `${adjectives[adjectiveIndex]} ${animals[animalIndex]}`,
  };
}

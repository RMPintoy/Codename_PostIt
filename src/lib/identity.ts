import { createHash, randomUUID } from "node:crypto";

export const viewerCookieName = "postit_viewer_id";

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

export function getSenderIdentity(viewerId: string) {
  const hash = createHash("sha256").update(viewerId).digest("hex");
  const adjectiveIndex = parseInt(hash.slice(0, 8), 16) % adjectives.length;
  const animalIndex = parseInt(hash.slice(8, 16), 16) % animals.length;

  return {
    senderId: hash.slice(0, 16),
    codename: `${adjectives[adjectiveIndex]} ${animals[animalIndex]}`,
  };
}

export function getOrCreateViewerId(currentValue?: string) {
  return currentValue?.trim() || randomUUID();
}

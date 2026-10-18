
export const playSound = (type: "success" | "notification"): void => {
  try {
    const src = type === "success" ? "/audio/success.mp3" : "/audio/notification.ogg";
    const audio = new Audio(src);
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {

  }
};

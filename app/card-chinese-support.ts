export type CardChineseSupport = {
  label: "中文理解" | "發音提示";
  summary: string;
  translation?: string;
};

type SoundCard = {
  char: string;
  label: string;
  hint: string;
};

const cardCopyOverrides: Record<
  string,
  { meaning: string; translation?: string }
> = {
  "beginner-10-저는": {
    meaning: "我／至於我",
    translation: "我是敏洙。",
  },
  "beginner-10-학생": {
    meaning: "學生",
    translation: "我是學生。",
  },
  "beginner-10-중학생": {
    meaning: "國中生",
    translation: "我是國中生。",
  },
  "beginner-10-대만": {
    meaning: "臺灣",
    translation: "我來自臺灣。",
  },
  "beginner-10-반가워요": {
    meaning: "很高興見到你",
    translation: "很高興認識你。",
  },
  "beginner-15-가요": {
    meaning: "去／前往",
    translation: "我去學校。",
  },
  "beginner-15-먹어요": {
    meaning: "吃",
    translation: "我吃飯。",
  },
  "beginner-15-봐요": {
    meaning: "看",
    translation: "我看電影。",
  },
  "beginner-15-공부해요": {
    meaning: "學習",
    translation: "我學習韓文。",
  },
  "beginner-15-좋아해요": {
    meaning: "喜歡",
    translation: "我喜歡音樂。",
  },
};

export function getCardChineseSupport(
  level: string,
  day: number,
  sound: SoundCard,
): CardChineseSupport {
  const isPronunciationCard = level === "beginner" && day <= 8;
  const override = cardCopyOverrides[`${level}-${day}-${sound.char}`];
  const sourceSummary = override?.meaning ?? sound.hint;
  const summary =
    isPronunciationCard && !/\p{Script=Han}/u.test(sourceSummary)
      ? `組合方式：${sourceSummary}`
      : sourceSummary;
  return {
    label: isPronunciationCard ? "發音提示" : "中文理解",
    summary,
    translation: override?.translation,
  };
}

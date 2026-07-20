export type ExerciseKind =
  | "choice"
  | "match"
  | "listen"
  | "order"
  | "fill"
  | "correction"
  | "translation"
  | "dictation";

export type ExerciseLesson = {
  day: number;
  question: string;
  options: readonly string[];
  answer: string;
  listenText: string;
  sounds: readonly { char: string; label: string; hint: string }[];
};

export type PracticeExercise = {
  id: string;
  kind: ExerciseKind;
  interaction: "options" | "text";
  kicker: string;
  question: string;
  options: readonly string[];
  answer: string;
  audio?: string;
  audioPath?: string;
  sourceDay?: number;
};

const punctuation = /[.,!?，。！？]/g;

export function normalizeAnswer(value: string) {
  return value
    .normalize("NFC")
    .replace(punctuation, "")
    .replace(/\s*\+\s*/g, " + ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("ko-KR");
}

export function answersMatch(value: string, answer: string) {
  return normalizeAnswer(value) === normalizeAnswer(answer);
}

function unique(values: readonly string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function audioPath(level: string, day: number) {
  return `/audio/${level}-day-${String(day).padStart(2, "0")}.mp3`;
}

function rotateOptions(values: readonly string[], seed: number) {
  const items = unique(values);
  const offset = items.length ? seed % items.length : 0;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function sentenceOrder(text: string, fallback: readonly string[], seed: number) {
  const words = text
    .split(/[\s,，.。]+/)
    .map((word) => word.trim())
    .filter(Boolean);
  if (words.length < 2) {
    return {
      answer: fallback[0] ?? text,
      options: rotateOptions(fallback, seed),
    };
  }
  const answer = words.join(" ");
  const reversed = [...words].reverse().join(" ");
  const shifted = [...words.slice(1), words[0]].join(" ");
  return {
    answer,
    options: rotateOptions([answer, reversed, shifted], seed),
  };
}

function buildFillPrompt(target: ExerciseLesson["sounds"][number]) {
  if (target.label.includes("+")) {
    return `請依照「韓文字母 + 韓文字母」的格式，寫出字卡「${target.char}」的組合方式。提示：${target.hint}。`;
  }
  if (target.label.includes(" ")) {
    return `請輸入字卡「${target.char}」下方的完整韓文例詞或句子（保留詞間空格）。提示：${target.hint}。`;
  }
  return `請輸入字卡「${target.char}」下方的完整韓文內容。提示：${target.hint}。`;
}

export function buildLessonExercises(
  lesson: ExerciseLesson,
  level: string,
): PracticeExercise[] {
  const sounds = lesson.sounds;
  const matchIndex = lesson.day % sounds.length;
  const listenIndex = (lesson.day + 1) % sounds.length;
  const optionLabels = (targetIndex: number, seed: number) =>
    rotateOptions(
      [
        sounds[targetIndex].label,
        sounds[(targetIndex + 1) % sounds.length].label,
        sounds[(targetIndex + 2) % sounds.length].label,
      ],
      seed,
    );
  const order = sentenceOrder(lesson.listenText, lesson.options, lesson.day);
  const translationTarget = sounds[(lesson.day + 2) % sounds.length];
  const fillTarget = sounds[(lesson.day + 3) % sounds.length];
  const correctionTarget = sounds[(lesson.day + 1) % sounds.length];
  const isBeginnerPhonics = level === "beginner" && lesson.day <= 8;

  return [
    {
      id: `day-${lesson.day}-choice`,
      kind: "choice",
      interaction: "options",
      kicker: "文法選擇",
      question: lesson.question,
      options: lesson.options,
      answer: lesson.answer,
    },
    {
      id: `day-${lesson.day}-match`,
      kind: "match",
      interaction: "options",
      kicker: "單字配對",
      question: `字卡「${sounds[matchIndex].char}」下方的完整韓文內容是哪一個？提示：${sounds[matchIndex].hint}。`,
      options: optionLabels(matchIndex, lesson.day),
      answer: sounds[matchIndex].label,
    },
    {
      id: `day-${lesson.day}-listen`,
      kind: "listen",
      interaction: "options",
      kicker: "聽力辨識",
      question: "播放固定語音後，選出你聽到的句子。",
      options: rotateOptions(
        [lesson.listenText, lesson.answer, sounds[listenIndex].label],
        lesson.day + 1,
      ),
      answer: lesson.listenText,
      audio: lesson.listenText,
      audioPath: audioPath(level, lesson.day),
    },
    {
      id: `day-${lesson.day}-order`,
      kind: "order",
      interaction: "options",
      kicker: isBeginnerPhonics ? "字音排序" : "句子排序",
      question: isBeginnerPhonics
        ? "依照今日教材的示範順序，哪一組字音排列正確？"
        : "哪一組韓文詞序最自然？",
      options: order.options,
      answer: order.answer,
    },
    {
      id: `day-${lesson.day}-fill`,
      kind: "fill",
      interaction: "text",
      kicker: "韓文填空",
      question: buildFillPrompt(fillTarget),
      options: [],
      answer: fillTarget.label,
    },
    {
      id: `day-${lesson.day}-correction`,
      kind: "correction",
      interaction: "options",
      kicker: "韓文校對",
      question: `請檢查字卡「${correctionTarget.char}」（提示：${correctionTarget.hint}），選出與它正確配對的完整韓文內容。`,
      options: optionLabels((lesson.day + 1) % sounds.length, lesson.day + 2),
      answer: correctionTarget.label,
    },
    {
      id: `day-${lesson.day}-translation`,
      kind: "translation",
      interaction: "options",
      kicker: "提示選句",
      question: `根據提示「${translationTarget.hint}」，選出字卡「${translationTarget.char}」對應的完整韓文內容。`,
      options: optionLabels((lesson.day + 2) % sounds.length, lesson.day + 1),
      answer: translationTarget.label,
    },
    {
      id: `day-${lesson.day}-dictation`,
      kind: "dictation",
      interaction: "text",
      kicker: "完整聽寫",
      question: "播放固定語音，輸入你聽到的完整韓文（標點不計分）。",
      options: [],
      answer: lesson.listenText,
      audio: lesson.listenText,
      audioPath: audioPath(level, lesson.day),
    },
  ];
}

export function buildCheckpointExercises(
  lessons: readonly ExerciseLesson[],
  checkpointDay: number,
  level: string,
): PracticeExercise[] {
  const start = Math.max(0, checkpointDay - 5);
  return lessons.slice(start, checkpointDay).flatMap((lesson) => {
    const daily = buildLessonExercises(lesson, level);
    const choice = daily.find((exercise) => exercise.kind === "choice");
    const dictation = daily.find((exercise) => exercise.kind === "dictation");
    if (!choice || !dictation) {
      throw new Error(`Day ${lesson.day} is missing checkpoint exercises.`);
    }
    return [
      {
        ...choice,
        id: `checkpoint-${checkpointDay}-day-${lesson.day}-choice`,
        kicker: `累積檢核 · Day ${lesson.day} 文法`,
        sourceDay: lesson.day,
      },
      {
        ...dictation,
        id: `checkpoint-${checkpointDay}-day-${lesson.day}-dictation`,
        kicker: `累積檢核 · Day ${lesson.day} 聽寫`,
        sourceDay: lesson.day,
      },
    ];
  });
}

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
  hintSteps: readonly [string, string];
  explanation: string;
  acceptedAnswers: readonly string[];
  commonMistake: string;
  teacherTip: string;
};

type BasePracticeExercise = Omit<
  PracticeExercise,
  | "hintSteps"
  | "explanation"
  | "acceptedAnswers"
  | "commonMistake"
  | "teacherTip"
>;

const punctuation = /[.,!?，。！？、:：;；"'“”‘’]/g;

export function normalizeAnswer(value: string) {
  return value
    .normalize("NFC")
    .replace(punctuation, "")
    .replace(/\s*\+\s*/g, " + ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("ko-KR");
}

export function answersMatch(
  value: string,
  answer: string,
  acceptedAnswers: readonly string[] = [],
) {
  const submitted = normalizeAnswer(value);
  const submittedCompact = submitted.replace(/\s+/g, "");
  return unique([answer, ...acceptedAnswers]).some((candidate) => {
    const normalized = normalizeAnswer(candidate);
    return (
      submitted === normalized ||
      submittedCompact === normalized.replace(/\s+/g, "")
    );
  });
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

function acceptedVariants(exercise: BasePracticeExercise) {
  if (exercise.interaction !== "text") return [exercise.answer];
  return unique([
    exercise.answer,
    exercise.answer.replace(punctuation, "").trim(),
    exercise.answer.replace(/\s+/g, ""),
  ]);
}

function addLearningSupport(
  exercise: BasePracticeExercise,
  lesson: ExerciseLesson,
): PracticeExercise {
  const relatedCard = lesson.sounds.find(
    (sound) =>
      sound.label === exercise.answer || sound.char === exercise.answer,
  );
  const cardHint = relatedCard?.hint ?? "回想今日教學示範的規則與語序";
  const supportByKind: Record<
    ExerciseKind,
    {
      hints: [string, string];
      focus: string;
      mistake: string;
      teacher: string;
    }
  > = {
    choice: {
      hints: [
        "先找出題目正在考的母音、助詞或句尾規則。",
        "逐一讀出選項，排除不符合今日教學規則的寫法。",
      ],
      focus: "今日教學的核心規則",
      mistake: "只憑外形或中文直覺選答案，沒有檢查韓文規則。",
      teacher: "請學生先說出規則，再請他重新比較每個選項。",
    },
    match: {
      hints: [
        `先回想這張字卡的提示：${cardHint}。`,
        "答案要選字卡下方的完整韓文內容，不是只選其中一個字。",
      ],
      focus: "字卡與完整韓文內容的配對",
      mistake: "只記得字卡外形，沒有一起記住例詞或例句。",
      teacher: "遮住答案，請學生先讀字卡，再說出完整例詞或例句。",
    },
    listen: {
      hints: [
        "先用慢速播放一次，只抓住最清楚的音節。",
        "第二次注意句尾與詞間停頓，再和選項逐句比對。",
      ],
      focus: "固定語音中的完整句子",
      mistake: "只聽到開頭就作答，忽略句尾或中間的詞。",
      teacher: "把語音分成兩到三段跟讀，再播放完整句子讓學生選。",
    },
    order: {
      hints: [
        "先找句子的主題、受詞或地點，再找最後的動詞或句尾。",
        "韓文通常把動作放在句尾；重新檢查助詞是否跟在正確名詞後。",
      ],
      focus: "韓文詞序與句尾位置",
      mistake: "直接套用中文詞序，或把動詞放在句子中間。",
      teacher: "用斜線切分句子成分，請學生先排出句尾，再補前面的成分。",
    },
    fill: {
      hints: [
        `回到目標字卡，提示是：${cardHint}。`,
        "請輸入字卡下方的完整韓文內容；字母組合題要保留加號，句子要注意空格。",
      ],
      focus: "字卡的完整韓文拼寫",
      mistake: "漏字、混淆相近母音，或只輸入題目中的一部分。",
      teacher: "請學生先慢慢念一次，再按音節逐段寫出，最後對照字卡。",
    },
    correction: {
      hints: [
        `先利用字卡提示判斷意思或發音：${cardHint}。`,
        "逐字比較選項，特別注意容易混淆的母音、 받침 與句尾。",
      ],
      focus: "完整韓文內容的校對",
      mistake: "只看大致相似就作答，沒有逐個音節核對。",
      teacher: "讓學生指出選項間唯一不同的音節，再判斷哪個符合字卡。",
    },
    translation: {
      hints: [
        `先圈出中文提示中的關鍵意思：${cardHint}。`,
        "比較每個韓文選項的核心單字與句尾，不要只看第一個字。",
      ],
      focus: "中文提示與韓文例句的對應",
      mistake: "只依照單一熟悉單字選答案，忽略整句意思。",
      teacher: "請學生先說出句中的關鍵單字，再確認整句是否符合中文提示。",
    },
    dictation: {
      hints: [
        "先慢速播放，記下聽得最清楚的音節或單字。",
        "再播放一次補齊句尾與空格；標點不計分，詞間空格可有合理差異。",
      ],
      focus: "固定語音的完整韓文聽寫",
      mistake: "只寫下部分內容，或把相近母音與句尾聽成另一個字。",
      teacher: "分段播放並讓學生跟讀；確認聽懂後，再播放完整語音重新聽寫。",
    },
  };
  const support = supportByKind[exercise.kind];
  const cardName = relatedCard
    ? `字卡「${relatedCard.char}」`
    : `Day ${lesson.day} 教材`;
  const explanationByKind: Record<ExerciseKind, string> = {
    choice: `題目「${lesson.question}」的正確答案是「${exercise.answer}」。這一題直接檢查 Day ${lesson.day} 今日教學的規則；重新對照題目關鍵字與正確選項，就能排除其餘不符合規則的寫法。`,
    match: `${cardName}下方的完整韓文是「${exercise.answer}」，中文／發音提示是「${cardHint}」。作答時要把字卡、完整例詞或例句與提示一起記住。`,
    listen: `固定語音的完整內容是「${exercise.answer}」。先辨認開頭音節，再核對中間詞語和句尾，三個部分都一致才是完整答案。`,
    order: `正確排列是「${exercise.answer}」。韓文要先確認助詞所屬的名詞，再把動詞或句尾放在句末；不能直接照中文順序排列。`,
    fill: `${cardName}的完整韓文寫法是「${exercise.answer}」，提示為「${cardHint}」。請逐音節核對母音、子音與詞間空格，不能只輸入其中一部分。`,
    correction: `${cardName}應與「${exercise.answer}」配對，提示為「${cardHint}」。校對時要逐個音節比較，而不是只看整體外形是否相似。`,
    translation: `提示「${cardHint}」對應的完整韓文是「${exercise.answer}」。先找出表達核心意思的單字，再確認助詞與句尾是否讓整句意思完整。`,
    dictation: `固定語音的完整聽寫是「${exercise.answer}」。標點不計分，合理的詞間空格差異也會接受；音節與句尾仍必須完整。`,
  };
  return {
    ...exercise,
    hintSteps: support.hints,
    explanation: explanationByKind[exercise.kind],
    acceptedAnswers: acceptedVariants(exercise),
    commonMistake: support.mistake,
    teacherTip: support.teacher,
  };
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

  const exercises: BasePracticeExercise[] = [
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
  return exercises.map((exercise) => addLearningSupport(exercise, lesson));
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

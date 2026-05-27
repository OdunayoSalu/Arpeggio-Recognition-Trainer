(function () {
  "use strict";

  const STORAGE_KEY = "art:lastSettings";
  const DEFAULT_KEY = "art:defaultSettings";
  const FEEDBACK_DELAY_MS = 950;
  const MAX_GENERATION_ATTEMPTS = 160;

  const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
  const NATURAL_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const ACCIDENTAL_TO_DELTA = { bb: -2, b: -1, "": 0, "#": 1, "##": 2 };
  const ACCIDENTAL_LABELS = { b: "♭", "": "♮", "#": "♯", bb: "𝄫", "##": "𝄪" };
  const UI_ACCIDENTALS = [
    { value: "b", label: "♭" },
    { value: "", label: "♮" },
    { value: "#", label: "♯" }
  ];

  const MAJOR_KEYS = ["C", "G", "D", "A", "E", "B", "F#", "C#", "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"];
  const ROMANS = ["I", "ii", "iii", "IV", "V", "vi", "vii°", "Other"];
  const DEGREE_ROMANS = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];

  const QUALITY_DEFS = {
    major: { label: "Major", shortLabel: "M", intervals: [0, 4, 7], slots: [1, 3, 5], letterOffsets: [0, 2, 4] },
    minor: { label: "Minor", shortLabel: "m", intervals: [0, 3, 7], slots: [1, 3, 5], letterOffsets: [0, 2, 4] },
    diminished: { label: "Diminished", shortLabel: "°", intervals: [0, 3, 6], slots: [1, 3, 5], letterOffsets: [0, 2, 4] },
    augmented: { label: "Augmented", shortLabel: "+", intervals: [0, 4, 8], slots: [1, 3, 5], letterOffsets: [0, 2, 4] },
    sus2: { label: "Sus2", shortLabel: "sus2", intervals: [0, 2, 7], slots: [1, 3, 5], letterOffsets: [0, 1, 4], susAlias: "sus4" },
    sus4: { label: "Sus4", shortLabel: "sus4", intervals: [0, 5, 7], slots: [1, 3, 5], letterOffsets: [0, 3, 4], susAlias: "sus2" },
    dominant7: { label: "Dominant 7", shortLabel: "7", intervals: [0, 4, 7, 10], slots: [1, 3, 5, 7], letterOffsets: [0, 2, 4, 6] },
    major7: { label: "Major 7", shortLabel: "M7", intervals: [0, 4, 7, 11], slots: [1, 3, 5, 7], letterOffsets: [0, 2, 4, 6] },
    minor7: { label: "Minor 7", shortLabel: "m7", intervals: [0, 3, 7, 10], slots: [1, 3, 5, 7], letterOffsets: [0, 2, 4, 6] },
    halfDim7: { label: "Half-dim 7", shortLabel: "<sup>ø</sup>7", intervals: [0, 3, 6, 10], slots: [1, 3, 5, 7], letterOffsets: [0, 2, 4, 6] },
    dim7: { label: "Dim 7", shortLabel: "<sup>°</sup>7", intervals: [0, 3, 6, 9], slots: [1, 3, 5, 7], letterOffsets: [0, 2, 4, 6] }
  };

  const SETTING_OPTIONS = {
    clefs: [
      { value: "bass", label: "Bass clef" },
      { value: "treble", label: "Treble clef" }
    ],
    keys: MAJOR_KEYS.map((key) => ({ value: key, label: `${key} major` })),
    timerMode: [
      { value: "autoAdvance", label: "Auto-advance" },
      { value: "negative", label: "Go negative" }
    ],
    movement: [
      { value: "small", label: "Nearby" },
      { value: "medium", label: "Moderate" },
      { value: "large", label: "Large" }
    ],
    inversions: [
      { value: "root", label: "Root position" },
      { value: "first", label: "First inversion" },
      { value: "second", label: "Second inversion" },
      { value: "third", label: "Third inversion" }
    ],
    voicingGroups: [
      { value: "basic", label: "Closed shape" },
      { value: "open", label: "Open shape" },
      { value: "wide", label: "Wide / rolled shape" }
    ],
    harmonyTypes: [
      { value: "diatonic", label: "Diatonic only" },
      { value: "secondary", label: "Secondary dominants" },
      { value: "borrowed", label: "Borrowed chords" }
    ],
    chordQualities: Object.entries(QUALITY_DEFS).map(([value, def]) => ({ value, label: def.label })),
    entryPoints: [
      { value: "lowest", label: "Lowest note first" },
      { value: "highest", label: "Highest note first" },
      { value: "inner", label: "Inner note first" }
    ],
    textures: [
      { value: "easy", label: "Easy" },
      { value: "medium", label: "Medium" },
      { value: "hard", label: "Hard" }
    ],
    contours: [
      { value: "ascending", label: "Ascending" },
      { value: "descending", label: "Descending" },
      { value: "turnaround", label: "Turnaround" },
      { value: "mixed", label: "Mixed" }
    ],
    arpeggioLengths: [
      { value: "short", label: "Short: 3-4 events" },
      { value: "medium", label: "Medium: 5-6 events" },
      { value: "long", label: "Long: 7-9 events" }
    ]
  };

  const DEFAULT_SETTINGS = {
    clefs: ["bass", "treble"],
    keys: ["C", "G", "D", "F"],
    timePerQuestion: 5,
    questionsPerSet: 20,
    timerMode: "autoAdvance",
    diatonicPercent: 85,
    movement: ["small", "medium", "large"],
    inversions: ["root", "first", "second"],
    voicingGroups: ["basic", "open"],
    spacing: ["closed", "open"],
    harmonyTypes: ["diatonic", "secondary", "borrowed"],
    chordQualities: ["major", "minor", "diminished", "sus2", "sus4", "dominant7", "major7", "minor7", "halfDim7"],
    entryPoints: ["lowest", "highest", "inner"],
    textures: ["easy", "medium"],
    contours: ["ascending", "descending", "turnaround", "mixed"],
    span: "simple",
    arpeggioLengths: ["short", "medium"]
  };

  const DEGREE_LADDERS = {
    triad: [1, 3, 5, 8, 10, 12, 15, 17, 19],
    seventh: [1, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 21]
  };

  const app = {
    settings: null,
    set: null,
    timerId: null,
    questionStartedAt: 0,
    remainingMs: 0,
    elapsedMs: 0,
    paused: false,
    acceptingAnswers: false,
    feedbackTimeout: null
  };

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    app.settings = loadSettings();
    buildSettingsForm();
    applySettingsToForm();
    bindEvents();
    showScreen("settings");
  }

  function cacheElements() {
    [
      "settingsScreen", "orientationScreen", "quizScreen", "summaryScreen", "settingsForm", "settingsValidation",
      "startSetBtn", "saveDefaultBtn", "appStatus", "questionNumber", "quizMeta", "timerBar",
      "timerText", "notation", "feedbackLine", "answerPanel", "pauseBtn", "resumeBtn",
      "pauseOverlay", "endSetBtn", "summaryStats", "summaryList", "newSetBtn", "settingsBtn",
      "timePerQuestion", "questionsPerSet", "diatonicPercent", "orientationNotation",
      "beginQuizBtn", "refreshSetBtn", "orientationSettingsBtn", "diatonicPercentValue",
      "diatonicPercentRow"
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });
  }

  function loadSettings() {
    const stored = readJson(STORAGE_KEY) || readJson(DEFAULT_KEY) || {};
    return normalizeSettings({ ...DEFAULT_SETTINGS, ...stored });
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(app.settings));
  }

  function readJson(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function normalizeSettings(settings) {
    const normalized = { ...DEFAULT_SETTINGS, ...settings };
    migrateLegacyMovementSettings(normalized, settings);
    Object.keys(SETTING_OPTIONS).forEach((key) => {
      if (key === "timerMode") return;
      if (!Array.isArray(normalized[key])) normalized[key] = [...DEFAULT_SETTINGS[key]];
      const allowed = new Set(SETTING_OPTIONS[key].map((option) => option.value));
      normalized[key] = normalized[key].filter((value) => allowed.has(value));
    });
    normalized.timePerQuestion = clamp(parseInt(normalized.timePerQuestion, 10) || 5, 2, 60);
    normalized.questionsPerSet = clamp(parseInt(normalized.questionsPerSet, 10) || 20, 1, 100);
    normalized.diatonicPercent = clamp(parseInt(normalized.diatonicPercent, 10), 0, 100);
    if (!Number.isFinite(normalized.diatonicPercent)) normalized.diatonicPercent = DEFAULT_SETTINGS.diatonicPercent;
    if (!SETTING_OPTIONS.timerMode.some((option) => option.value === normalized.timerMode)) normalized.timerMode = DEFAULT_SETTINGS.timerMode;
    applyVoicingDerivedConstraints(normalized);
    return normalized;
  }

  function migrateLegacyMovementSettings(normalized, rawSettings) {
    const legacyMap = { stepwise: "small", moderate: "medium", large: "large" };
    const mappedMovement = Array.isArray(rawSettings.successiveMovement)
      ? rawSettings.successiveMovement.map((value) => legacyMap[value]).filter(Boolean)
      : [];
    const existingMovement = Array.isArray(rawSettings.movement) ? rawSettings.movement : [];
    normalized.movement = Array.from(new Set([...existingMovement, ...mappedMovement]));
    if (!normalized.movement.length) normalized.movement = [...DEFAULT_SETTINGS.movement];

    if (Array.isArray(rawSettings.voicingGroups) && rawSettings.voicingGroups.includes("mixed")) {
      normalized.voicingGroups = Array.from(new Set([
        ...rawSettings.voicingGroups.filter((value) => value !== "mixed"),
        "open"
      ]));
    }

    if (Array.isArray(rawSettings.contours)) {
      const contourMap = {
        upDown: "turnaround",
        downUp: "turnaround",
        zigzag: "mixed",
        outward: "mixed",
        inward: "mixed"
      };
      normalized.contours = Array.from(new Set(
        rawSettings.contours.map((value) => contourMap[value] || value)
      ));
    }
  }

  function applyVoicingDerivedConstraints(settings) {
    const groups = Array.isArray(settings.voicingGroups) ? settings.voicingGroups : [];
    const hasBasic = groups.includes("basic");
    const hasOpen = groups.includes("open");
    const hasWide = groups.includes("wide");

    if (hasWide) {
      settings.span = "rolling";
    } else {
      settings.span = "simple";
    }

    if (hasBasic && !hasOpen && !hasWide) {
      settings.spacing = ["closed"];
    } else if (!hasBasic && (hasOpen || hasWide)) {
      settings.spacing = ["open"];
    } else {
      settings.spacing = ["closed", "open"];
    }
    return settings;
  }

  function buildSettingsForm() {
    Object.entries(SETTING_OPTIONS).forEach(([key, options]) => {
      const container = document.querySelector(`[data-setting="${key}"]`);
      if (!container) return;
      container.innerHTML = "";
      const type = key === "timerMode" ? "radio" : "checkbox";
      options.forEach((option) => {
        const label = document.createElement("label");
        label.className = "choice";
        const displayLabel = getSettingOptionLabel(key, option);
        label.innerHTML = `
          <input type="${type}" name="${key}" value="${escapeHtml(option.value)}">
          <span>${displayLabel}</span>
        `;
        const input = label.querySelector("input");
        if (key === "chordQualities") {
          input.setAttribute("aria-label", option.label);
          label.title = option.label;
        }
        container.appendChild(label);
      });
    });
  }

  function getSettingOptionLabel(key, option) {
    if (key === "chordQualities" && QUALITY_DEFS[option.value]) {
      return QUALITY_DEFS[option.value].shortLabel || escapeHtml(option.label);
    }
    return escapeHtml(option.label);
  }

  function applySettingsToForm() {
    Object.entries(app.settings).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          const input = els.settingsForm.querySelector(`input[name="${key}"][value="${cssEscape(item)}"]`);
          if (input) input.checked = true;
        });
      } else {
        const input = els.settingsForm.querySelector(`input[name="${key}"][value="${cssEscape(value)}"]`);
        if (input) input.checked = true;
      }
    });
    els.timePerQuestion.value = app.settings.timePerQuestion;
    els.questionsPerSet.value = app.settings.questionsPerSet;
    els.diatonicPercent.value = app.settings.diatonicPercent;
    updateDiatonicSliderState();
  }

  function bindEvents() {
    els.settingsForm.addEventListener("change", updateSettingsFromForm);
    els.settingsForm.addEventListener("input", updateSettingsFromForm);
    els.startSetBtn.addEventListener("click", startSet);
    els.saveDefaultBtn.addEventListener("click", () => {
      updateSettingsFromForm();
      localStorage.setItem(DEFAULT_KEY, JSON.stringify(app.settings));
      els.appStatus.textContent = "Default saved";
      setTimeout(() => {
        if (els.appStatus.textContent === "Default saved") els.appStatus.textContent = "";
      }, 1600);
    });
    els.pauseBtn.addEventListener("click", pauseQuiz);
    els.resumeBtn.addEventListener("click", resumeQuiz);
    els.endSetBtn.addEventListener("click", endSet);
    els.newSetBtn.addEventListener("click", startSet);
    els.settingsBtn.addEventListener("click", () => showScreen("settings"));
    els.beginQuizBtn.addEventListener("click", beginPreparedSet);
    els.refreshSetBtn.addEventListener("click", startSet);
    els.orientationSettingsBtn.addEventListener("click", () => showScreen("settings"));
    window.addEventListener("resize", debounce(() => {
      if (app.set?.currentQuestion) renderNotation(els.notation, app.set.currentQuestion);
      if (app.set && els.orientationScreen.classList.contains("is-active")) renderOrientationStaff();
    }, 150));
  }

  function updateSettingsFromForm() {
    const next = { ...app.settings };
    Object.keys(SETTING_OPTIONS).forEach((key) => {
      if (key === "timerMode") {
        const checked = els.settingsForm.querySelector(`input[name="${key}"]:checked`);
        next[key] = checked ? checked.value : DEFAULT_SETTINGS[key];
      } else {
        next[key] = Array.from(els.settingsForm.querySelectorAll(`input[name="${key}"]:checked`)).map((input) => input.value);
      }
    });
    next.timePerQuestion = clamp(parseInt(els.timePerQuestion.value, 10) || DEFAULT_SETTINGS.timePerQuestion, 2, 60);
    next.questionsPerSet = clamp(parseInt(els.questionsPerSet.value, 10) || DEFAULT_SETTINGS.questionsPerSet, 1, 100);
    next.diatonicPercent = clamp(parseInt(els.diatonicPercent.value, 10), 0, 100);
    if (!Number.isFinite(next.diatonicPercent)) next.diatonicPercent = DEFAULT_SETTINGS.diatonicPercent;
    els.timePerQuestion.value = next.timePerQuestion;
    els.questionsPerSet.value = next.questionsPerSet;
    els.diatonicPercent.value = next.diatonicPercent;
    applyVoicingDerivedConstraints(next);
    app.settings = normalizeSettings(next);
    updateDiatonicSliderState();
    saveSettings();
  }

  function updateDiatonicSliderState() {
    const harmonyTypes = app.settings.harmonyTypes || [];
    const hasDiatonic = harmonyTypes.includes("diatonic");
    const hasNonDiatonic = harmonyTypes.includes("secondary") || harmonyTypes.includes("borrowed");
    const disabled = !(hasDiatonic && hasNonDiatonic);
    els.diatonicPercent.disabled = disabled;
    els.diatonicPercentRow.classList.toggle("is-disabled", disabled);
    els.diatonicPercentValue.textContent = `${app.settings.diatonicPercent}%`;
    els.diatonicPercentRow.title = disabled
      ? "This target only matters when diatonic and non-diatonic harmony types are both active."
      : "";
  }

  function validateSettings(settings) {
    const requiredArrays = [
      ["clefs", "Choose at least one clef."],
      ["keys", "Choose at least one major key."],
      ["movement", "Choose at least one position movement option."],
      ["inversions", "Choose at least one inversion."],
      ["voicingGroups", "Choose at least one arpeggio span option."],
      ["harmonyTypes", "Choose at least one harmony type."],
      ["chordQualities", "Choose at least one chord quality."],
      ["entryPoints", "Choose at least one entry point."],
      ["textures", "Choose at least one texture."],
      ["contours", "Choose at least one contour."],
      ["arpeggioLengths", "Choose at least one arpeggio length."]
    ];
    for (const [key, message] of requiredArrays) {
      if (!settings[key]?.length) return message;
    }
    const candidateCount = buildHarmonyCandidates(settings, settings.keys[0]).length;
    if (!candidateCount) return "Those harmony and chord-quality settings do not leave any valid chords.";
    return "";
  }

  function startSet() {
    updateSettingsFromForm();
    const validation = validateSettings(app.settings);
    els.settingsValidation.textContent = validation;
    if (validation) return;

    clearTimer();
    app.paused = false;
    els.pauseOverlay.hidden = true;
    app.set = {
      key: choice(app.settings.keys),
      orientationClef: choice(app.settings.clefs),
      currentIndex: 0,
      questions: [],
      results: [],
      prevCenterMidi: null,
      currentQuestion: null
    };
    app.acceptingAnswers = false;
    els.feedbackLine.textContent = "";
    showScreen("orientation");
    renderOrientationStaff();
  }

  function beginPreparedSet() {
    if (!app.set) {
      startSet();
      return;
    }
    showScreen("quiz");
    nextQuestion();
  }

  function generateQuestion() {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const clef = choice(app.settings.clefs);
      const chord = generateChord(app.set.key);
      if (!chord) continue;
      const inversion = chooseInversion(chord);
      const voicing = generateVoicing(chord, clef, inversion);
      if (!voicing) continue;
      const texture = choice(app.settings.textures);
      const contour = choice(app.settings.contours);
      const entryPoint = choice(app.settings.entryPoints);
      const length = chooseEventCount();
      const events = buildNotationEvents(voicing, chord, texture, contour, entryPoint, length);
      const question = {
        id: `q-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        key: app.set.key,
        clef,
        chord,
        inversion,
        voicing,
        texture,
        contour,
        events,
        correctAnswer: {
          rootLetter: chord.root.letter,
          accidental: chord.root.accidental,
          rootPc: chord.root.pc,
          quality: chord.quality,
          function: chord.functionAnswer
        }
      };
      if (validatePhysicalPlayability(question)) {
        app.set.prevCenterMidi = Math.round(mean(events.flatMap((event) => event.notes.map((note) => note.midi))));
        return question;
      }
    }
    throw new Error("The generator could not find a playable question with the current settings. Try allowing one more arpeggio span option, clef, or arpeggio length.");
  }

  function generateChord(key) {
    const candidates = buildHarmonyCandidates(app.settings, key);
    if (!candidates.length) return null;
    const diatonic = candidates.filter((candidate) => candidate.type === "diatonic");
    const nonDiatonic = candidates.filter((candidate) => candidate.type !== "diatonic");
    const targetDiatonic = Math.random() * 100 < app.settings.diatonicPercent;
    if (targetDiatonic && diatonic.length) return choice(diatonic);
    if (nonDiatonic.length) return choice(nonDiatonic);
    if (diatonic.length) return choice(diatonic);
    return choice(candidates);
  }

  function buildHarmonyCandidates(settings, key) {
    const scale = majorScale(key);
    const selectedQualities = new Set(settings.chordQualities);
    const candidates = [];
    const addCandidate = (candidate) => {
      if (!selectedQualities.has(candidate.quality)) return;
      if (!["", "b", "#"].includes(candidate.root.accidental)) return;
      if (candidate.type !== "diatonic" && isDiatonicEquivalent(candidate, scale)) return;
      const chord = finalizeChord(candidate, key);
      if (chord) candidates.push(chord);
    };

    if (settings.harmonyTypes.includes("diatonic")) {
      const triadQualities = ["major", "minor", "minor", "major", "major", "minor", "diminished"];
      const seventhQualities = ["major7", "minor7", "minor7", "major7", "dominant7", "minor7", "halfDim7"];
      scale.forEach((root, index) => {
        addCandidate({ type: "diatonic", root, quality: triadQualities[index], roman: DEGREE_ROMANS[index], functionAnswer: DEGREE_ROMANS[index] });
        addCandidate({ type: "diatonic", root, quality: seventhQualities[index], roman: DEGREE_ROMANS[index], functionAnswer: DEGREE_ROMANS[index] });
        addCandidate({ type: "diatonic", root, quality: "sus2", roman: DEGREE_ROMANS[index], functionAnswer: DEGREE_ROMANS[index] });
        addCandidate({ type: "diatonic", root, quality: "sus4", roman: DEGREE_ROMANS[index], functionAnswer: DEGREE_ROMANS[index] });
      });
    }

    if (settings.harmonyTypes.includes("secondary")) {
      [
        { target: 4, label: "V/V" },
        { target: 1, label: "V/ii" },
        { target: 2, label: "V/iii" },
        { target: 3, label: "V/IV" },
        { target: 5, label: "V/vi" }
      ].forEach((item) => {
        const target = scale[item.target];
        const rootPc = mod(target.pc + 7, 12);
        const rootLetter = shiftLetter(target.letter, 4);
        const root = makeNoteName(rootLetter, rootPc);
        addCandidate({ type: "secondary", root, quality: "dominant7", roman: item.label, functionAnswer: "Other" });
        addCandidate({ type: "secondary", root, quality: "major", roman: item.label, functionAnswer: "Other" });
      });
    }

    if (settings.harmonyTypes.includes("borrowed")) {
      [
        { degree: 3, quality: "minor", roman: "iv", alter: 0 },
        { degree: 5, quality: "major", roman: "bVI", alter: -1 },
        { degree: 6, quality: "major", roman: "bVII", alter: -1 },
        { degree: 2, quality: "major", roman: "bIII", alter: -1 },
        { degree: 1, quality: "diminished", roman: "ii°", alter: 0 }
      ].forEach((item) => {
        const source = scale[item.degree];
        const root = makeNoteName(source.letter, mod(source.pc + item.alter, 12));
        addCandidate({ type: "borrowed", root, quality: item.quality, roman: item.roman, functionAnswer: "Other" });
      });
    }

    return candidates;
  }

  function finalizeChord(candidate, key) {
    const quality = QUALITY_DEFS[candidate.quality];
    if (!quality) return null;
    const tones = quality.intervals.map((interval, index) => {
      const letter = shiftLetter(candidate.root.letter, quality.letterOffsets[index]);
      const note = makeNoteName(letter, mod(candidate.root.pc + interval, 12));
      return { ...note, slot: quality.slots[index], interval };
    });
    if (tones.some((tone) => tone.accidental === "bb" || tone.accidental === "##")) return null;
    const pitchClasses = tones.map((tone) => tone.pc).sort((a, b) => a - b);
    return {
      key,
      type: candidate.type,
      root: candidate.root,
      quality: candidate.quality,
      qualityLabel: quality.label,
      roman: candidate.roman,
      functionAnswer: candidate.functionAnswer,
      tones,
      pitchClasses
    };
  }

  function isDiatonicEquivalent(candidate, scale) {
    if (candidate.type === "diatonic") return false;
    const rootIndex = scale.findIndex((degree) => degree.pc === candidate.root.pc);
    if (rootIndex === -1) return false;
    const diatonicTriads = ["major", "minor", "minor", "major", "major", "minor", "diminished"];
    const diatonicSevenths = ["major7", "minor7", "minor7", "major7", "dominant7", "minor7", "halfDim7"];
    return candidate.quality === diatonicTriads[rootIndex] || candidate.quality === diatonicSevenths[rootIndex];
  }

  function generateVoicing(chord, clef, inversion) {
    const isSeventh = chord.tones.length === 4;
    const ranges = getClefRanges(clef);
    const templates = shuffle(getTemplates(isSeventh));
    for (const templateInfo of templates) {
      const template = templateInfo.template;
      const targetCenter = chooseTargetCenter(clef, template);
      const rootMidis = midiCandidatesForPc(chord.root.pc)
        .sort((a, b) => Math.abs(a - targetCenter) - Math.abs(b - targetCenter));
      for (const rootMidi of rootMidis) {
        const degreeMap = buildDegreeMap(chord, rootMidi, inversion);
        if (!degreeMap) continue;
        const templateNotes = template.map((degree) => degreeMap[degree]).filter(Boolean);
        if (templateNotes.length !== template.length) continue;
        const midis = templateNotes.map((note) => note.midi);
        const totalSpan = Math.max(...midis) - Math.min(...midis);
        if (midis.some((midi) => midi < ranges.min || midi > ranges.max)) continue;
        if (!spanMatchesGroup(templateInfo.spanGroup, template, totalSpan, isSeventh)) continue;
        return {
          template,
          spanGroup: templateInfo.spanGroup,
          targetCenter,
          degreeMap,
          baseNotes: Object.values(degreeMap).filter((note, index, arr) => arr.findIndex((item) => item.slot === note.slot) === index)
        };
      }
    }
    return null;
  }

  function buildDegreeMap(chord, rootMidi, inversion) {
    const chordSlots = chord.tones.map((tone) => tone.slot);
    let inversionSlot = 1;
    if (inversion === "first") inversionSlot = chordSlots[1] || 1;
    if (inversion === "second") inversionSlot = chordSlots[2] || 1;
    if (inversion === "third") inversionSlot = chordSlots[3] || 1;
    const inversionIndex = chordSlots.indexOf(inversionSlot);
    if (inversionIndex < 0) return null;
    const orderedTones = [...chord.tones.slice(inversionIndex), ...chord.tones.slice(0, inversionIndex)];
    const map = {};
    let previousMidi = null;
    orderedTones.forEach((tone) => {
      let midi = rootMidi + tone.interval;
      while (previousMidi !== null && midi <= previousMidi) midi += 12;
      map[tone.slot] = { ...tone, midi };
      previousMidi = midi;
    });
    [0, 1, 2].forEach((octaveOffset) => {
      chord.tones.forEach((tone) => {
        const degree = tone.slot + (octaveOffset * 7);
        if (map[tone.slot]) {
          map[degree] = { ...map[tone.slot], slot: degree, midi: map[tone.slot].midi + (octaveOffset * 12) };
        }
      });
    });
    return map;
  }

  function getTemplates(isSeventh) {
    const groups = app.settings.voicingGroups.length ? app.settings.voicingGroups : ["basic"];
    return groups.flatMap((group) => buildTemplatesForSpanGroup(group, isSeventh));
  }

  function buildTemplatesForSpanGroup(spanGroup, isSeventh) {
    const ladder = isSeventh ? DEGREE_LADDERS.seventh : DEGREE_LADDERS.triad;
    const noteCount = isSeventh ? 4 : 3;
    if (spanGroup === "basic") {
      return ladder
        .slice(0, -(noteCount - 1))
        .map((_, index) => ({
          spanGroup,
          template: ladder.slice(index, index + noteCount)
        }));
    }

    const templates = combinations(ladder, noteCount)
      .filter((template) => {
        const degreeSpan = getTemplateDegreeSpan(template);
        const estimatedSpan = estimateTemplateSemitoneSpan(template);
        if (!templateContainsAllChordTones(template, isSeventh)) return false;
        if (spanGroup === "open") return degreeSpan > closedDegreeSpanLimit(isSeventh) && estimatedSpan > 12 && estimatedSpan <= 19;
        if (spanGroup === "wide") return degreeSpan > 9 && estimatedSpan > 19 && estimatedSpan < 24;
        return false;
      })
      .map((template) => ({ spanGroup, template }));
    return templates;
  }

  function templateContainsAllChordTones(template, isSeventh) {
    const required = isSeventh ? [1, 3, 5, 7] : [1, 3, 5];
    const present = new Set(template.map((degree) => normalizeChordDegree(degree)));
    return required.every((degree) => present.has(degree));
  }

  function closedDegreeSpanLimit(isSeventh) {
    return isSeventh ? 6 : 5;
  }

  function getTemplateDegreeSpan(template) {
    return template[template.length - 1] - template[0];
  }

  function spanMatchesGroup(spanGroup, template, totalSpan, isSeventh) {
    const degreeSpan = getTemplateDegreeSpan(template);
    if (spanGroup === "basic") return degreeSpan <= closedDegreeSpanLimit(isSeventh) && totalSpan <= 12;
    if (spanGroup === "open") return degreeSpan > closedDegreeSpanLimit(isSeventh) && totalSpan > 12 && totalSpan <= 19;
    if (spanGroup === "wide") return degreeSpan > 9 && totalSpan > 19 && totalSpan < 24;
    return false;
  }

  function normalizeChordDegree(degree) {
    return ((degree - 1) % 7) + 1;
  }

  function chooseInversion(chord) {
    const usable = app.settings.inversions.filter((inversion) => inversion !== "third" || chord.tones.length === 4);
    return choice(usable.length ? usable : ["root"]);
  }

  function chooseTargetCenter(clef, template) {
    const ranges = getClefRanges(clef);
    const movementChoice = choice(app.settings.movement);
    const maxMove = { small: 4, medium: 9, large: 17 }[movementChoice] || 9;
    const templateSpanEstimate = estimateTemplateSemitoneSpan(template);
    const halfSpan = Math.ceil(templateSpanEstimate / 2);
    const lo = ranges.min + halfSpan;
    const hi = ranges.max - halfSpan;
    let target = randInt(lo, hi);
    if (app.set?.prevCenterMidi !== null && Number.isFinite(app.set.prevCenterMidi)) {
      const min = Math.max(lo, app.set.prevCenterMidi - maxMove);
      const max = Math.min(hi, app.set.prevCenterMidi + maxMove);
      if (min <= max) target = randInt(min, max);
    }
    return target;
  }

  function getClefRanges(clef) {
    if (clef === "bass") {
      return { min: 36, max: 64 };
    }
    return { min: 55, max: 84 };
  }

  function estimateTemplateSemitoneSpan(template) {
    const roughIntervals = { 1: 0, 3: 4, 5: 7, 7: 10 };
    const values = template.map((degree) => {
      const normalized = normalizeChordDegree(degree);
      const octave = Math.floor((degree - 1) / 7);
      return (roughIntervals[normalized] || 0) + (octave * 12);
    });
    return Math.max(...values) - Math.min(...values);
  }

  function chooseEventCount() {
    const length = choice(app.settings.arpeggioLengths);
    if (length === "short") return randInt(3, 4);
    if (length === "medium") return randInt(5, 6);
    return randInt(7, 9);
  }

  function buildNotationEvents(voicing, chord, texture, contour, entryPoint, length) {
    let sequence = expandTemplate(voicing.template, voicing.degreeMap, length);
    sequence = applyContour(sequence, contour);
    sequence = rotateForEntryPoint(sequence, entryPoint);
    sequence = ensureChordTonesInFirstEvents(sequence, voicing.template, length);
    const events = [];
    for (let index = 0; index < length; index += 1) {
      const base = sequence[index % sequence.length];
      const eventNotes = [base];
      if (texture === "medium" && Math.random() < 0.22) {
        const partner = nearbyChordTone(base, sequence, 12);
        if (partner) eventNotes.push(partner);
      }
      if (texture === "hard") {
        const roll = Math.random();
        if (roll < 0.2) {
          eventNotes.push({ ...base, midi: base.midi + 12, octaveClone: true });
        } else if (roll < 0.48) {
          const partner = nearbyChordTone(base, sequence, 12);
          if (partner) eventNotes.push(partner);
        } else if (roll < 0.62) {
          const cluster = sequence.filter((note) => Math.abs(note.midi - base.midi) <= 9).slice(0, 3);
          cluster.forEach((note) => {
            if (!eventNotes.some((existing) => existing.midi === note.midi)) eventNotes.push(note);
          });
        }
      }
      events.push({
        notes: eventNotes
          .sort((a, b) => a.midi - b.midi)
          .map((note) => midiToSpelledNote(note, chord.key))
      });
    }
    return events;
  }

  function ensureChordTonesInFirstEvents(sequence, template, length) {
    const required = Array.from(new Set(template.map((degree) => normalizeChordDegree(degree))));
    const protectedPrefix = sequence.slice(0, length);
    const present = new Set(protectedPrefix.map((note) => normalizeChordDegree(note.slot)));
    const missing = required.filter((degree) => !present.has(degree));
    if (!missing.length) return sequence;

    const repaired = [...sequence];
    missing.forEach((degree, index) => {
      const replacement = sequence.find((note) => normalizeChordDegree(note.slot) === degree);
      if (!replacement) return;
      const replaceIndex = Math.max(0, length - 1 - index);
      repaired[replaceIndex] = replacement;
    });
    return repaired;
  }

  function expandTemplate(template, degreeMap, length) {
    const notes = [];
    while (notes.length < Math.max(length, template.length)) {
      template.forEach((degree) => {
        const note = degreeMap[degree] || degreeMap[1];
        if (note) notes.push({ ...note });
      });
    }
    return notes.slice(0, Math.max(length, template.length));
  }

  function applyContour(notes, contour) {
    const sorted = [...notes].sort((a, b) => a.midi - b.midi);
    const resolvedContour = contour === "turnaround"
      ? choice(["upDown", "downUp"])
      : contour === "mixed"
        ? choice(["zigzag", "outward", "inward"])
        : contour;
    if (resolvedContour === "ascending") return sorted;
    if (resolvedContour === "descending") return sorted.reverse();
    if (resolvedContour === "zigzag") {
      const result = [];
      let low = 0;
      let high = sorted.length - 1;
      while (low <= high) {
        result.push(sorted[low]);
        if (low !== high) result.push(sorted[high]);
        low += 1;
        high -= 1;
      }
      return result;
    }
    if (resolvedContour === "upDown" || resolvedContour === "downUp") {
      const up = sorted;
      const down = sorted.slice(1, -1).reverse();
      const result = resolvedContour === "upDown" ? [...up, ...down] : [...up, ...down].reverse();
      return result.length ? result : notes;
    }
    if (resolvedContour === "outward" || resolvedContour === "inward") {
      const center = Math.floor((sorted.length - 1) / 2);
      const result = [sorted[center]];
      for (let offset = 1; result.length < sorted.length; offset += 1) {
        if (center - offset >= 0) result.push(sorted[center - offset]);
        if (center + offset < sorted.length) result.push(sorted[center + offset]);
      }
      return resolvedContour === "outward" ? result : result.reverse();
    }
    return notes;
  }

  function rotateForEntryPoint(notes, entryPoint) {
    if (notes.length < 2 || entryPoint === "random") return rotate(notes, randInt(0, notes.length - 1));
    let index = 0;
    if (entryPoint === "highest") {
      index = notes.reduce((best, note, i) => (note.midi > notes[best].midi ? i : best), 0);
    } else if (entryPoint === "inner") {
      const sortedIndexes = notes.map((note, i) => ({ midi: note.midi, i })).sort((a, b) => a.midi - b.midi);
      index = sortedIndexes[Math.floor(sortedIndexes.length / 2)].i;
    } else {
      index = notes.reduce((best, note, i) => (note.midi < notes[best].midi ? i : best), 0);
    }
    return rotate(notes, index);
  }

  function nearbyChordTone(base, sequence, maxSpan) {
    const candidates = sequence.filter((note) => note.midi !== base.midi && Math.abs(note.midi - base.midi) <= maxSpan);
    return candidates.length ? choice(candidates) : null;
  }

  function validatePhysicalPlayability(question) {
    const ranges = getClefRanges(question.clef);
    const allMidi = question.events.flatMap((event) => event.notes.map((note) => note.midi));
    if (allMidi.some((midi) => midi < ranges.min || midi > ranges.max)) return false;
    const totalSpan = Math.max(...allMidi) - Math.min(...allMidi);
    const spanGroup = question.voicing.spanGroup || "basic";
    if (!spanMatchesGroup(spanGroup, question.voicing.template, totalSpan, question.chord.tones.length === 4)) return false;
    if (!notationEventsContainAllChordTones(question)) return false;
    return question.events.every((event) => {
      if (event.notes.length <= 1) return true;
      const span = event.notes[event.notes.length - 1].midi - event.notes[0].midi;
      if (event.notes.length >= 3) return span <= 10;
      return span <= 12;
    });
  }

  function notationEventsContainAllChordTones(question) {
    const required = new Set(question.chord.tones.map((tone) => normalizeChordDegree(tone.slot)));
    const present = new Set(
      question.events
        .flatMap((event) => event.notes)
        .map((note) => normalizeChordDegree(note.slot))
    );
    return Array.from(required).every((degree) => present.has(degree));
  }

  function renderQuestion() {
    const question = app.set.currentQuestion;
    els.questionNumber.textContent = `${app.set.currentIndex + 1} / ${app.settings.questionsPerSet}`;
    els.quizMeta.textContent = `${question.clef === "bass" ? "Bass" : "Treble"} clef`;
    els.feedbackLine.textContent = "";
    renderNotation(els.notation, question);
    renderAnswerPanel();
    startTimer();
  }

  function renderNotation(container, question) {
    container.innerHTML = "";
    if (!window.Vex?.Flow) {
      container.textContent = "Notation could not load. Check the VexFlow CDN connection.";
      return;
    }
    const VF = window.Vex.Flow;
    const width = Math.max(320, container.clientWidth || 360);
    const height = Math.max(150, Math.min(190, Math.round(width * 0.3)));
    const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
    renderer.resize(width, height);
    const context = renderer.getContext();
    context.setFont("Arial", 10);
    const stave = new VF.Stave(12, Math.round(height * 0.28), width - 24);
    stave.addClef(question.clef);
    stave.addKeySignature(question.key);
    stave.setContext(context).draw();

    const staveNotes = question.events.map((event) => {
      const note = new VF.StaveNote({
        clef: question.clef,
        keys: event.notes.map((item) => item.vexKey),
        duration: "8"
      });
      event.notes.forEach((item, index) => {
        if (item.vexAccidental) note.addModifier(new VF.Accidental(item.vexAccidental), index);
      });
      return note;
    });
    const beams = buildHalfBarBeams(VF, staveNotes);
    const voice = new VF.Voice({ num_beats: staveNotes.length, beat_value: 8 });
    voice.setMode(VF.Voice.Mode.SOFT);
    voice.addTickables(staveNotes);
    new VF.Formatter().joinVoices([voice]).format([voice], width - 110);
    voice.draw(context, stave);
    beams.forEach((beam) => beam.setContext(context).draw());
  }

  function renderOrientationStaff() {
    const container = els.orientationNotation;
    container.innerHTML = "";
    if (!app.set) return;
    if (!window.Vex?.Flow) {
      container.textContent = "Notation could not load. Check the VexFlow CDN connection.";
      return;
    }
    const VF = window.Vex.Flow;
    const width = Math.max(320, container.clientWidth || 360);
    const height = Math.max(220, Math.min(320, Math.round(width * 0.48)));
    const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
    renderer.resize(width, height);
    const context = renderer.getContext();
    context.setFont("Arial", 10);
    const stave = new VF.Stave(12, Math.round(height * 0.38), width - 24);
    stave.addClef(app.set.orientationClef || app.settings.clefs[0] || "treble");
    stave.addKeySignature(app.set.key);
    stave.setContext(context).draw();
  }

  function buildHalfBarBeams(VF, staveNotes) {
    const beams = [];
    for (let index = 0; index < staveNotes.length; index += 4) {
      const group = staveNotes.slice(index, index + 4);
      if (group.length < 2) continue;
      try {
        beams.push(new VF.Beam(group));
      } catch (error) {
        try {
          beams.push(...VF.Beam.generateBeams(group));
        } catch (fallbackError) {
          // Beam drawing is a visual enhancement; the notes remain readable without it.
        }
      }
    }
    return beams;
  }

  function renderAnswerPanel() {
    els.answerPanel.classList.remove("is-disabled");
    els.answerPanel.innerHTML = "";
    const sections = [
      { key: "rootLetter", title: "Root letter", options: LETTERS.map((letter) => ({ value: letter, label: letter })), gridClass: "root-grid" },
      { key: "accidental", title: "Accidental", options: UI_ACCIDENTALS, gridClass: "accidental-grid" },
      { key: "quality", title: "Chord quality", options: getActiveQualityOptions(), gridClass: "quality-answer-grid" },
      { key: "function", title: "Function", options: ROMANS.map((value) => ({ value, label: value })), gridClass: "" }
    ];
    sections.forEach((section) => {
      const wrapper = document.createElement("section");
      wrapper.className = "answer-section";
      wrapper.innerHTML = `<h3>${section.title}</h3><div class="answer-grid ${section.gridClass}" data-answer-section="${section.key}"></div>`;
      const grid = wrapper.querySelector(".answer-grid");
      section.options.forEach((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "answer-button";
        button.dataset.section = section.key;
        button.dataset.value = option.value;
        button.innerHTML = option.htmlLabel || escapeHtml(option.label);
        if (option.fullLabel) {
          button.setAttribute("aria-label", option.fullLabel);
          button.title = option.fullLabel;
        }
        button.addEventListener("click", () => handleAnswerSelection(section.key, option.value));
        grid.appendChild(button);
      });
      els.answerPanel.appendChild(wrapper);
    });
    app.set.currentAnswer = {};
    app.acceptingAnswers = true;
  }

  function getActiveQualityOptions() {
    return app.settings.chordQualities
      .filter((quality) => QUALITY_DEFS[quality])
      .map((quality) => ({
        value: quality,
        label: QUALITY_DEFS[quality].shortLabel || QUALITY_DEFS[quality].label,
        htmlLabel: QUALITY_DEFS[quality].shortLabel || QUALITY_DEFS[quality].label,
        fullLabel: QUALITY_DEFS[quality].label
      }));
  }

  function handleAnswerSelection(section, value) {
    if (!app.acceptingAnswers || app.paused) return;
    app.set.currentAnswer[section] = value;
    els.answerPanel.querySelectorAll(`[data-section="${section}"]`).forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.value === value);
    });
    if (["rootLetter", "accidental", "quality", "function"].every((key) => key in app.set.currentAnswer)) {
      submitAnswer(false);
    }
  }

  function submitAnswer(timedOut) {
    if (!app.acceptingAnswers && !timedOut) return;
    app.acceptingAnswers = false;
    clearTimer();
    const question = app.set.currentQuestion;
    const userAnswer = { ...app.set.currentAnswer };
    const checked = checkAnswer(question, userAnswer, timedOut);
    const result = {
      question,
      userAnswer,
      checked,
      correct: checked.allCorrect,
      timedOut,
      elapsedMs: app.elapsedMs
    };
    app.set.results.push(result);
    showFeedback(result);
    app.feedbackTimeout = setTimeout(nextQuestion, FEEDBACK_DELAY_MS);
  }

  function checkAnswer(question, userAnswer, timedOut) {
    const correct = question.correctAnswer;
    const rootPc = userAnswer.rootLetter !== undefined && userAnswer.accidental !== undefined
      ? notePc(userAnswer.rootLetter, userAnswer.accidental)
      : null;
    const suspendedEquivalent = validSuspendedEquivalent(question, userAnswer.quality, rootPc);
    const pitchCorrect = rootPc === correct.rootPc || suspendedEquivalent;
    const rootLetterCorrect = pitchCorrect || userAnswer.rootLetter === correct.rootLetter;
    const accidentalCorrect = pitchCorrect || userAnswer.accidental === correct.accidental;
    const rootCorrect = pitchCorrect;
    const qualityCorrect = userAnswer.quality === correct.quality || suspendedEquivalent;
    const functionCorrect = userAnswer.function === correct.function;
    const completed = ["rootLetter", "accidental", "quality", "function"].every((key) => userAnswer[key] !== undefined);
    return {
      rootCorrect,
      rootLetterCorrect,
      accidentalCorrect,
      qualityCorrect,
      functionCorrect,
      completed,
      timedOut,
      allCorrect: completed && rootCorrect && qualityCorrect && functionCorrect
    };
  }

  function validSuspendedEquivalent(question, selectedQuality, selectedRootPc) {
    const correctQuality = question.correctAnswer.quality;
    if (!["sus2", "sus4"].includes(correctQuality) || !["sus2", "sus4"].includes(selectedQuality)) return false;
    if (selectedRootPc === null) return false;
    const selected = QUALITY_DEFS[selectedQuality].intervals.map((interval) => mod(selectedRootPc + interval, 12)).sort((a, b) => a - b);
    return samePitchClassSet(selected, question.chord.pitchClasses);
  }

  function showFeedback(result) {
    const { question, userAnswer, checked } = result;
    const correct = question.correctAnswer;
    els.answerPanel.classList.add("is-disabled");
    els.answerPanel.querySelectorAll(".answer-button").forEach((button) => {
      button.disabled = true;
      const section = button.dataset.section;
      const value = button.dataset.value;
      const selected = userAnswer[section] === value;
      const correctValue = section === "function" ? correct.function : correct[section];
      const rootSection = section === "rootLetter" || section === "accidental";

      if (checked.allCorrect && selected) {
        button.classList.add("is-correct", "pulse");
        return;
      }
      if (rootSection) {
        const sectionCorrect = section === "rootLetter" ? checked.rootLetterCorrect : checked.accidentalCorrect;
        if (sectionCorrect && selected) button.classList.add("is-correct");
        if (!sectionCorrect && selected) button.classList.add("is-wrong");
        if (!sectionCorrect && value === correctValue) button.classList.add("is-correct");
        return;
      }
      const sectionCorrect = section === "quality" ? checked.qualityCorrect : checked.functionCorrect;
      if (selected && sectionCorrect) button.classList.add("is-correct");
      if (selected && !sectionCorrect) button.classList.add("is-wrong");
      if (!sectionCorrect && value === correctValue) button.classList.add("is-correct");
    });
    els.feedbackLine.textContent = checked.allCorrect ? "Correct" : `Correct answer: ${formatAnswer(question.correctAnswer)}`;
  }

  function nextQuestion() {
    clearTimeout(app.feedbackTimeout);
    if (!app.set) return;
    if (app.set.currentIndex >= app.settings.questionsPerSet) {
      renderSummary();
      return;
    }
    try {
      const question = generateQuestion();
      app.set.currentQuestion = question;
      app.set.questions.push(question);
      renderQuestion();
      app.set.currentIndex += 1;
    } catch (error) {
      els.feedbackLine.textContent = error.message;
      app.acceptingAnswers = false;
      clearTimer();
    }
  }

  function startTimer() {
    clearTimer();
    app.remainingMs = app.settings.timePerQuestion * 1000;
    app.elapsedMs = 0;
    app.questionStartedAt = performance.now();
    updateTimerDisplay();
    app.timerId = setInterval(() => {
      if (app.paused) return;
      const now = performance.now();
      app.elapsedMs = now - app.questionStartedAt;
      app.remainingMs = app.settings.timePerQuestion * 1000 - app.elapsedMs;
      if (app.remainingMs <= 0 && app.settings.timerMode === "autoAdvance") {
        submitAnswer(true);
        return;
      }
      updateTimerDisplay();
    }, 100);
  }

  function updateTimerDisplay() {
    const total = app.settings.timePerQuestion * 1000;
    const isNegative = app.remainingMs < 0;
    const absSeconds = Math.ceil(Math.abs(app.remainingMs) / 1000);
    els.timerText.textContent = isNegative ? `-${absSeconds}s` : `${Math.ceil(app.remainingMs / 1000)}s`;
    els.timerText.classList.toggle("is-negative", isNegative);
    els.timerBar.classList.toggle("is-negative", isNegative);
    els.timerBar.style.width = isNegative ? "100%" : `${clamp((app.remainingMs / total) * 100, 0, 100)}%`;
  }

  function clearTimer() {
    if (app.timerId) clearInterval(app.timerId);
    app.timerId = null;
  }

  function pauseQuiz() {
    if (!app.set || app.paused) return;
    app.paused = true;
    clearTimer();
    els.answerPanel.classList.add("is-disabled");
    els.answerPanel.querySelectorAll("button").forEach((button) => { button.disabled = true; });
    els.pauseOverlay.hidden = false;
  }

  function resumeQuiz() {
    if (!app.set || !app.paused) return;
    app.paused = false;
    app.questionStartedAt = performance.now() - app.elapsedMs;
    els.pauseOverlay.hidden = true;
    els.answerPanel.classList.remove("is-disabled");
    els.answerPanel.querySelectorAll("button").forEach((button) => { button.disabled = !app.acceptingAnswers; });
    app.timerId = setInterval(() => {
      const now = performance.now();
      app.elapsedMs = now - app.questionStartedAt;
      app.remainingMs = app.settings.timePerQuestion * 1000 - app.elapsedMs;
      if (app.remainingMs <= 0 && app.settings.timerMode === "autoAdvance") {
        submitAnswer(true);
        return;
      }
      updateTimerDisplay();
    }, 100);
  }

  function endSet() {
    clearTimer();
    clearTimeout(app.feedbackTimeout);
    if (app.set?.currentQuestion && app.acceptingAnswers && Object.keys(app.set.currentAnswer || {}).length) {
      const question = app.set.currentQuestion;
      const userAnswer = { ...app.set.currentAnswer };
      const checked = checkAnswer(question, userAnswer, false);
      app.set.results.push({ question, userAnswer, checked, correct: false, timedOut: false, elapsedMs: app.elapsedMs, incomplete: true });
    }
    app.acceptingAnswers = false;
    app.paused = false;
    els.pauseOverlay.hidden = true;
    renderSummary();
  }

  function renderSummary() {
    clearTimer();
    showScreen("summary");
    const results = app.set?.results || [];
    const correct = results.filter((result) => result.correct).length;
    const total = results.length;
    const percentage = total ? Math.round((correct / total) * 100) : 0;
    const averageMs = total ? results.reduce((sum, result) => sum + (result.elapsedMs || 0), 0) / total : 0;
    els.summaryStats.innerHTML = `
      <div class="stat"><strong>${correct}/${total}</strong><span>Correct</span></div>
      <div class="stat"><strong>${percentage}%</strong><span>Score</span></div>
      <div class="stat"><strong>${escapeHtml(app.set?.key || "-")}</strong><span>Key used</span></div>
      <div class="stat"><strong>${formatSeconds(averageMs)}</strong><span>Average time</span></div>
    `;
    els.summaryList.innerHTML = "";
    if (!results.length) {
      els.summaryList.innerHTML = `<div class="review-item"><div class="review-detail">No answered questions yet.</div></div>`;
      return;
    }
    results.forEach((result, index) => {
      const item = document.createElement("article");
      item.className = `review-item ${result.correct ? "is-correct" : "is-wrong"}`;
      item.innerHTML = `
        <div class="review-top">
          <span>Question ${index + 1}</span>
          <span>${result.correct ? "Correct" : result.incomplete ? "Incomplete" : "Wrong"}</span>
        </div>
        <div class="review-detail">
          <div><b>Chord:</b> ${escapeHtml(formatChord(result.question.chord))}</div>
          <div><b>Your answer:</b> ${escapeHtml(formatUserAnswer(result.userAnswer))}</div>
          <div><b>Correct answer:</b> ${escapeHtml(formatAnswer(result.question.correctAnswer))}</div>
          <div><b>Context:</b> ${escapeHtml(result.question.key)} major, ${escapeHtml(result.question.clef)} clef, ${escapeHtml(result.question.chord.roman)}</div>
        </div>
      `;
      els.summaryList.appendChild(item);
    });
  }

  function showScreen(name) {
    els.settingsScreen.classList.toggle("is-active", name === "settings");
    els.orientationScreen.classList.toggle("is-active", name === "orientation");
    els.quizScreen.classList.toggle("is-active", name === "quiz");
    els.summaryScreen.classList.toggle("is-active", name === "summary");
    if (name !== "quiz") clearTimer();
  }

  function majorScale(key) {
    const tonic = parseNoteName(key);
    const startIndex = LETTERS.indexOf(tonic.letter);
    const majorIntervals = [0, 2, 4, 5, 7, 9, 11];
    return majorIntervals.map((interval, index) => {
      const letter = LETTERS[(startIndex + index) % LETTERS.length];
      return makeNoteName(letter, mod(tonic.pc + interval, 12));
    });
  }

  function makeNoteName(letter, pc) {
    const natural = NATURAL_PC[letter];
    let best = "";
    for (const [accidental, delta] of Object.entries(ACCIDENTAL_TO_DELTA)) {
      if (mod(natural + delta, 12) === pc) {
        if (["", "b", "#"].includes(accidental)) return { letter, accidental, pc };
        best = accidental;
      }
    }
    return { letter, accidental: best, pc };
  }

  function parseNoteName(name) {
    const letter = name[0].toUpperCase();
    const accidental = name.slice(1).replace("♭", "b").replace("♯", "#");
    return { letter, accidental, pc: notePc(letter, accidental) };
  }

  function notePc(letter, accidental) {
    return mod(NATURAL_PC[letter] + (ACCIDENTAL_TO_DELTA[accidental] || 0), 12);
  }

  function midiToSpelledNote(note, key) {
    const letter = note.letter;
    const accidental = note.accidental || "";
    const pc = notePc(letter, accidental);
    const octave = Math.floor((note.midi - pc) / 12) - 1;
    const keyAccidental = keyAccidentals(key)[letter] || "";
    let vexAccidental = "";
    if (accidental !== keyAccidental) vexAccidental = accidental || "n";
    return {
      ...note,
      letter,
      accidental,
      pc,
      octave,
      vexKey: `${letter.toLowerCase()}${accidental}/${octave}`,
      vexAccidental,
      label: `${letter}${ACCIDENTAL_LABELS[accidental] || ""}${octave}`
    };
  }

  function keyAccidentals(key) {
    const alterations = {};
    majorScale(key).forEach((note) => {
      if (note.accidental) alterations[note.letter] = note.accidental;
    });
    return alterations;
  }

  function closestMidiForPc(pc, target) {
    let best = pc;
    let bestDistance = Infinity;
    for (let midi = 24; midi <= 96; midi += 1) {
      if (midi % 12 !== pc) continue;
      const distance = Math.abs(midi - target);
      if (distance < bestDistance) {
        best = midi;
        bestDistance = distance;
      }
    }
    return best;
  }

  function midiCandidatesForPc(pc) {
    const candidates = [];
    for (let midi = 24; midi <= 96; midi += 1) {
      if (midi % 12 === pc) candidates.push(midi);
    }
    return candidates;
  }

  function formatSeconds(ms) {
    if (!ms) return "0s";
    const seconds = ms / 1000;
    return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`;
  }

  function formatChord(chord) {
    return `${chord.root.letter}${ACCIDENTAL_LABELS[chord.root.accidental] || ""} ${chord.qualityLabel}`;
  }

  function formatAnswer(answer) {
    return `${answer.rootLetter}${ACCIDENTAL_LABELS[answer.accidental] || ""}, ${QUALITY_DEFS[answer.quality].label}, ${answer.function}`;
  }

  function formatUserAnswer(answer) {
    const root = answer.rootLetter !== undefined || answer.accidental !== undefined
      ? `${answer.rootLetter || "?"}${ACCIDENTAL_LABELS[answer.accidental] || (answer.accidental === "" ? "♮" : "?")}`
      : "?";
    const quality = answer.quality ? QUALITY_DEFS[answer.quality].label : "?";
    const fn = answer.function || "?";
    return `${root}, ${quality}, ${fn}`;
  }

  function samePitchClassSet(a, b) {
    if (a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
  }

  function shiftLetter(letter, steps) {
    return LETTERS[mod(LETTERS.indexOf(letter) + steps, LETTERS.length)];
  }

  function rotate(items, index) {
    return [...items.slice(index), ...items.slice(0, index)];
  }

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = randInt(0, index);
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function combinations(items, size) {
    const results = [];
    const walk = (start, chosen) => {
      if (chosen.length === size) {
        results.push([...chosen]);
        return;
      }
      for (let index = start; index <= items.length - (size - chosen.length); index += 1) {
        chosen.push(items[index]);
        walk(index + 1, chosen);
        chosen.pop();
      }
    };
    walk(0, []);
    return results;
  }

  function choice(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function mean(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function mod(value, modulus) {
    return ((value % modulus) + modulus) % modulus;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function debounce(fn, delay) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(value);
    return String(value).replace(/"/g, '\\"');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  window.ArpeggioTrainer = {
    loadSettings,
    saveSettings,
    startSet,
    generateQuestion,
    generateChord,
    generateVoicing,
    validatePhysicalPlayability,
    renderNotation,
    handleAnswerSelection,
    submitAnswer,
    checkAnswer,
    showFeedback,
    nextQuestion,
    pauseQuiz,
    endSet,
    renderSummary
  };
})();

import { useState, useRef, useEffect } from "react";
import { useTypewriter } from "./useTypewriter";
import styles from "./GameTheme.module.css";

import CharacterSprite from "../../assets/CharacterGif.gif";
import SpeechBubbleGif from "../../assets/SpeechGif.gif";
import SpeechFrame from "../../assets/SpeechFrame.png";

/* ── Data contract ──────────────────────────────────────── */

interface DemographicPayload {
  agreed_to_consent: boolean;
  age_range: string;
  academic_background: string;
  data_viz_skill: number;
}

/* ── Step definitions ───────────────────────────────────── */

type StepId = "consent" | "age" | "major" | "skill" | "finish";

interface DialogueStep {
  id: StepId;
  text: string;
}

const STEPS: DialogueStep[] = [
  {
    id: "consent",
    text: "Incoming transmission...\n\nBefore we grant you access to the command center, we need your agreement. All data collected is anonymous and used for research purposes only.\n\nDo you consent to this operation?",
  },
  {
    id: "age",
    text: "Acknowledged, operative.\n\nFirst — how many cycles have you been active?",
  },
  {
    id: "major",
    text: "Noted. Now tell me...\n\nWhat sector do you hail from? Enter your academic background below.",
  },
  {
    id: "skill",
    text: "Almost there, recruit.\n\nOn a scale of 1 to 5, how would you rate your skill at decrypting visual data?",
  },
  {
    id: "finish",
    text: "All intel received. Your profile is locked in.\n\nThe command center awaits you, operative. Good luck out there.",
  },
];

const AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55+"];

/** Duration of one loop of SpeechGif.gif (43 frames × 20ms) */
const SPEECH_GIF_DURATION_MS = 860;

/* ── Phase state machine ────────────────────────────────── *
 *
 *   entering  →  active  →  exiting
 *
 *   entering : GIF plays once (~860ms) — first step only
 *   active   : static border-image box, text types / controls shown
 *              (between steps: text clears instantly, retypes next)
 *   exiting  : GIF plays for close — after final step only
 */

type Phase = "entering" | "active" | "exiting";

/* ── Component ──────────────────────────────────────────── */

interface OnboardingGameProps {
  onComplete?: (payload: DemographicPayload) => void;
}

export function OnboardingGame({ onComplete }: OnboardingGameProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [majorInput, setMajorInput] = useState("");
  const [phase, setPhase] = useState<Phase>("entering");

  // Collected answers
  const [consent, setConsent] = useState<boolean | null>(null);
  const [ageRange, setAgeRange] = useState("");
  const [major, setMajor] = useState("");
  const [skill, setSkill] = useState(0);

  // For restarting the GIF (forces remount via key)
  const [gifKey, setGifKey] = useState(0);

  // Capture first frame of CharacterSprite for "paused" state
  const [charIdleFrame, setCharIdleFrame] = useState("");

  // Pending callback after exiting completes
  const pendingExit = useRef<(() => void) | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        setCharIdleFrame(canvas.toDataURL("image/png"));
      }
    };
    img.src = CharacterSprite;
  }, []);

  const currentStep = STEPS[stepIndex];

  // Typing is enabled once we're in the "active" phase
  const { displayedText, isTyping } = useTypewriter(currentStep.text, 30, {
    enabled: phase === "active",
  });

  /* ── Phase transitions ─────────────────────────────── */

  // entering → active: after the GIF plays one loop
  useEffect(() => {
    if (phase !== "entering") return;
    const timer = setTimeout(() => setPhase("active"), SPEECH_GIF_DURATION_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  // exiting → complete: after the GIF plays for close
  useEffect(() => {
    if (phase !== "exiting") return;
    const timer = setTimeout(() => {
      if (pendingExit.current) {
        pendingExit.current();
        pendingExit.current = null;
      }
    }, SPEECH_GIF_DURATION_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  /* ── Handlers ───────────────────────────────────────── */

  const advance = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));

  const handleConsent = (agreed: boolean) => {
    setConsent(agreed);
    if (agreed) advance();
  };

  const handleAge = (range: string) => {
    setAgeRange(range);
    advance();
  };

  const handleMajorSubmit = () => {
    const value = majorInput.trim();
    if (!value) return;
    setMajor(value);
    advance();
  };

  const handleSkill = (level: number) => {
    setSkill(level);
    advance();
  };

  const handleFinish = () => {
    const payload: DemographicPayload = {
      agreed_to_consent: consent ?? false,
      age_range: ageRange,
      academic_background: major,
      data_viz_skill: skill,
    };
    pendingExit.current = () => onComplete?.(payload);
    setGifKey((k) => k + 1);
    setPhase("exiting");
  };

  /* ── Character sprite src ──────────────────────────── */

  // Animate character only while actively typing, pause on first frame otherwise
  const characterSrc =
    phase === "active" && isTyping
      ? CharacterSprite
      : charIdleFrame || CharacterSprite;

  /* ── Step-specific controls ─────────────────────────── */

  const renderControls = () => {
    if (isTyping || phase !== "active") return null;

    switch (currentStep.id) {
      case "consent":
        return (
          <div className={styles.controls}>
            <button
              className={styles.btn}
              onClick={() => handleConsent(true)}
            >
              I Accept
            </button>
            <button
              className={styles.btnDanger}
              onClick={() => handleConsent(false)}
            >
              Decline
            </button>
          </div>
        );

      case "age":
        return (
          <div className={styles.controls}>
            {AGE_RANGES.map((r) => (
              <button
                key={r}
                className={styles.btn}
                onClick={() => handleAge(r)}
              >
                {r}
              </button>
            ))}
          </div>
        );

      case "major":
        return (
          <div className={styles.inputRow}>
            <input
              className={styles.textInput}
              type="text"
              placeholder="e.g. Computer Science"
              value={majorInput}
              onChange={(e) => setMajorInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleMajorSubmit()}
              autoFocus
            />
            <button className={styles.btn} onClick={handleMajorSubmit}>
              Submit
            </button>
          </div>
        );

      case "skill":
        return (
          <div className={styles.controls}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                className={styles.btn}
                onClick={() => handleSkill(n)}
              >
                {n}
              </button>
            ))}
          </div>
        );

      case "finish":
        return (
          <div className={styles.controls}>
            <button className={styles.btn} onClick={handleFinish}>
              Enter Command Center
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  /* ── Decline state ──────────────────────────────────── */

  if (consent === false) {
    return (
      <div className={styles.scene}>
        <div className={styles.dialogueArea}>
          <img
            src={charIdleFrame || CharacterSprite}
            alt="Operative"
            className={styles.character}
          />
          <div
            className={styles.speechBox}
            style={
              { "--speech-frame": `url(${SpeechFrame})` } as React.CSSProperties
            }
          >
            <p className={styles.dialogueText}>
              Understood. Transmission terminated.
              {"\n\n"}You may close this window, operative.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main render ────────────────────────────────────── */

  const showGif = phase === "entering" || phase === "exiting";

  return (
    <div className={styles.scene}>
      <div className={styles.dialogueArea}>
        {/* ── Character + bubble row ── */}
        <div className={styles.bubbleRow}>
          <img
            src={characterSrc}
            alt="Operative"
            className={styles.character}
          />

          <div className={styles.speechWrapper}>
            {/* GIF overlay — fills wrapper during entering/exiting */}
            {showGif && (
              <img
                key={`speech-gif-${gifKey}`}
                src={SpeechBubbleGif}
                alt=""
                className={styles.speechGif}
              />
            )}

            {/* Static speech box — always visible; GIF covers it during enter/exit */}
            <div
              className={styles.speechBox}
              style={
                {
                  "--speech-frame": `url(${SpeechFrame})`,
                } as React.CSSProperties
              }
            >
              {phase === "active" && (
                <p className={styles.dialogueText}>
                  {displayedText}
                  {isTyping && <span className={styles.cursor} />}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Controls below bubble ── */}
        {renderControls()}
      </div>
    </div>
  );
}

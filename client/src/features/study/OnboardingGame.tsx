import { useEffect, useState } from "react";
import styles from "./OnboardingGame.module.css";
import { useSessionContext } from "./session/useSessionContext";
import { useTypewriter } from "./useTypewriter";

import CharacterSprite from "../../assets/CharacterSprite.png";
import CharacterSpriteTalking from "../../assets/CharacterSprite_Talking.png";
import SpeechSprite from "../../assets/SpeechSprite.png";

/* ── Data contract ──────────────────────────────────────── */

interface DemographicPayload {
  agreed_to_consent: boolean;
  age_range: string;
  academic_background: string;
  data_viz_skill: number;
}

/* ── Step definitions ───────────────────────────────────── */

type StepId = "consent" | "age" | "major" | "skill" | "finish" | "returning";

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
  {
    id: "returning",
    text: "Welcome back, operative. Your credentials have been verified.\n\nReady to rejoin the mission?",
  },
];

const AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55+"];

/** Duration of one loop of SpeechGif.gif (measured from binary: 860ms) */
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


  const { sessionId } = useSessionContext();

  useEffect(() => {
    // If user already has a session, jump to the "returning" step (last in array)
    if (sessionId && phase === "entering") {
      setStepIndex(STEPS.length - 1);
    }
  }, [sessionId, phase]);

  const currentStep = STEPS[stepIndex];

  // Typing is enabled once we're in the "active" phase
  const { displayedText, isTyping } = useTypewriter(currentStep.text, 15, {
    enabled: phase === "active",
  });

  /* ── Phase transitions ─────────────────────────────── */

  // Phase transitions
  useEffect(() => {
    if (phase === "entering") {
      const timer = setTimeout(
        () => setPhase("active"),
        SPEECH_GIF_DURATION_MS,
      );
      return () => clearTimeout(timer);
    }
    if (phase === "exiting") {
      const timer = setTimeout(() => {
        onComplete?.({
          agreed_to_consent: consent ?? true, // Assume true if returning
          age_range: ageRange,
          academic_background: major,
          data_viz_skill: skill,
        });
      }, SPEECH_GIF_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete, consent, ageRange, major, skill]);

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
    setPhase("exiting");
  };

  /* ── Character sprite src ──────────────────────────── */

  // Animate character only while actively typing
  const isTalking = phase === "active" && isTyping;
  const characterSrc = isTalking ? CharacterSpriteTalking : CharacterSprite;

  /* ── Step-specific controls ─────────────────────────── */

  const renderControls = () => {
    if (isTyping || phase !== "active") return null;

    switch (currentStep.id) {
      case "consent":
        return (
          <div className={styles.controls}>
            <button className={styles.btn} onClick={() => handleConsent(true)}>
              I Accept
            </button>
            <button
              className={`${styles.btn} ${styles.btnDanger}`}
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
      case "returning":
        return (
          <div className={styles.controls}>
            <button className={styles.btn} onClick={handleFinish}>
              Begin Mission
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
      <div className={styles.scrollArea}>
        <div className={styles.dialogueArea}>
          <div className={styles.bubbleRow}>
            <div
              className={styles.character}
              style={{ "--char-sprite": `url(${CharacterSprite})` } as any}
            />
            <div className={styles.speechWrapper}>
              <div
                className={`${styles.speechBox} ${styles.isActive}`}
                style={{ "--speech-sprite": `url(${SpeechSprite})` } as any}
              >
                <p className={styles.dialogueText}>
                  Understood. Transmission terminated.
                  {"\n\n"}You may close this window, operative.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    );
  }

  /* ── Main render ────────────────────────────────────── */


  return (
    <div className={styles.scene}>
      <div className={styles.scrollArea}>
        <div className={styles.dialogueArea}>
          {/* ── Character + bubble row ── */}
          <div className={styles.bubbleRow}>
            <div
              className={styles.character}
              style={{ "--char-sprite": `url(${characterSrc})` } as any}
            />

            <div className={styles.speechWrapper}>
              {/* Single element for both animation and background */}
              <div
                className={`${styles.speechBox} ${
                  phase === "entering"
                    ? styles.isEntering
                    : phase === "exiting"
                      ? styles.isExiting
                      : styles.isActive
                }`}
                style={{ "--speech-sprite": `url(${SpeechSprite})` } as any}
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

      {/* Preload images to prevent blinking on first talk */}
      <div style={{ display: "none" }}>
        <img src={CharacterSprite} alt="" />
        <img src={CharacterSpriteTalking} alt="" />
      </div>
    </div>
  );
}

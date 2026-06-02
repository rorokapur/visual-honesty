import { useEffect, useState } from "react";
import styles from "./Onboarding.module.css";
import { useSessionContext } from "./session/useSessionContext";
import { useTypewriter } from "./useTypewriter";

import CharacterSprite from "../../assets/CharacterSprite.png";
import CharacterSpriteTalking from "../../assets/CharacterSprite_Talking.png";
import SpeechSprite from "../../assets/SpeechSprite.png";

/* ── Data contract ──────────────────────────────────────── */

interface DemographicPayload {
  agreed_to_consent: boolean;
  education_level: string;
  academic_background: string;
  data_viz_skill: number;
}

/* ── Step definitions ───────────────────────────────────── */

type StepId = "consent" | "skill" | "finish" | "returning";

interface DialogueStep {
  id: StepId;
  text: string;
}

const STEPS: DialogueStep[] = [
  {
    id: "consent",
    text: "Incoming transmission...\n\nBy playing this game, you are contributing to an academic study on data visualization. We track your answers, reaction times, and anonymous session data to understand how humans perceive charts. Your data will be anonymized and may be published in open datasets. \n\nDo you consent to this operation?",
  },
  {
    id: "skill",
    text: "Acknowledged.\n\nOn a scale of 1 to 5, how would you rate your skill at reading charts and graphs?",
  },
  {
    id: "finish",
    text: "Intel received. Your profile is complete.\n\nThe command center awaits you. Good luck out there.",
  },
  {
    id: "returning",
    text: "Welcome back. Your credentials have been verified.\n\nReady to rejoin the mission?",
  },
];

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

interface OnboardingProps {
  onComplete?: (payload: DemographicPayload) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("entering");

  // Collected answers
  const [consent, setConsent] = useState<boolean | null>(null);
  const [skill, setSkill] = useState(0);

  const { sessionId } = useSessionContext();

  const currentStep = STEPS[sessionId ? STEPS.length - 1 : stepIndex];

  // Typing is enabled once we're in the "active" phase
  const { displayedText, isTyping } = useTypewriter(currentStep.text, 15, {
    enabled: phase === "active",
  });

  /* ── Phase transitions ─────────────────────────────── */

  // Phase transitions
  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 600;
    const delay = isMobile ? 0 : SPEECH_GIF_DURATION_MS;

    if (phase === "entering") {
      const timer = setTimeout(
        () => setPhase("active"),
        delay,
      );
      return () => clearTimeout(timer);
    }
    if (phase === "exiting") {
      const timer = setTimeout(() => {
        onComplete?.({
          agreed_to_consent: consent ?? true, // Assume true if returning
          education_level: "",
          academic_background: "",
          data_viz_skill: skill,
        });
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete, consent, skill]);

  /* ── Handlers ───────────────────────────────────────── */

  const advance = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));

  const handleConsent = (agreed: boolean) => {
    setConsent(agreed);
    if (agreed) advance();
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
    if (isTyping || phase !== "active" || displayedText !== currentStep.text)
      return null;

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
            <button
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={advance}
            >
              Skip
            </button>
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
                style={
                  {
                    "--char-sprite": `url(${CharacterSprite})`,
                  } as React.CSSProperties
                }
              />
              <div className={styles.speechWrapper}>
                <div
                  className={`${styles.speechBox} ${styles.isActive}`}
                  style={
                    {
                      "--speech-sprite": `url(${SpeechSprite})`,
                    } as React.CSSProperties
                  }
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
              style={
                {
                  "--char-sprite": `url(${characterSrc})`,
                } as React.CSSProperties
              }
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
                style={
                  {
                    "--speech-sprite": `url(${SpeechSprite})`,
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

      {/* Preload images to prevent blinking on first talk */}
      <div style={{ display: "none" }}>
        <img src={CharacterSprite} alt="" />
        <img src={CharacterSpriteTalking} alt="" />
      </div>
    </div>
  );
}

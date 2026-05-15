import React, { useEffect, useState } from "react";
import HomeScreen from "./components/HomeScreen.jsx";
import RingingScreen from "./components/RingingScreen.jsx";
import CallScreen from "./components/CallScreen.jsx";
import FeedbackScreen from "./components/FeedbackScreen.jsx";
import AdminScreen from "./components/AdminScreen.jsx";
import {
  speechRecognitionSupported,
} from "./hooks/useSpeechRecognition.js";
import {
  speechSynthesisSupported,
  primeSpeechSynthesis,
} from "./hooks/useSpeechSynthesis.js";
import { primeAudio } from "./lib/sound.js";

const STAGES = {
  HOME: "home",
  RINGING: "ringing",
  CALL: "call",
  FEEDBACK: "feedback",
};

async function ensureMicPermission() {
  if (!navigator.mediaDevices?.getUserMedia) return true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

function useIsAdminRoute() {
  const [isAdmin, setIsAdmin] = useState(() =>
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/admin")
  );
  useEffect(() => {
    const onPop = () =>
      setIsAdmin(window.location.pathname.startsWith("/admin"));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return isAdmin;
}

export default function App() {
  const isAdmin = useIsAdminRoute();

  const [stage, setStage] = useState(STAGES.HOME);
  const [scenario, setScenario] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [permissionError, setPermissionError] = useState(null);

  const sttOk = speechRecognitionSupported;
  const ttsOk = speechSynthesisSupported;
  const supportWarning = !sttOk
    ? "Your browser doesn't support voice recognition. Use Chrome, Edge, or Safari."
    : !ttsOk
      ? "Your browser doesn't support speech playback."
      : permissionError;

  const handlePick = async (s) => {
    // CRITICAL for iOS Safari: unlock both audio context and speech
    // synthesis from inside this direct user-gesture handler, before
    // any async work. Otherwise no sound will play later.
    primeAudio();
    primeSpeechSynthesis();

    const granted = await ensureMicPermission();
    if (!granted) {
      setPermissionError(
        "Microphone access is required. Please allow mic access and try again."
      );
      return;
    }
    setPermissionError(null);
    setScenario(s);
    setTranscript([]);
    setStage(STAGES.RINGING);
  };

  const handleConnected = () => setStage(STAGES.CALL);
  const handleCancel = () => {
    setScenario(null);
    setStage(STAGES.HOME);
  };

  const handleCallEnd = (messages) => {
    setTranscript(messages);
    setStage(STAGES.FEEDBACK);
  };

  const handleRestart = () => {
    setScenario(null);
    setTranscript([]);
    setStage(STAGES.HOME);
  };

  if (isAdmin) {
    return <AdminScreen />;
  }

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100">
      {stage === STAGES.HOME && (
        <HomeScreen onPick={handlePick} supportWarning={supportWarning} />
      )}
      {stage === STAGES.RINGING && scenario && (
        <RingingScreen
          scenario={scenario}
          onConnected={handleConnected}
          onCancel={handleCancel}
        />
      )}
      {stage === STAGES.CALL && scenario && (
        <CallScreen scenario={scenario} onEnd={handleCallEnd} />
      )}
      {stage === STAGES.FEEDBACK && scenario && (
        <FeedbackScreen
          scenario={scenario}
          messages={transcript}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}

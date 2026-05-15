export async function dispatcherReply({ scenarioId, messages, dispatcher }) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId, messages, dispatcher }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Dispatcher request failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function fetchFeedback({ scenarioId, messages, sessionId }) {
  const res = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId, messages, sessionId }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Feedback request failed (${res.status}): ${body}`);
  }
  return res.json();
}

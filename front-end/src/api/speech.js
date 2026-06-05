// speech.js
export async function sendSpeechAudio(audioBlob) {
  const formData = new FormData();
  formData.append('file', audioBlob, 'speech.webm');
  formData.append('debug', 'true');
  const res = await fetch('/api/v1/speech/predict', {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });
  return await res.json();
}

export async function getSpeechPlot(audioBlob) {
  const formData = new FormData();
  formData.append('file', audioBlob, 'speech.webm');
  formData.append('debug', 'true');
  const res = await fetch('/api/v1/speech/predict_plot', {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });
  return await res.blob();
}

export async function saveSpeechResult(data) {
  const res = await fetch('/api/v1/speech/save_result', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  return await res.json();
}

export async function predictSpeech(formData) {
  try {
    formData.append('debug', 'true');
  } catch {
    // ignore if not FormData
  }
  const res = await fetch('/api/v1/speech/predict', {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });
  if (!res.ok) throw new Error('API Error');
  return await res.json();
}
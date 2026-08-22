"""
Kidstory story-narration TTS service.

Runs Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice on Hugging Face's free ZeroGPU pool
(shared GPU, quota-limited per account). Not meant for live/interactive use —
Kidstory calls this once per story (at publish time or via a backfill job)
and caches the result, so per-story latency isn't critical.

Auth: this Space itself is public, but Kidstory's server calls it with the
owner's own Hugging Face token (via the Gradio client's `token` option) so
usage draws from the owner's free daily ZeroGPU quota (5 min/day) instead of
the very small shared anonymous quota (2 min/day).
"""

import re

import gradio as gr
import numpy as np
import soundfile as sf
import spaces
import torch
from qwen_tts import Qwen3TTSModel

MODEL_ID = "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice"

# Warm, gentle narration suited to a kids' story blog. The model card's
# example speaker ("Vivian") reads Chinese-oriented — check the model's
# documented speaker list once this is running and swap in a better English
# voice here if one is available.
DEFAULT_SPEAKER = "Vivian"
DEFAULT_INSTRUCT = (
    "Warm, gentle, expressive storytelling voice for young children. "
    "Calm, unhurried pace, friendly tone."
)
SILENCE_GAP_SECONDS = 0.35
SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")

print(f"Loading {MODEL_ID}...")
# Placed on 'cuda' at module level (not lazily inside the @spaces.GPU
# function) per ZeroGPU's documented pattern — a CUDA emulation layer makes
# this work even though a real GPU is only attached during @spaces.GPU calls.
model = Qwen3TTSModel.from_pretrained(MODEL_ID, device_map="cuda:0", dtype=torch.bfloat16)
print("Model loaded.")


def split_into_chunks(text: str, max_chars: int = 300) -> list[str]:
    sentences = [s.strip() for s in SENTENCE_SPLIT_RE.split(text.strip()) if s.strip()]
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        candidate = f"{current} {sentence}".strip()
        if current and len(candidate) > max_chars:
            chunks.append(current)
            current = sentence
        else:
            current = candidate
    if current:
        chunks.append(current)
    return chunks or [text.strip()]


@spaces.GPU(duration=120)
def narrate(text: str, instruct: str = ""):
    text = (text or "").strip()
    if not text:
        raise gr.Error("`text` is required.")
    instruct = (instruct or "").strip() or DEFAULT_INSTRUCT

    chunks = split_into_chunks(text)
    sample_rate: int | None = None
    segments: list[np.ndarray] = []

    for chunk in chunks:
        wavs, sr = model.generate_custom_voice(
            text=chunk,
            language="English",
            speaker=DEFAULT_SPEAKER,
            instruct=instruct,
        )
        sample_rate = sr
        segment = wavs[0] if isinstance(wavs, (list, tuple)) else wavs
        segments.append(np.asarray(segment, dtype=np.float32))

    if sample_rate is None or not segments:
        raise gr.Error("TTS model returned no audio.")

    silence = np.zeros(int(SILENCE_GAP_SECONDS * sample_rate), dtype=np.float32)
    parts: list[np.ndarray] = []
    for i, segment in enumerate(segments):
        parts.append(segment)
        if i < len(segments) - 1:
            parts.append(silence)
    combined = np.concatenate(parts)

    # gr.Audio outputs accept a (sample_rate, numpy_array) tuple directly.
    return (sample_rate, combined)


with gr.Blocks() as demo:
    text_input = gr.Text(label="text")
    instruct_input = gr.Text(label="instruct", value="")
    audio_output = gr.Audio(label="narration", type="numpy")
    generate_btn = gr.Button("Generate")
    generate_btn.click(fn=narrate, inputs=[text_input, instruct_input], outputs=audio_output, api_name="generate")

demo.queue()
demo.launch()

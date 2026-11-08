import speech_recognition as sr
import os

r = sr.Recognizer()
wavs = [
    'remotion-video/public/voiceover/raw/intro_3.wav',
    'remotion-video/public/voiceover/raw/conclusion_1.wav',
    'temp_pronounce/cope_standard.wav',
    'temp_pronounce/cope_kohp.wav',
    'temp_pronounce/cope_kopeh.wav',
    'temp_pronounce/cope_copay.wav',
    'temp_pronounce/cope_cop.wav',
]

for p in wavs:
    if os.path.exists(p):
        try:
            with sr.AudioFile(p) as src:
                audio = r.record(src)
            text = r.recognize_google(audio)
            print(f"{p} -> '{text}'")
        except Exception as e:
            print(f"{p} -> Error: {e}")

import urllib.request, json, os, speech_recognition as sr

cases = [
    ('intro_kopeh', "We are researchers from Bee-col University. I'm Kirby Ko-peh, alongside Arnel Ha-pin..."),
    ('intro_standard', "We are researchers from Bee-col University. I'm Kirby Cope, alongside Arnel Ha-pin..."),
    ('outro_kopeh', "From Kirby Ko-peh, Arnel Ha-pin, and James Neb-ree-ya of Bee-col University, thank you for watching."),
    ('outro_standard', "From Kirby Cope, Arnel Ha-pin, and James Neb-ree-ya of Bee-col University, thank you for watching.")
]

r = sr.Recognizer()
for name, text in cases:
    payload = {'model': 'omnivoice', 'input': text, 'voice': 'be77634a', 'response_format': 'wav', 'speed': 1.03}
    req = urllib.request.Request('http://127.0.0.1:3900/v1/audio/speech', data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        data = resp.read()
    p = f'temp_pronounce/{name}.wav'
    with open(p, 'wb') as f:
        f.write(data)
    with sr.AudioFile(p) as src:
        aud = r.record(src)
    tr = r.recognize_google(aud)
    print(f'{name} -> "{tr}"')

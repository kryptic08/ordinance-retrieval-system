import urllib.request, json, os, speech_recognition as sr

cases = [
    ('kopeh_comma', "We are researchers from Bee-col University. I'm Kirby Ko-peh, alongside Arnel Ha-pin..."),
    ('cope_period', "We are researchers from Bee-col University. I'm Kirby Cope. Alongside Arnel Ha-pin..."),
    ('kopeh_period', "We are researchers from Bee-col University. I'm Kirby Ko-peh. Alongside Arnel Ha-pin..."),
    ('iam_cope', "We are researchers from Bee-col University. I am Kirby Cope, alongside Arnel Ha-pin..."),
    ('iam_kopeh', "We are researchers from Bee-col University. I am Kirby Ko-peh, alongside Arnel Ha-pin..."),
    ('kohpe_comma', "We are researchers from Bee-col University. I'm Kirby Koh-pe, alongside Arnel Ha-pin..."),
    ('kohp_comma', "We are researchers from Bee-col University. I'm Kirby Kohp, alongside Arnel Ha-pin..."),
]

os.makedirs('temp_intro', exist_ok=True)
r = sr.Recognizer()

for name, text in cases:
    payload = {'model': 'omnivoice', 'input': text, 'voice': 'be77634a', 'response_format': 'wav', 'speed': 1.03}
    req = urllib.request.Request('http://127.0.0.1:3900/v1/audio/speech', data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        data = resp.read()
    p = f'temp_intro/{name}.wav'
    with open(p, 'wb') as f:
        f.write(data)
    with sr.AudioFile(p) as src:
        aud = r.record(src)
    try:
        tr = r.recognize_google(aud)
        print(f'{name} -> "{tr}"')
    except Exception as e:
        print(f'{name} -> error: {e}')

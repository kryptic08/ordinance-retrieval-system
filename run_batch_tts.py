import os, sys, json, time, base64, subprocess

out_dir = "remotion-video/public/audio"
os.makedirs(out_dir, exist_ok=True)

with open("remotion-video/public/vo_manifest.json", "r", encoding="utf-8") as f:
    manifest = json.load(f)

# Launch VoiceStudio mcp_shim subprocess
proc = subprocess.Popen(
    ["C:\\Users\\coped\\AppData\\Roaming\\VoiceStudio\\runtime\\project\\.venv\\Scripts\\python.exe", "-m", "backend.mcp_shim"],
    cwd="C:\\Users\\coped\\AppData\\Local\\Programs\\VoiceStudio\\resources",
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

init_req = {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "ordisearch-generator", "version": "1.0"}}}
proc.stdin.write(json.dumps(init_req) + "\n")
proc.stdin.flush()
proc.stdout.readline()

req_id = 10
total_items = sum(len(cues) for cues in manifest.values())
idx = 0

print(f"Generating {total_items} speech cues with voice profile 'Me' (RTX 2050 CUDA)...")
start_all = time.time()

for scene_key, cues in manifest.items():
    print(f"\n--- Scene: {scene_key} ({len(cues)} cues) ---")
    for cue in cues:
        idx += 1
        file_name = cue["file"]
        target_path = os.path.join(out_dir, file_name)
        text = cue["text"]
        
        req_id += 1
        gen_req = {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": "tools/call",
            "params": {
                "name": "generate_speech",
                "arguments": {
                    "text": text,
                    "profile_id": "be77634a",
                    "steps": 16,
                    "speed": 1.05
                }
            }
        }
        t0 = time.time()
        proc.stdin.write(json.dumps(gen_req) + "\n")
        proc.stdin.flush()
        line = proc.stdout.readline()
        resp = json.loads(line)
        dt = time.time() - t0
        
        if resp.get("error"):
            print(f"[{idx}/{total_items}] ERROR {file_name}: {resp['error']}")
            continue
            
        content = resp["result"]["content"][0]["text"]
        data = json.loads(content)
        wav_b64 = data.get("wav_base64")
        dur = data.get("audio_duration_s", 0)
        
        if wav_b64:
            raw = base64.b64decode(wav_b64)
            with open(target_path, "wb") as wf:
                wf.write(raw)
            print(f"[{idx}/{total_items}] Generated {file_name} ({dur:.1f}s) in {dt:.1f}s -> {target_path}")
        else:
            print(f"[{idx}/{total_items}] No wav_base64 in response for {file_name}")

proc.terminate()
total_time = time.time() - start_all
print(f"\nALL DONE! Generated all voiceover clips in {total_time:.1f}s.")

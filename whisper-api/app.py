# whisper-api/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import os
import tempfile

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 加载模型 (这步会比较慢，只在启动时执行一次)
print("正在加载Whisper模型...")
model = whisper.load_model("base")  # 使用基础模型，可以根据需要改为 small, medium, large
print("模型加载完毕！")

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files['audio']
    
    # 检查文件是否为空
    if audio_file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    # 创建临时文件保存音频
    temp_path = None
    try:
        # 创建临时文件
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            temp_path = temp_file.name
            audio_file.save(temp_path)
        
        # 使用Whisper进行转录
        print(f"正在转录音频文件: {temp_path}")
        result = model.transcribe(temp_path)
        transcription = result['text'].strip()
        
        # 删除临时文件
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        
        print(f"转录结果: {transcription}")
        return jsonify({"result": transcription})
        
    except Exception as e:
        # 确保即使出错也删除临时文件
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass  # 忽略删除文件时的错误
        print(f"转录错误: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "Whisper API is running"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)


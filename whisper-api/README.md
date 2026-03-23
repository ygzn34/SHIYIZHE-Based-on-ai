# Whisper API 服务

这是一个使用 OpenAI Whisper 模型进行语音转文字的 Flask API 服务。

## 安装依赖

```bash
# 创建虚拟环境（推荐）
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

## 运行服务

```bash
python app.py
```

服务将在 `http://localhost:5001` 上运行。

## API 端点

### POST /transcribe
上传音频文件进行转录。

**请求格式：**
- Content-Type: multipart/form-data
- 字段名: `audio` (文件)

**响应格式：**
```json
{
  "result": "转录的文字内容"
}
```

### GET /health
健康检查端点。

**响应格式：**
```json
{
  "status": "ok",
  "message": "Whisper API is running"
}
```

## 注意事项

1. 首次运行时会自动下载 Whisper 模型（base 模型约 150MB）
2. 模型加载需要一些时间，请耐心等待
3. 如果系统有 NVIDIA GPU，可以安装 CUDA 版本的 PyTorch 以加速转录
4. 建议使用 `base` 或 `small` 模型以获得速度和精度的平衡


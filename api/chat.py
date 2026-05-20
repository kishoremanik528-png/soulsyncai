from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os

app = Flask(__name__)
CORS(app)

# Gemini API Key from environment variable
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

# Gemini model
model = genai.GenerativeModel("gemini-1.5-flash")

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.json
    user_message = data["message"]
    user_name = data.get("name", "friend")

    prompt = f"""
    You are SoulSyncAI, a caring emotional AI companion.
    The user's name is {user_name}.

    Rules:
    - ALWAYS reply in the SAME LANGUAGE the user writes in.
    - If the user writes in English, you MUST reply in English.
    - If the user writes in Tamil/Tanglish, reply in Tamil/Tanglish.
    - If the user writes in Telugu/Tenglish, reply in Telugu/Tenglish.
    - Talk warmly like a close best friend.
    - Support users emotionally and check in on their well-being.
    - Analyze the user's mood and respond accordingly.
    - Keep replies short (2-3 sentences max), natural and conversational.
    - Sound human, caring and friendly. Use emojis naturally.
    - Address the user by their name sometimes.

    User Message:
    {user_message}
    """

    response = model.generate_content(prompt)

    return jsonify({
        "reply": response.text
    })

from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai

# Flask app create
app = Flask(__name__)
CORS(app)

import os

# Gemini API Key
genai.configure(api_key=os.environ.get("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY"))

# Gemini model
model = genai.GenerativeModel("gemini-1.5-flash")

# Chat route
@app.route("/api/chat", methods=["POST"])
def chat():
    # Make sure API key is configured
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or api_key == "YOUR_GEMINI_API_KEY":
        return jsonify({
            "reply": "I'm here for you, but the local GEMINI_API_KEY is not configured yet. 💜 Please set the GEMINI_API_KEY environment variable in server.py or your environment to unlock my full brain! 🧠"
        }), 200

    try:
        # Receive frontend message
        data = request.json
        user_message = data["message"]
        user_name = data.get("name", "friend")

        # Dynamically configure key
        genai.configure(api_key=api_key)

        # SoulSyncAI personality prompt
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

        # Gemini response
        response = model.generate_content(prompt)

        # Send reply back
        if response and response.text:
            return jsonify({
                "reply": response.text
            })
        else:
            return jsonify({
                "reply": "I received your message, but I'm having a hard time formulating a response. Can you try again? 💛"
            })

    except Exception as e:
        return jsonify({
            "reply": f"Oops! I had a little trouble thinking just now (Gemini API error: {str(e)}). Could you please try again or check your API key setup? 🥺"
        }), 200

# Run server
if __name__ == "__main__":
    app.run(debug=True)
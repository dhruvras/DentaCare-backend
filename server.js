import express from "express";
import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// ------------------------------------------------------------------
// 🔐 ENV CHECK
// ------------------------------------------------------------------
const token = process.env.GITHUB_TOKEN;

if (!token) {
  console.error("❌ Missing GITHUB_TOKEN in .env");
  process.exit(1);
}

const endpoint = "https://models.github.ai/inference/chat/completions";
const modelName = "openai/gpt-4o";

// ------------------------------------------------------------------
// 🚀 APP SETUP
// ------------------------------------------------------------------
const app = express();
app.use(express.json({ limit: "10mb" }));

// ------------------------------------------------------------------
// 📁 FOLDER SETUP
// ------------------------------------------------------------------
const UPLOAD_FOLDER = "./uploads";

if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
}

// ------------------------------------------------------------------
// 🧠 IMAGE ANALYSIS FUNCTION (FIXED - using axios only)
// ------------------------------------------------------------------
const analyzeTeethImage = async (imageBuffer) => {
  try {
    const base64Image = imageBuffer.toString("base64");

    const response = await axios.post(
      endpoint,
      {
        model: modelName,
        messages: [
          {
            role: "system",
            content: `You are a dental AI.

Return ONLY:
"probability, disease, seriousness"

Example:
"0.7, cavity, medium"`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this teeth image." },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 100
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content.trim();

  } catch (error) {
    console.error("❌ analyzeTeethImage error:", error.response?.data || error.message);
    throw new Error("Image analysis failed");
  }
};

// ------------------------------------------------------------------
// 🦷 IMAGE PREDICTION ROUTE
// ------------------------------------------------------------------
app.post("/predict", async (req, res) => {
  try {
    let image_base64 = req.body.image;

    if (!image_base64) {
      return res.status(400).json({ error: "No image provided" });
    }

    if (image_base64.includes(",")) {
      image_base64 = image_base64.split(",")[1];
    }

    const imageBuffer = Buffer.from(image_base64, "base64");

    const fileName = `${Date.now()}_input.jpg`;
    const inputPath = path.join(UPLOAD_FOLDER, fileName);

    fs.writeFileSync(inputPath, imageBuffer);

    const result = await analyzeTeethImage(imageBuffer);

    return res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("❌ /predict error:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ------------------------------------------------------------------
// 💬 CHAT ROUTE (FIXED)
// ------------------------------------------------------------------
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await axios.post(
      endpoint,
      {
        model: modelName,
        messages: [
          {
            role: "system",
            content: `You are a professional AI dentist.

Give simple, helpful advice.
If serious → suggest visiting a dentist.

Always add:
"This is not a medical diagnosis. Please consult a dentist."`
          },
          {
            role: "user",
            content: message
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.json(response.data);

  } catch (err) {
    console.error("❌ /chat error:", err.response?.data || err.message);

    return res.status(500).json({
      error: err.response?.data || err.message
    });
  }
});

// ------------------------------------------------------------------
// 🧠 SMART DENTIST (FIXED 🔥)
// ------------------------------------------------------------------
app.post("/smart-dentist", async (req, res) => {
  try {
    const { message, image } = req.body;

    let analysisResult = null;

    if (image) {
      let img = image;

      if (img.includes(",")) {
        img = img.split(",")[1];
      }

      const buffer = Buffer.from(img, "base64");
      analysisResult = await analyzeTeethImage(buffer);
    }

    const finalPrompt = `
User message: ${message || "No message"}

Image result: ${analysisResult || "No image"}

Explain:
- Problem
- Severity
- What to do
`;

    const response = await axios.post(
      endpoint, // ✅ FIXED HERE
      {
        model: modelName,
        messages: [
          { role: "system", content: "You are an AI dentist assistant." },
          { role: "user", content: finalPrompt }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.json({
      success: true,
      analysis: analysisResult,
      reply: response.data.choices[0].message.content
    });

  } catch (error) {
    console.error("❌ /smart-dentist error:", error.response?.data || error.message);

    return res.status(500).json({
      error: error.message
    });
  }
});

// ------------------------------------------------------------------
// 🚀 START SERVER
// ------------------------------------------------------------------
app.listen(4000, () => {
  console.log("🚀 Server running on: http://localhost:4000/");
});
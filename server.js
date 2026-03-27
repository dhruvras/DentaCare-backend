import express from "express";
import fs from "fs";
import path from "path";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import dotenv from "dotenv";
dotenv.config();
const token = process.env.GITHUB_TOKEN;
const endpoint = "https://models.github.ai/inference";
const modelName = "openai/gpt-4o"; 

const app = express();
app.use(express.json({ limit: "10mb" }));

// Folders
const UPLOAD_FOLDER = "./uploads";


// Ensure folders exist
if (!fs.existsSync(UPLOAD_FOLDER)) fs.mkdirSync(UPLOAD_FOLDER);


// ⚠️ Replace this with your actual model
let model = async (imageBuffer) => {
  if (!token) {
    throw new Error("GitHub token is missing. Check your .env file.");
  }

  const base64Image = imageBuffer.toString("base64");

  const client = ModelClient(
    endpoint,
    new AzureKeyCredential(token),
  );

  const response = await client.path("/chat/completions").post({
    body: {
      model: modelName,
      messages: [
        {
          role: "system",
          content: `
You are a dental AI.

Return ONLY:
"probability, disease, seriousness"

Example:
"0.7, cavity, medium"
          `
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this teeth image."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}` // ✅ FIXED
              }
            }
          ]
        }
      ],
      max_tokens: 100
    }
  });

  if (isUnexpected(response)) {
    console.log("Full error response:", response);
    throw new Error(JSON.stringify(response.body, null, 2));
  }

  const result = response.body.choices[0].message.content.trim();
  return result
};

// ------------------------------------------------------------------
// 🦷 Prediction Endpoint (BASE64 → BASE64)
// ------------------------------------------------------------------
app.post("/predict", async (req, res) => {
  try {
    if (!model) {
      return res.status(500).json({ error: "Model not loaded" });
    }

    let image_base64 = req.body.image;

    if (!image_base64) {
      return res.status(400).json({ error: "No image provided" });
    }

    // Strip base64 header
    if (image_base64.includes(",")) {
      image_base64 = image_base64.split(",")[1];
    }

    // Decode base64 → buffer
    const imageBuffer = Buffer.from(image_base64, "base64");

    // ------------------------------------------------------------------
    // 💾 Save input image
    // ------------------------------------------------------------------
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:.]/g, "")
      .slice(0, 15);

    const inputPath = path.join(
      UPLOAD_FOLDER,
      `${timestamp}_input.jpg`
    );

    fs.writeFileSync(inputPath, imageBuffer);

    // ------------------------------------------------------------------
    // 🤖 Model inference (async)
    // ------------------------------------------------------------------
    const outputBuffer = await model(imageBuffer);

    


    return res.status(200).json({
      success: true,
      message: "Prediction successful",
      data:outputBuffer,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Start server
app.listen(4000, () => {
  console.log("🚀 Server running on: http://localhost:4000/");
});
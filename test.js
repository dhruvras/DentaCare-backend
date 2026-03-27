import fs from "fs";

// Change this to your image path
const IMAGE_PATH = "./input.jpg";

// Change this to your backend URL
const API_URL = "http://localhost:4000/predict";

const testAPI = async () => {
  try {
    const imageBuffer = fs.readFileSync(IMAGE_PATH);
    const base64 = imageBuffer.toString("base64");

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: `data:image/jpeg;base64,${base64}`,
      }),
    });

    const data = await response.json();

    console.log("✅ Response:");
    console.log(data);

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
};

testAPI();
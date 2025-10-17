import path from "path";
import fs from 'fs';
import * as canvasModule from "canvas";
import * as faceapi from "face-api.js";

const { Canvas, Image, ImageData } = canvasModule;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

class Face {
  constructor(modelsPath) {
    const defaultModelsPath = path.resolve('./models');
    this.modelsPath = modelsPath || defaultModelsPath;
    this._loaded = false;
  }

  async loadModels() {
    if (this._loaded) return;
    
    if (!fs.existsSync(this.modelsPath)) {
      throw new Error(`Model directory not found at ${this.modelsPath}. Place face-api models there.`);
    }

    await faceapi.nets.tinyFaceDetector.loadFromDisk(this.modelsPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(this.modelsPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(this.modelsPath);

    this._loaded = true;
  }

  bufferToImage(buffer) {
    return canvasModule.loadImage(buffer);
  }

  async getDescriptor(buffer) {
    await this.loadModels();
    const img = await this.bufferToImage(buffer);
    const detections = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detections) return null;
    return detections.descriptor;
  }

  static euclideanDistance(d1, d2) {
    let sum = 0;
    for (let i = 0; i < d1.length; i++) {
      const diff = d1[i] - d2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  async compareImages(bufA, bufB, threshold = 0.6) {
    const descA = await this.getDescriptor(bufA);
    const descB = await this.getDescriptor(bufB);
    if (!descA || !descB)
      return { match: false, distance: null, reason: "face_not_detected" };
    const distance = Face.euclideanDistance(descA, descB);
    const match = distance <= threshold;
    return { match, distance };
  }
}

const faceInstance = new Face();

export async function compareFaces(idCardPath, selfiePath) {
  try {
    const idCardBuffer = fs.readFileSync(idCardPath);
    const selfieBuffer = fs.readFileSync(selfiePath);
    
    const result = await faceInstance.compareImages(idCardBuffer, selfieBuffer);
    
    const similarity = result.distance ? Math.max(0, 1 - result.distance) : null;
    
    return {
      facesMatch: result.match,
      similarity: similarity,
      details: {
        distance: result.distance,
        reason: result.reason || 'success',
        idDetected: result.reason !== 'face_not_detected' || result.distance !== null,
        selfieDetected: result.reason !== 'face_not_detected' || result.distance !== null
      }
    };
  } catch (error) {
    console.error('Face comparison error:', error);
    return {
      facesMatch: false,
      similarity: null,
      details: { error: error.message }
    };
  }
}

export default Face;
